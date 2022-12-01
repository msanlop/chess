import * as http from 'http'
import express from 'express'
import test from 'node:test';
import { escape } from 'querystring';
import {Server} from 'socket.io'
import { idText } from 'typescript';
import { BOARD_SIZE, Coordinate, coordinateToAlgebraic, GameState, getAllowedMovesForPieceAtCoordinate, getUpdateTimers, move, startingGameState } from './Chess/Chess';
import { GameInstance, initAndReturnSocket } from './sockets';
import path from 'path';
import crypto from 'crypto'
import bodyParser from 'body-parser'

const PORT = 8080
const GAME_RESTART_TIME = 10000

const app = express();
const server = http.createServer(app);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : false}));


export const playerGameInstances: Map<string, string> = new Map() //TODO: allow for many game instances
export const gameInstances : Map<string, GameInstance> = new Map()
const socket = initAndReturnSocket(server)

const generateRandomPlayerId = () => {
    const TOKEN_LENGTH = 20
    let randString;
    do {
        randString = crypto.randomBytes(TOKEN_LENGTH).toString('hex')
    } while (playerGameInstances.has(randString));
    return randString
}

const generateRandomGameId = () => {
    const TOKEN_LENGTH = 10
    let randString;
    do {
        randString = crypto.randomBytes(TOKEN_LENGTH).toString('hex')
    } while (gameInstances.has(randString));
    return randString
}

const serverLog = (...content) => console.log((new Date).toISOString() + " - " + content.join(''))

app.get('/', (req, res) => {
    res.sendFile("index.html", {root: "./out/public"})
    // res.sendFile(path.join(__dirname, "public/index.html"))
});

app.post('/create-game', (req, res) => {
    serverLog("create body is")
    const token = generateRandomPlayerId()
    const gameId = generateRandomPlayerId()
    res.json({token: token, gameId:gameId})
})

app.post('/join-game', (req, res) => {
    // serverLog("body is ", req.body, " ya heard")
    console.log(req.body);
    const gameId = req.body.gameId
    console.log(gameInstances);
    if(!gameId || !gameInstances.has(gameId)){
        res.send("Invalid game id.")
        res.end()
        return
    }

    const token = generateRandomPlayerId()
    const instance = gameInstances.get(gameId)!
    
    if(!instance.wId){
        instance.wId = token
    } else if(!instance.bId) {
        instance.bId = token
    } else {
        res.send("Game is already full, try starting a new one.")
        res.end()
        return
    }


    res.json({token: token})
})

app.use(express.static(path.join(process.cwd(), 'out', 'public'))) //TODO: redo path if change for production

server.listen(PORT, () => {
  console.log('listening on *:' + PORT);
});
