import * as http from "http";
import express from "express";
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
import {
  defaultGameInstance,
  GameInstance,
  initSocket,
  terminateGameInstance,
  getLastGameState,
} from "./sockets";
import path from "path";
import crypto from "crypto";
import bodyParser from "body-parser";
import { router } from "websocket";
import cookieParser from "cookie-parser";

const PORT = 8080;
const GAMEINSTANCE_CLEAN_INTERVAL = 18000000; //5h

const app = express();
const server = http.createServer(app);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());

//tokenId -> gameId
export const playerGameInstances: Map<string, Array<string>> = new Map(); //TODO: allow for many game instances
//gameId -> gameInstance
export const gameInstances: Map<string, GameInstance> = new Map();
const socketServer = initSocket(server);

setInterval(() => {
  const instances = gameInstances;
  //no way to filter on map values??
  for (const entry of gameInstances) {
    const gameId = entry[0];
    const instance = entry[1];
    if (Date.now() - instance.lastUpdate > GAMEINSTANCE_CLEAN_INTERVAL) {
      terminateGameInstance(instance, socketServer);
      //this is safe, apparently
      gameInstances.delete(gameId);
    }
  }
}, GAMEINSTANCE_CLEAN_INTERVAL);

const generateRandomPlayerId = () => {
  const TOKEN_LENGTH = 4;
  let randString;
  do {
    randString = crypto.randomBytes(TOKEN_LENGTH).toString("hex");
  } while (playerGameInstances.has(randString));
  return randString;
};

const generateRandomGameId = () => {
  const TOKEN_LENGTH = 4;
  let randString;
  do {
    randString = crypto.randomBytes(TOKEN_LENGTH).toString("hex");
  } while (gameInstances.has(randString));
  return randString;
};

const validUserId = (req, res, next) => {
  const token = req.cookies.token;
  const gameInstance = playerGameInstances.get(token);
  // const gameInstance = playerGameInstances.get(req.cookies);
  if (!gameInstance || gameInstance.length == 0) {
    serverLog(token, " tried play but had invalid token");
    res.write("You are not in any ongoing game.");
    res.end();
  } else {
    next();
  }
};

const validGameId = (req, res, next) => {
  const token = req.cookies.token;
  const gameInstances = playerGameInstances.get(token);
  const gameId = req.params.gameId;
  // const gameInstance = playerGameInstances.get(req.cookies);
  //TODO: add to game if the gameInstance has not started
  if (!gameInstances || !gameInstances.includes(gameId)) {
    serverLog(token, " tried to join invalid game");
    res.status(401).send("You are not in this game");
    res.end();
  } else {
    next();
  }
};

const serverLog = (...content: string[]) =>
  console.log(new Date().toISOString() + " - " + content.join(""));

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "./out/public" });
});

app.get("/get-current-games", (req, res) => {
  const token = req.cookies.token;
  const gameIds: Array<string> = [];

  if (token) {
    if (playerGameInstances.has(token)) {
      gameIds.push(...playerGameInstances.get(token)!);
    }
  }
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.json({ gameIds: gameIds });
});

app.get("/play/:gameId", validUserId, validGameId, (req, res) => {
  res.sendFile("game.html", { root: "./out/public" });
});

//TODO: prevent spam
app.post("/create-game", (req, res) => {
  const token = req.cookies.token
    ? req.cookies.token
    : generateRandomPlayerId();
  const gameId = generateRandomGameId();
  serverLog(token, ": created new game");

  let bToken;
  let wToken;
  if (Math.round(Math.random())) wToken = token;
  else bToken = token;

  const newGameinstance = {
    ...defaultGameInstance(),
    id: gameId,
    wToken: wToken,
    bToken: bToken,
    lastUpdate: Date.now(),
  };
  const UNSTARTED_GAME_CLEAR_TIME = 300000; // 5min
  const unstartedGameClearTimeout = setTimeout(() => {
    terminateGameInstance(newGameinstance, socketServer);
  }, UNSTARTED_GAME_CLEAR_TIME);
  gameInstances.set(gameId, newGameinstance);
  const currentPlayerGames = playerGameInstances.get(token) || [];
  playerGameInstances.set(token, [...currentPlayerGames, gameId]);
  res.cookie("token", token, { maxAge: 43200000 }).redirect("/play/" + gameId);
  // .json({ token: token, gameId: gameId });
});

app.post("/join-game/:gameId", (req, res) => {
  const gameId = req.params.gameId as string;
  if (!gameId || !gameInstances.has(gameId)) {
    res.send("Invalid game id.");
    res.end();
    return;
  }

  const instance = gameInstances.get(gameId)!;
  const token = req.cookies.token || generateRandomPlayerId();

  //TODO: reformat to something not dumb
  if (!instance.wToken || instance.wToken === token) {
    instance.wToken = token;
  } else if (!instance.bToken || instance.bToken === token) {
    instance.bToken = token;
  } else {
    res.write("Game is already full, try starting a new one.");
    res.end();
  }
  const currentPlayerGames = playerGameInstances.get(token) || [];
  playerGameInstances.set(token, [...currentPlayerGames, gameId]);

  serverLog(token, ": join game ", gameId);
  res.cookie("token", token, { maxAge: 43200000 }).redirect("/play/" + gameId);
});

app.use(express.static(path.resolve("./public"), { maxAge: 3600000 }));

server.listen(PORT, () => {
  console.log("listening on localhost:" + PORT);
});
