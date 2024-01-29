import * as http from "http";
import * as express from "express";
import test from "node:test";
import { escape } from "querystring";
import { Server } from "socket.io";
import { idText } from "typescript";
import {
  BOARD_SIZE,
  Coordinate,
  coordinateToAlgebraic,
  GameState,
  getAllowedMovesForPieceAtCoordinate,
  getUpdateTimers,
  move,
  startingGameState,
} from "./Chess/Chess";
import { gameInstances, playerGameInstances } from ".";

const GAME_RESTART_TIME = 10000;

export interface GameInstance {
  id: string;
  //socket ids of connected clients, a single connection per side is allowed
  wToken?: string;
  bToken?: string;
  wId?: string;
  bId?: string;
  gameStates: GameState[];
  gameIsStarted: boolean;
  timerTimeoutId?: NodeJS.Timeout;
  lastUpdate: number;
}

export const defaultGameInstance = (): GameInstance => {
  return JSON.parse(
    JSON.stringify({
      wToken: undefined,
      bToken: undefined,
      wId: undefined,
      bId: undefined,
      gameStates: [startingGameState], //TODO: make deep copy just incase
      gameIsStarted: false,
      id: "0",
      lastUpdate: -1,
    })
  );
};

export const getLastGameState = (gameInstance: GameInstance) =>
  gameInstance.gameStates[gameInstance.gameStates.length - 1];

