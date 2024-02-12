import { Server } from "socket.io";
import { randomBytes } from "crypto";
import {
  BOARD_SIZE,
  coordinateToAlgebraic,
  GameState,
  getAllowedMovesForPieceAtCoordinate,
  getUpdateTimers,
  Move,
  move,
  startingGameState,
} from "./Chess/Chess";
import { parse } from "cookie";

const GAME_RESTART_TIME = 10000;
const STALE_GAMEINSTANCE_INTERVAL = 18000000; //5h

type Token = string;

export interface GameInstance {
  id: string;
  //socket ids of connected clients, a single connection per side is allowed
  wToken?: Token;
  bToken?: Token;
  wId?: string;
  bId?: string;
  gameStates: GameState[];
  gameIsStarted: boolean;
  timerTimeoutId?: NodeJS.Timeout;
  lastUpdate: number;
}

interface ServerGameState extends GameState {
  move: Move;
}

export const defaultGameInstance = (): GameInstance => {
  return JSON.parse(
    JSON.stringify({
      wToken: undefined,
      bToken: undefined,
      wId: undefined,
      bId: undefined,
      gameStates: [{ ...startingGameState }], //CHECK
      gameIsStarted: false,
      id: "0",
      lastUpdate: -1,
    })
  );
};

export enum OperationResult {
  OK,
  InvalidGameId,
  GameFull,
}

// const TEST_W_TOKEN = "tokenw";
// const TEST_B_TOKEN = "tokenb";
// let testGameInstance: GameInstance = {
//   ...defaultGameInstance(),
//   id: "123",
//   wToken: TEST_W_TOKEN,
// };
// gameInstances.set(testGameInstance.id, testGameInstance);
// playerGameInstances.set(TEST_W_TOKEN, testGameInstance.id); change this if using

// playerGameInstances.set(TEST_B_TOKEN, testGameInstance.id);

interface GameEvent {
  gameInstanceId: string;
  type: string;
  content?: string;
  player?: string;
  token?: string;
}

export class ChessGameServer {
  private static instance: ChessGameServer | undefined = undefined;
  private io: Server;
  //tokenId -> gameId
  private readonly playerGameInstances: Map<string, Array<string>> = new Map();
  //gameId -> gameInstance
  private readonly gameInstances: Map<string, GameInstance> = new Map();

  socketServerLog = (instanceId: string, content: string) => {
    const msg = new Date().toISOString() + " -- " + instanceId + ": " + content;
    console.log(msg);
  };

  socketServerError = (instanceId: string, content: string) => {
    const msg =
      new Date().toISOString() + " -- ERROR -- " + instanceId + ": " + content;
    console.error(msg);
  };

