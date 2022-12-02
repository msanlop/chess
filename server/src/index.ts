import * as http from 'http'
import express from 'express'
import test from 'node:test';
import { escape } from 'querystring';
import {Server} from 'socket.io'
import { idText } from 'typescript';
import { BOARD_SIZE, Coordinate, coordinateToAlgebraic, GameState, getAllowedMovesForPieceAtCoordinate, getUpdateTimers, move, startingGameState } from './Chess/Chess';
import { defaultGameInstance, GameInstance, initAndReturnSocket } from './sockets';
import path from 'path';
import crypto from 'crypto'
import bodyParser from 'body-parser'
import { router } from 'websocket';

const PORT = 8080
const GAME_RESTART_TIME = 10000

const app = express();
const server = http.createServer(app);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());


export const playerGameInstances: Map<string, string> = new Map() //TODO: allow for many game instances
export const gameInstances : Map<string, GameInstance> = new Map()
const socket = initAndReturnSocket(server)

const generateRandomPlayerId = () => {
    const TOKEN_LENGTH = 15
    let randString;
    do {
        randString = crypto.randomBytes(TOKEN_LENGTH).toString('hex')
    } while (playerGameInstances.has(randString));
    return randString
}

const generateRandomGameId = () => {
    const TOKEN_LENGTH = 6
    let randString;
    do {
        randString = crypto.randomBytes(TOKEN_LENGTH).toString('hex')
    } while (gameInstances.has(randString));
    return randString
}

const validUserId = (req, res, next) => {
    const gameInstance = playerGameInstances.get(req.query.token)
    if(!gameInstance){
        serverLog(req.query.token, " tried play but had invalid token")
        res.write('You are not in any ongoing game.')
        res.end()
    } else {
        next()
    }
}

const serverLog = (...content : string[]) => console.log((new Date).toISOString() + " - " + content.join(''))

app.get('/', (req, res) => {
    res.sendFile("index.html", {root: "./out/public"})
});

app.get('/play', validUserId, (req, res) => {
    res.sendFile("game.html", {root: "./out/public"})
});

app.post('/create-game', (req, res) => {
    const token = generateRandomPlayerId()
    const gameId = generateRandomPlayerId()
    serverLog(token, ": created new game")
    //TODO: allow for starting black also
    gameInstances.set(gameId, {...defaultGameInstance(), id:gameId, wToken:token, wId:token})
    playerGameInstances.set(token, gameId)
    res.json({token: token, gameId:gameId})
})

app.get('/join-game', (req, res) => {
    const gameId = req.query.gameId as string
    if(!gameId || !gameInstances.has(gameId)){
        res.send("Invalid game id.")
        res.end()
        return
    }

    const token = generateRandomPlayerId()
    const instance = gameInstances.get(gameId)!
    playerGameInstances.set(token, gameId)
    
    if(!instance.wToken){
        instance.wToken = token
    } else if(!instance.bToken) {
        instance.bToken = token
    } else {
        res.write("Game is already full, try starting a new one.")
        res.end()
    }


    serverLog(token, ": join game ", gameId)
    res.json({token: token})
})

app.use(express.static(path.join(process.cwd(), 'out', 'public'))) //TODO: redo path if change for production

server.listen(PORT, () => {
  console.log('listening on *:' + PORT);
});