export const initSocket = (server) => {
  const TEST_W_TOKEN = "tokenw";
  const TEST_B_TOKEN = "tokenb";
  let testGameInstance: GameInstance = {
    ...defaultGameInstance(),
    id: "123",
    wToken: TEST_W_TOKEN,
  };
  gameInstances.set(testGameInstance.id, testGameInstance);
  playerGameInstances.set(TEST_W_TOKEN, testGameInstance.id);
  playerGameInstances.set(TEST_B_TOKEN, testGameInstance.id);

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const ID_LOG_LENGTH = 5;
  const padId = (id: string) => {
    if (padId.length === 5) {
      return id;
    }
    return " ".concat(id);
  };
  const socketServerLog = (instanceId: string, content: string) =>
    console.log(
      new Date().toISOString() + " -- " + padId(instanceId),
      ": " + content
    );

  interface GameEvent {
    gameInstanceId: string;
    type: string;
    content?: string;
    player: string;
    socketId: string;
  }

  const logAndEmit = (event: GameEvent) => {
    let serverString = "";
    let clientString = "";

    switch (event.type) {
      case "chat":
        serverString += event.content;
        clientString += event.content;
        break;
      case "reconnect":
        serverString += `has reconnected as ${event.player}`;
        clientString += event.player + " has reconnected";
        break;
      case "connect":
        serverString += `${event.socketId} connected as ${event.player}`;
        clientString += `${event.player} has connected`;
        break;
      case "gameStart":
        serverString += "Both players connected, starting game.";
        clientString += "Both players connected, starting game.";
        break;
      case "disconnect":
        serverString += `${event.socketId} disconnected (${event.player})`;
        clientString += `${event.player} has disconnected`;
        break;
      case "move":
        serverString += `${event.socketId} ${event.content}`;
        clientString += event.content;
        break;
      case "end":
        serverString += event.content;
        clientString += event.content;
        break;
      case "restart":
        serverString += "restarting game";
        clientString = serverString;
        break;
      case "server-info":
        serverString += event.content;
        clientString += event.content;
        break;
      default:
        break;
    }

    if (event.type !== "server-info") {
      socketServerLog(event.gameInstanceId, serverString);
    }
    if (clientString.length !== 0) {
      io.to(event.gameInstanceId).emit(
        event.type === "chat" ? "newChat" : "newInfo",
        clientString
      );
    }
  };

  const BASE_URL = "localhost:8080";
  const JOIN_URL = (id) => BASE_URL + "/join-game?gameId=" + id;

  const getGameInstanceOfPlayer = (token: string): GameInstance | undefined => {
    const instaceId = playerGameInstances.get(token);
    if (!instaceId) {
      socketServerLog(
        "XX",
        "ERROR : PLAYER " + token + " NOT ASSIGNED TO A GAME"
      );
      return;
    }
    const gameInstance = gameInstances.get(instaceId);
    if (!gameInstance) {
      socketServerLog(
        instaceId,
        "ERROR : GAMEINSTANCE " + instaceId + " NOT DEFINED"
      );
      return;
    }
    return gameInstance;
  };

  const restartGameInstance = (id: string) => {
    const instance = gameInstances.get(id);
    if (!instance) {
      //TODO: or delete instance instead of restart?
      socketServerLog(
        id,
        "CANNOT TERMINATE INSTANCE " + id + " DOES NOT EXIST"
      );
      return;
    }

    //do not restart if game if no update for a a while
    const AFK_THRESHOLD = 60000; // 1 min
    if (performance.now() - instance.lastUpdate > AFK_THRESHOLD) {
      gameInstances.delete(instance.id);
      terminateGameInstance(instance, io);
      return;
    }

    let endMessage = "Game over : ";
    const endState = getLastGameState(instance);
    if (endState.stalemate) {
      endMessage += "There was a draw!";
    } else {
      const winner = endState.turn === "w" ? "black" : "white";
      endMessage += "the winner is " + winner + "!";
    }
    logAndEmit({
      gameInstanceId: id,
      type: "end",
      player: "",
      socketId: "",
      content: endMessage,
    });
    io.to(id).emit("gameOver");
    //terminate session in 10s
    setTimeout(() => {
      logAndEmit({
        gameInstanceId: id,
        type: "restart",
        player: "",
        socketId: "",
      });
      instance.gameIsStarted = false; //avoid quick reconnect issues but keeps ids
      disconnectOldSocketIfExisting(instance.wId);
      disconnectOldSocketIfExisting(instance.bId);
      const restatedInstance = {
        ...defaultGameInstance(),
        wToken: instance.wToken,
        id: instance.id,
        lastUpdate: performance.now(),
      };
      gameInstances.set(instance.id, restatedInstance);
    }, GAME_RESTART_TIME);
  };

  const disconnectOldSocketIfExisting = (socketId?: string) => {
    if (socketId && io.sockets.sockets.has(socketId)) {
      io.sockets.sockets.get(socketId)!.disconnect();
    }
  };

  /**
   * Handles a socket connection by assigning color, assigning the socket to the socket room of the game
   * and starting the game for both players or sending the latest state to the player if reconnecting
   *
   *
   */
  const handleSocketConnection = (socket, token) => {
    const gameInstance = getGameInstanceOfPlayer(token);
    if (!gameInstance) {
      return;
    }
    const col = gameInstance?.wToken === token ? "w" : "b";
    const color = col === "w" ? "white" : "black";

    //keep only latest connection alive
    if (col === "w") {
      const socketId = gameInstance.wId;
      disconnectOldSocketIfExisting(socketId);
      gameInstance.wId = socket.id;
    } else {
      const socketId = gameInstance.bId;
      disconnectOldSocketIfExisting(socketId);
      gameInstance.bId = socket.id;
    }

    socket.join(gameInstance.id.toString());

    socket.emit("color", col);
    logAndEmit({
      gameInstanceId: gameInstance.id,
      type: "connect",
      player: color,
      socketId: socket.id,
    });

    if (!gameInstance.gameIsStarted && gameInstance.bId && gameInstance.wId) {
      logAndEmit({
        gameInstanceId: gameInstance.id,
        type: "gameStart",
        player: "",
        socketId: "",
      });
      gameInstance.gameIsStarted = true;
      gameInstance.lastUpdate = performance.now();
      const state = getLastGameState(gameInstance);
      state.wLastMoveTime = performance.now();
      io.to(gameInstance.id).emit("gameInit", state);
    } else if (gameInstance.gameIsStarted) {
      logAndEmit({
        gameInstanceId: gameInstance.id,
        type: "reconnect",
        player: color,
        socketId: socket.id,
      });
      //TODO: send whole history, maybe sequence of moves and reconstruct on client
      //or compact serialized gamestate like before
      const timerUpdatedState = getLastGameState(gameInstance);
      io.to(socket.id).emit("gameInit", {
        ...timerUpdatedState,
        ...getUpdateTimers(timerUpdatedState),
        lastUpdate: performance.now(),
      });
    }
  };

  /**
   * The event of a game are:
   *,
   * connection - disconnection
   *
   * //TODO: redundant? logging tho...
   * gameInit : sent by the server with the starting game state object to signify the start of the game
   * or to send the current state to a client that reconnects
   *
   * color : sent by server with to a client to inform them of their piece color
   *
   * move : sent by client when a move is made, servers returns {status:ok} if the move is allowed and processed
   *        return {status:"Move not allowed"} if the move is illegal
   *
   * newState : sent by the server with the latest game state to the clients connected
   *
   * gameOver : sent by the server to indicate the end of the game and that the session will be closed soon
   *
   * TODO: alert about multiple connections
   *
   */
  io.on("connection", (socket) => {
    //TODO: authenticate requests
    const socketId = socket.id;
    const token: string = socket.handshake.query.token as string;
    const gameInstance = getGameInstanceOfPlayer(token);

    if (!gameInstance) {
      logAndEmit({
        gameInstanceId: "NONE",
        type: "server-info",
        player: "",
        socketId: socketId,
        content: "Could not find game. Please try creating a new one.",
      });
      socket.disconnect();
      return;
    }

    handleSocketConnection(socket, token);
    const color = gameInstance?.wToken === token ? "white" : "black";

    socket.on("disconnect", () => {
      logAndEmit({
        gameInstanceId: gameInstance.id,
        type: "disconnect",
        player: color,
        socketId: socketId,
      });
      if (gameInstance.bId === socketId) {
        gameInstance.bId = undefined;
      }
      if (gameInstance.wId === socketId) {
        gameInstance.wId = undefined;
      }
      gameInstance.lastUpdate = performance.now();
    });

    socket.on("chatMessage", (input: string) => {
      const escapedString = input;
      gameInstance.lastUpdate = performance.now();
      logAndEmit({
        gameInstanceId: gameInstance.id,
        type: "chat",
        player: color,
        socketId: socketId,
        content: color + ": " + escapedString,
      });
    });

    socket.on("move", (from: Coordinate, to: Coordinate, callback) => {
      const lastState = getLastGameState(gameInstance);
      const expectedSocket = gameInstance[lastState.turn + "Id"];
      if (expectedSocket !== socketId) {
        callback({ status: "Not your turn" });
        return;
      }
      if (
        !getAllowedMovesForPieceAtCoordinate(from, lastState)[
          to.x + BOARD_SIZE * to.y
        ]
      ) {
        callback({ status: "Move not allowed" });
        return;
      }

      logAndEmit({
        gameInstanceId: gameInstance.id,
        type: "move",
        player: color,
        socketId: socketId,
        content:
          color +
          " moved from " +
          coordinateToAlgebraic(from) +
          " to " +
          coordinateToAlgebraic(to),
      });
      const newState = move(from, to, getLastGameState(gameInstance));
      gameInstance.gameStates.push(newState);
      gameInstance.lastUpdate = performance.now();
      if (newState.finished) {
        io.to(gameInstance.id.toString()).emit("newState", newState);
        restartGameInstance(gameInstance.id);
      } else {
        clearTimeout(gameInstance.timerTimeoutId);
        const newTimeroutId = setTimeout(() => {
          restartGameInstance(gameInstance.id);
        }, newState[newState.turn + "TimeLeft"]);
        gameInstance.timerTimeoutId = newTimeroutId;
        io.to(gameInstance.id.toString()).emit("newState", newState);
      }
      callback({ status: "ok" });
    });

    if (!gameInstance.gameIsStarted) {
      logAndEmit({
        gameInstanceId: gameInstance.id,
        type: "server-info",
        player: color,
        socketId: socketId,
        // content: "Use " + JOIN_URL(gameInstance.id) + " to join the game."
        content: "Use id : " + gameInstance.id + " to join the game.",
      });
    }
  });

  return io;
};

export const terminateGameInstance = (
  gameInstance: GameInstance,
  io: Server
) => {
  clearTimeout(gameInstance.timerTimeoutId);
  if (gameInstance.bId) {
    io.sockets.sockets.get(gameInstance.bId)!.disconnect();
  }
  if (gameInstance.wId) {
    io.sockets.sockets.get(gameInstance.wId)!.disconnect();
  }
  playerGameInstances.delete(gameInstance.bToken ? gameInstance.bToken : "");
  playerGameInstances.delete(gameInstance.wToken ? gameInstance.wToken : "");
};