  logAndEmit = (event: GameEvent) => {
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
        serverString += `${event.token} connected as ${event.player}`;
        clientString += `${event.player} has connected`;
        break;
      case "gameStart":
        serverString += "Both players connected, starting game.";
        clientString += "Both players connected, starting game.";
        break;
      case "disconnect":
        serverString += `${event.token} disconnected (${event.player})`;
        clientString += `${event.player} has disconnected`;
        break;
      case "move":
        serverString += `${event.token} ${event.content}`;
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
      this.socketServerLog(event.gameInstanceId, serverString);
    }
    if (clientString.length !== 0) {
      this.io
        .to(event.gameInstanceId)
        .emit(event.type === "chat" ? "newChat" : "newInfo", clientString);
    }
  };

  getLastGameState = (gameInstance: GameInstance) =>
    gameInstance.gameStates[gameInstance.gameStates.length - 1];

  private constructor(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });
    this.setuUpSocketServer();
    console.log("Socket server up and running !");
    this.socketServerLog("GAME INSTANCE", "LOG CONTENT");

    //check for leak
    setInterval(() => {
      //no way to filter on map values??
      for (const entry of this.gameInstances) {
        const gameId = entry[0];
        const instance = entry[1];
        const delta = Date.now() - instance.lastUpdate;
        if (delta > STALE_GAMEINSTANCE_INTERVAL) {
          this.terminateGameInstance(instance);
          //this is safe, apparently
          this.gameInstances.delete(gameId);
          this.socketServerError(
            gameId,
            `WAS NOT CLEARED IN 
            ${delta / 1000} MINUTES OF INACTIVITY!!`
          );
        }
      }
    }, STALE_GAMEINSTANCE_INTERVAL);
  }

  restartGameInstance = (id: string) => {
    const instance = this.gameInstances.get(id);
    if (!instance) {
      //TODO: or delete instance instead of restart?
      this.socketServerError(
        id,
        "COULD NOT TERMINATE INSTANCE " + id + " DOES NOT EXIST"
      );
      return;
    }

    //do not restart if game if no update for a a while
    const AFK_THRESHOLD = 60000; // 1 min
    if (Date.now() - instance.lastUpdate > AFK_THRESHOLD) {
      this.logAndEmit({
        gameInstanceId: instance.id,
        type: "server-info",
        content: "A player is inactive.",
      });
      this.terminateGameInstance(instance);
      return;
    }

    let endMessage = "Game over : ";
    const endState = this.getLastGameState(instance);
    if (endState.stalemate) {
      endMessage += "There was a draw!";
    } else {
      const winner = endState.turn === "w" ? "black" : "white";
      endMessage += "the winner is " + winner + "!";
    }
    this.logAndEmit({
      gameInstanceId: id,
      type: "end",
      player: undefined,
      token: undefined,
      content: endMessage,
    });
    this.io.to(id).emit("gameOver");
    //terminate session in 10s
    setTimeout(() => {
      this.logAndEmit({
        gameInstanceId: id,
        type: "restart",
        player: undefined,
        token: undefined,
      });
      instance.gameIsStarted = false; //avoid quick reconnect issues but keeps ids
      this.disconnectOldSocketIfExisting(instance.wId);
      this.disconnectOldSocketIfExisting(instance.bId);
      const restatedInstance: GameInstance = {
        ...defaultGameInstance(),
        wToken: instance.wToken,
        id: instance.id,
        lastUpdate: Date.now(),
        timerTimeoutId: this.createGameStartTimeout(instance.id),
      };

      this.gameInstances.set(instance.id, restatedInstance);
    }, GAME_RESTART_TIME);
  };

  disconnectOldSocketIfExisting = (socketId?: string) => {
    if (socketId && this.io.sockets.sockets.has(socketId)) {
      this.io.sockets.sockets.get(socketId)!.disconnect();
    }
  };

  //game must already be in gameInstances
  createGameStartTimeout = (gameId) => {
    const UNSTARTED_GAME_CLEAR_TIME = 600000; // 5min
    const gameInstance = this.gameInstances.get(gameId);
    if (!gameInstance) return;

    return setTimeout(() => {
      this.logAndEmit({
        gameInstanceId: gameId,
        type: "server-info",
        content: "Game never started. Closing down...",
      });
      this.terminateGameInstance(gameInstance);
    }, UNSTARTED_GAME_CLEAR_TIME);
  };

  /**
   * Handles a socket connection by assigning color, assigning the socket to the socket room of the game
   * and starting the game for both players or sending the latest state to the player if reconnecting
   *
   *
   */
  handleSocketConnection = (socket, token, gameId) => {
    const gameInstance = this.gameInstances.get(gameId);
    if (!gameInstance) {
      return;
    }
    if (!token) return;
    const joinRes = this.joinGame(token, gameId);
    if (joinRes !== OperationResult.OK)
      this.socketServerError(gameId, token + " could not join new game");

    const col = gameInstance.wToken === token ? "w" : "b";
    const color = col === "w" ? "white" : "black";
    //keep only latest connection alive
    if (col === "w") {
      const socketId = gameInstance.wId;
      this.disconnectOldSocketIfExisting(socketId);
      gameInstance.wId = socket.id;
    } else {
      const socketId = gameInstance.bId;
      this.disconnectOldSocketIfExisting(socketId);
      gameInstance.bId = socket.id;
    }

    socket.join(gameInstance.id.toString());

    socket.emit("color", col);
    this.logAndEmit({
      gameInstanceId: gameInstance.id,
      type: "connect",
      player: color,
      token: token,
    });

    if (!gameInstance.gameIsStarted && gameInstance.bId && gameInstance.wId) {
      this.logAndEmit({
        gameInstanceId: gameInstance.id,
        type: "gameStart",
        player: undefined,
        token: undefined,
      });
      clearTimeout(gameInstance.timerTimeoutId);
      gameInstance.gameIsStarted = true;
      gameInstance.lastUpdate = Date.now();
      const state = this.getLastGameState(gameInstance);
      state.wLastMoveTime = Date.now();
      this.io.to(gameInstance.id).emit("gameInit", state);
    } else if (gameInstance.gameIsStarted) {
      this.logAndEmit({
        gameInstanceId: gameInstance.id,
        type: "reconnect",
        player: color,
        token: token,
      });
      //TODO: send whole history, maybe sequence of moves and reconstruct on client
      //or compact serialized gamestate like before
      const timerUpdatedState = this.getLastGameState(gameInstance);
      this.io.to(socket.id).emit("gameInit", {
        ...timerUpdatedState,
        ...getUpdateTimers(timerUpdatedState),
        lastUpdate: Date.now(),
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
   *
   */
  setuUpSocketServer = () => {
    this.io.on("connection", (socket) => {
      const socketId = socket.id;
      const cookies = socket.handshake.headers.cookie;
      if (!cookies) {
        this.logAndEmit({
          gameInstanceId: "",
          type: "server-info",
          content: "There has been an error. No token sent. ",
        });
        socket.disconnect();
        return;
      }
      const token: string = parse(cookies)["token"] || "";
      const gameId = socket.handshake.query.gameId as string;
      const gameInstance = this.gameInstances.get(gameId);

      if (!gameInstance) {
        this.logAndEmit({
          gameInstanceId: socketId,
          type: "server-info",
          player: undefined,
          token: token,
          content: "Could not find game. Please try creating a new one.",
        });
        socket.disconnect();
        return;
      }

      this.handleSocketConnection(socket, token, gameId);
      const color = gameInstance?.wToken === token ? "white" : "black";

      socket.on("disconnect", () => {
        this.logAndEmit({
          gameInstanceId: gameInstance.id,
          type: "disconnect",
          player: color,
          token: token,
        });
        if (gameInstance.bId === socketId) {
          gameInstance.bId = undefined;
        }
        if (gameInstance.wId === socketId) {
          gameInstance.wId = undefined;
        }
        gameInstance.lastUpdate = Date.now();
      });

      socket.on("chatMessage", (input: string) => {
        const escapedString = input;
        gameInstance.lastUpdate = Date.now();
        this.logAndEmit({
          gameInstanceId: gameInstance.id,
          type: "chat",
          player: color,
          token: socketId,
          content: color + ": " + escapedString,
        });
      });

      socket.on("move", ({ from, to }: Move, callback) => {
        const lastState = this.getLastGameState(gameInstance);
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

        this.logAndEmit({
          gameInstanceId: gameInstance.id,
          type: "move",
          player: color,
          token: socketId,
          content:
            color +
            " moved from " +
            coordinateToAlgebraic(from) +
            " to " +
            coordinateToAlgebraic(to),
        });
        const newState: ServerGameState = {
          ...move({ from, to }, this.getLastGameState(gameInstance)),
          move: { from, to },
        };
        gameInstance.gameStates[0] = newState;
        gameInstance.lastUpdate = Date.now();
        if (newState.finished) {
          this.io.to(gameInstance.id.toString()).emit("newState", newState);
          this.restartGameInstance(gameInstance.id);
        } else {
          clearTimeout(gameInstance.timerTimeoutId);
          const newTimeout = setTimeout(() => {
            this.restartGameInstance(gameInstance.id);
          }, newState[newState.turn + "TimeLeft"]);
          gameInstance.timerTimeoutId = newTimeout;
          this.io
            .to(gameInstance.id.toString())
            .emit("newState", { ...newState, board: [] });
        }
        callback({ status: "ok" });
      });

      if (!gameInstance.gameIsStarted) {
        this.logAndEmit({
          gameInstanceId: gameInstance.id,
          type: "server-info",
          player: color,
          token: socketId,
          content: `To join the game use id : ${gameInstance.id} or share the page's url.`,
        });
      }
    });
  };

  terminateGameInstance = (gameInstance: GameInstance) => {
    this.logAndEmit({
      gameInstanceId: gameInstance.id,
      type: "server-info",
      player: undefined,
      token: undefined,
      content: `Game's closed! Please create or join a new game.`,
    });
    this.socketServerLog(gameInstance.id, "terminating instance");
    clearTimeout(gameInstance.timerTimeoutId);
    if (gameInstance.bId) {
      this.io.sockets.sockets.get(gameInstance.bId)!.disconnect();
    }
    if (gameInstance.wId) {
      this.io.sockets.sockets.get(gameInstance.wId)!.disconnect();
    }
    this.playerGameInstances.delete(
      gameInstance.bToken ? gameInstance.bToken : ""
    );
    this.playerGameInstances.delete(
      gameInstance.wToken ? gameInstance.wToken : ""
    );
    this.gameInstances.delete(gameInstance.id);
  };

  generateRandomPlayerId = () => {
    const TOKEN_LENGTH = 4;
    let randString;
    do {
      randString = randomBytes(TOKEN_LENGTH).toString("base64url");
    } while (this.playerGameInstances.has(randString));
    return randString;
  };

  generateRandomGameId = () => {
    const TOKEN_LENGTH = 4;
    let randString;
    do {
      randString = randomBytes(TOKEN_LENGTH).toString("base64url");
    } while (this.gameInstances.has(randString));
    return randString;
  };

  currentGames = (playerId: Token): string[] => {
    return this.playerCurrentGames(playerId) || [];
  };

  canJoin = (playerId, gameId: GameInstance["id"]): OperationResult => {
    const instance = this.gameInstances.get(gameId);

    if (this.currentGames(playerId).includes(gameId)) return OperationResult.OK;
    if (!instance) return OperationResult.InvalidGameId;
    if (instance.bToken && instance.wToken) return OperationResult.GameFull;
    return OperationResult.OK;
  };

  //Put player in the game if not already in it.
  //Returns error if the gameid is invalid or the game is full
  joinGame = (playerId: Token, gameId: GameInstance["id"]): OperationResult => {
    const joinStatus = this.canJoin(playerId, gameId);
    if (joinStatus !== OperationResult.OK) return joinStatus;

    const playerInstances = this.playerGameInstances.get(playerId) || [];
    if (playerInstances.includes(gameId)) {
      return OperationResult.OK;
    }

    const instance = this.gameInstances.get(gameId)!;
    if (instance.wToken || instance.bToken) {
      if (instance.wToken) {
        instance.bToken = playerId;
      } else {
        instance.wToken = playerId;
      }
    } else {
      //no players have joined yet
      if (Math.round(Math.random())) instance.wToken = playerId;
      else instance.bToken = playerId;
    }

    this.playerGameInstances.set(playerId, [...playerInstances, gameId]);
    return OperationResult.OK;
  };

  createGame = (timerVal: number): GameInstance["id"] => {
    const newGameId = this.generateRandomGameId();

    const timerMs = timerVal * 60 * 1000;
    const instance = { ...defaultGameInstance() };
    // instance.gameStates[0].bTimeLeft = timerMs;
    // instance.gameStates[0].wTimeLeft = timerMs;
    //TODO: is referencing even worth?
    const newGameinstance = {
      ...instance,
      id: newGameId,
      lastUpdate: Date.now(),
    };
    this.gameInstances.set(newGameId, newGameinstance);
    newGameinstance.timerTimeoutId = this.createGameStartTimeout(newGameId);

    return newGameId;
  };

  playerCurrentGames = (playerId) => this.playerGameInstances.get(playerId);

  public static getChessServer = (httpServer) => {
    if (!ChessGameServer.instance)
      ChessGameServer.instance = new ChessGameServer(httpServer);
    return ChessGameServer.instance;
  };
}
