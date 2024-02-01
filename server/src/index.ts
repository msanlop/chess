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

const joinGame = (req, res, next) => {
  let token = req.cookies.token;
  if (!token) {
    token = chessServer.generateRandomPlayerId();
  }
  res.cookie("token", token, { maxAge: TOKEN_MAX_AGE });
  const gameId = req.params.gameId;
  const joinRes = chessServer.joinGame(token, gameId);
  switch (joinRes) {
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

  if (token) {
    const games = chessServer.playerCurrentGames(token) || [];
    gameIdArray = games;
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

  res.cookie("token", token, { maxAge: 43200000 }).redirect("/play/" + gameId);
});

app.post("/join-game/:gameId", joinGame, (req, res) => {
  const gameId = req.params.gameId as string;
  res.redirect("/play/" + gameId);
});

app.use(express.static(path.resolve("./out/public"), { maxAge: 3600000 }));

server.listen(PORT, () => {
  console.log("listening on port " + PORT);
});
