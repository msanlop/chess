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
  ChessGameServer,
  OperationResult,
} from "./ChessGameServer";
import path from "path";
import crypto from "crypto";
import bodyParser from "body-parser";
import { router } from "websocket";
import cookieParser from "cookie-parser";

const PORT = 8080;

const app = express();
const server = http.createServer(app);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());

const TOKEN_MAX_AGE = 21600000;

// const socketServer = initSocket(server);
const chessServer = ChessGameServer.getChessServer(server);

const canJoin = (req, res, next) => {
  let token = req.cookies.token || "";
  const gameId = req.params.gameId;
  // const joinRes = chessServer.joinGame(token, gameId);
  const canJoin = chessServer.canJoin(token, gameId);
  switch (canJoin) {
    case OperationResult.GameFull:
      res.status(401).write("Game is already full, try starting a new one.");
      res.end();
      break;
    case OperationResult.InvalidGameId:
      res.status(400).write("Invalid game id.");
      res.end();
      break;
    case OperationResult.OK:
      next();
      break;
  }
};

const serverLog = (...content: string[]) =>
  console.log(new Date().toISOString() + " - " + content.join(""));

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "./out/public" });
});

app.get("/get-current-games", (req, res) => {
  const token = req.cookies.token;
  let gameIdArray: Array<string> = [];

  let games;
  if (token) {
    games = chessServer.currentGames(token);
  } else {
    games = [];
  }
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.json({ gameIds: gameIdArray });
});

app.get("/play/:gameId", joinGame, (req, res) => {
  res.sendFile("game.html", { root: "./out/public" });
});

//TODO: prevent spam
app.post("/create-game", (req, res) => {
  const token = req.cookies.token || chessServer.generateRandomPlayerId();
  const gameId = chessServer.createGame(token);

  res.redirect("/play/" + gameId);
});

app.post("/join-game/:gameId", canJoin, (req, res) => {
  const gameId = req.params.gameId as string;
  res.redirect("/play/" + gameId);
});

app.post("/:gameId/token", (req, res) => {
  const token = req.cookies.token || chessServer.generateRandomPlayerId();
  const joinRes = chessServer.joinGame(token, req.params.gameId);
  if (joinRes === OperationResult.OK) {
    res.cookie("token", token).status(200);
    res.end();
  } else {
    res.status(400).send("Could not join game");
  }
});

app.get("/play/:gameId", canJoin, (req, res) => {
  res.sendFile("game.html", { root: "./out/public" });
});

app.use(express.static(path.resolve("./out/public"), { maxAge: 3600000 }));

server.listen(PORT, () => {
  console.log("listening on port " + PORT);
});
