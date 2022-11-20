import * as http from 'http'
import test from 'node:test';
import {Server} from 'socket.io'
import { idText } from 'typescript';
import { BOARD_SIZE, Coordinate, GameState, getAllowedMovesForPieceAtCoordinate, getUpdateTimers, move, startingGameState } from './Chess/Chess';

const PORT = 8080
const GAME_RESTART_TIME = 10000

interface GameInstance {
  id: string;
  //socket ids of connected clients, a single connection per side is allowed
  wToken?: string;
  wId?: string;
  bId?: string;
  gameStates : GameState[];
  gameIsStarted:boolean;
  timerTimeoutId ?: NodeJS.Timeout;
}


const defaultGameInstance = () : GameInstance => {
  return JSON.parse(JSON.stringify(
    {
      wToken : undefined,
      wId: undefined,
      bId:undefined,
      gameStates: [startingGameState], //TODO: make deep copy just incase
      gameIsStarted:false,
      id: "0"
    }
    ))
}

const getLastGameState = (gameInstance : GameInstance) => gameInstance.gameStates[gameInstance.gameStates.length - 1]

const playerGameInstances: Map<string, string> = new Map() //TODO: allow for many game instances
const gameInstances : Map<string, GameInstance> = new Map()

const TEST_W_TOKEN = "tokenw"
const TEST_B_TOKEN = "tokenb"
let testGameInstance : GameInstance = {...defaultGameInstance(), id:"123", wToken:TEST_W_TOKEN}
gameInstances.set(testGameInstance.id, testGameInstance)
playerGameInstances.set(TEST_W_TOKEN, testGameInstance.id)
playerGameInstances.set(TEST_B_TOKEN, testGameInstance.id)


const server = http.createServer((req, res) => {
    console.log(new Date(), '- received request for ', req.url)
    res.writeHead(404)
    res.end()
})

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});


const ID_LOG_LENGTH = 5
const padId = (id:string) => {
  if(padId.length === 5){return id}
  return " ".concat(id)
}
const serverLog = (instanceId:string, content:string) => console.log((new Date).toISOString() + " -- " + padId(instanceId), ": " + content)

const logAndEmit = (instanceId : string, content : string) => {
  io.to(instanceId).emit("info", content)
  serverLog(instanceId, content)
}


const getGameInstanceOfPlayer = (token: string) : (GameInstance | undefined) => {
  const instaceId = playerGameInstances.get(token)
  if(!instaceId){
    serverLog("XX", "ERROR : PLAYER " + token + " NOT ASSIGNED TO A GAME");
    return;
  }
  const gameInstance = gameInstances.get(instaceId)
  if(!gameInstance){
    serverLog(instaceId, "ERROR : GAMEINSTANCE " + instaceId + " NOT DEFINED");
    return;
  }
  return gameInstance;
}

const terminateGameInstance = (id : string) => {
  const instance = gameInstances.get(id)
  if(!instance){ //TODO: or delete instance instead of restart?
    serverLog(id, "CANNOT TERMINATE INSTANCE " + id + " DOES NOT EXIST");
    return;
  }
  logAndEmit(id, "game over")
  io.to(id).emit("gameOver")
  //terminate session in 10s
  setTimeout(() => {
    logAndEmit(id, "restarting instance")
    instance.gameIsStarted = false //avoid quick reconnect issues but keeps ids
    disconnectOldSocketIfExisting(instance.wId)
    disconnectOldSocketIfExisting(instance.bId)
    const restatedInstance = {...defaultGameInstance(), wToken:instance.wToken, id:instance.id}
    gameInstances.set(instance.id, restatedInstance)
  }, GAME_RESTART_TIME)
}


const disconnectOldSocketIfExisting = (socketId ?: string) => {
  if(socketId && io.sockets.sockets.has(socketId)){
    io.sockets.sockets.get(socketId)!.disconnect();
  }
}

/**
 * Handles a socket connection by assigning color, assigning the socket to the socket room of the game
 * and starting the game for both players or sending the latest state to the player if reconnecting
 * 
 * 
 */
const handleSocketConnection = (socket, token) => {
  let col = token.endsWith('w') ? 'w' : 'b';
  const gameInstance = getGameInstanceOfPlayer(token)
  if(!gameInstance){return;}

  //keep only latest connection alive
  if(col === 'w'){
    const socketId = gameInstance.wId
    disconnectOldSocketIfExisting(socketId)
    gameInstance.wId = socket.id
  } else {
    const socketId = gameInstance.bId
    disconnectOldSocketIfExisting(socketId)
    gameInstance.bId = socket.id
  }

  socket.join(gameInstance.id.toString())


  socket.emit('color', col)
  logAndEmit(gameInstance.id, socket.id + 'connected as player : ' + col);

  if(!gameInstance.gameIsStarted && gameInstance.bId && gameInstance.wId){
    logAndEmit(gameInstance.id, "both players connected, starting game");
    gameInstance.gameIsStarted = true
    const state = getLastGameState(gameInstance)
    state.wLastMoveTime = performance.now()
    io.to(gameInstance.id).emit('gameInit', state)
  } else if (gameInstance.gameIsStarted){
    logAndEmit(gameInstance.id, "player " + socket.id + " reconnected, sending game state");
    //TODO: send whole history, maybe sequence of moves and reconstruct on client
    //or compact serialized gamestate like before
    const timerUpdatedState = getLastGameState(gameInstance)
    io.to(gameInstance.id).emit("gameInit", {...timerUpdatedState, ...getUpdateTimers(timerUpdatedState)})
  }
}

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
io.on('connection', (socket) => {
  //TODO: authenticate requests
  const socketId = socket.id
  const token : string = socket.handshake.query.token as string
  
  const gameInstance = getGameInstanceOfPlayer(token)
  if(!gameInstance){
    socket.disconnect()
    return;  
  }

  socket.on('disconnect', () => {
    logAndEmit(gameInstance.id, socketId +' disconnected');
    if(gameInstance.bId === socketId){
      gameInstance.bId = undefined
    }
    if(gameInstance.wId === socketId){
      gameInstance.wId = undefined
    }
  })

  socket.on('move', (from : Coordinate, to:Coordinate, callback) => {
    const lastState = getLastGameState(gameInstance)
    const expectedSocket = gameInstance[(lastState.turn) + "Id"]
    if( expectedSocket !== socketId){
      callback({status:"Not your turn"})
      return;
    }
    if(!getAllowedMovesForPieceAtCoordinate(from, lastState)[to.x + BOARD_SIZE*to.y]){
      callback({status:"Move not allowed"})
      return;
    }

    const fromMsg = `(${from.x}, ${from.y})`
    const toMsg = `(${to.x}, ${to.y})`
    logAndEmit(gameInstance.id, socketId + " is moving from " + fromMsg + " to " + toMsg);
    const newState = move(from, to, getLastGameState(gameInstance));
    gameInstance.gameStates.push(newState)
    if(newState.finished) {
      io.to(gameInstance.id.toString()).emit("newState", newState)
      terminateGameInstance(gameInstance.id)
    } else {
      clearTimeout(gameInstance.timerTimeoutId)
      const newTimeroutId = setTimeout( () => {
        terminateGameInstance(gameInstance.id)
      }, newState[newState.turn + "TimeLeft"])
      gameInstance.timerTimeoutId = newTimeroutId
      io.to(gameInstance.id.toString()).emit("newState", newState)
    }
    callback({status:"ok"})
  })

  handleSocketConnection(socket, token)
});


// TODO: make server with auth and routing
server.listen(PORT, () => console.log(new Date().toISOString(), '- server is listening on port ', PORT))
