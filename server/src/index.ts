import * as http from 'http'
import test from 'node:test';
import { escape } from 'querystring';
import {Server} from 'socket.io'
import { idText } from 'typescript';
import { BOARD_SIZE, Coordinate, coordinateToAlgebraic, GameState, getAllowedMovesForPieceAtCoordinate, getUpdateTimers, move, startingGameState } from './Chess/Chess';

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

interface GameEvent {
  gameInstanceId : string;
  type : string;
  content ?: string;
  player : string;
  socketId : string;
}

const logAndEmit = (event : GameEvent) => {
  let serverString = ""
  let clientString = ""
  const playerString = event.player === "white" ? "white" : "black";

  switch (event.type) {
    case "chat":
      serverString += event.content
      clientString += event.content
      break;
    case "reconnect" :
      serverString += `has reconnected as ${playerString}`
      clientString += playerString + " has reconnected"
      break;
    case "connect" :
      serverString += `${event.socketId} connected as ${playerString}`
      clientString += `${playerString} has connected`
      break;
    case "gameStart" :
      serverString += "both players connected"
      break;
    case "disconnect" :
      serverString += `${event.socketId} disconnected (${playerString})`
      clientString += `${playerString} has disconnected`
      break;
    case "move" :
      serverString += `${event.socketId} (${event.content})`
      clientString += event.content
      break;
    case "end" :
      serverString += event.content
      clientString += event.content
      break;
    case "restart" :
      serverString += "restarting game"
      clientString = serverString
      break;
    default:
      break;
  }
  
  serverLog(event.gameInstanceId, serverString)
  if(clientString.length !== 0){
    io.to(event.gameInstanceId).emit(event.type === "chat" ? "newChat" : "newInfo", clientString)
  } 
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
  let endMessage = "game over : "
  const endState =getLastGameState(instance)
  if(endState.stalemate){
    endMessage += "there was a draw!"
  } else {
    const winner = endState.turn === "w" ? "b" : "w"
    endMessage += "the winner is " + winner
  }
  logAndEmit({
    gameInstanceId: id,
    type : "end",
    player : '',
    socketId : '',
    content : endMessage
  })
  io.to(id).emit("gameOver")
  //terminate session in 10s
  setTimeout(() => {
    logAndEmit({
      gameInstanceId: id,
      type : "restart",
      player : '',
      socketId : ''
    })
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
  const gameInstance = getGameInstanceOfPlayer(token)
  let col = gameInstance?.wToken === token ? 'w' : 'b'
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
  logAndEmit({
    gameInstanceId: gameInstance.id,
    type : "connect",
    player : col,
    socketId : socket.id
  })

  if(!gameInstance.gameIsStarted && gameInstance.bId && gameInstance.wId){
    logAndEmit({
      gameInstanceId: gameInstance.id,
      type : "gameStart",
      player : '',
      socketId : ''
    })
    gameInstance.gameIsStarted = true
    const state = getLastGameState(gameInstance)
    state.wLastMoveTime = performance.now()
    io.to(gameInstance.id).emit('gameInit', state)
  } else if (gameInstance.gameIsStarted){
    logAndEmit({
      gameInstanceId: gameInstance.id,
      type : "reconnect",
      player : col,
      socketId : socket.id
    })
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
  const col = gameInstance?.wToken === token ? 'white' : 'black';
  console.log(col);
  

  socket.on('disconnect', () => {
    console.log(gameInstance?.wToken, " is the white token rn")
    logAndEmit({gameInstanceId : gameInstance.id, type:"disconnect", player:col, socketId:socketId});
    if(gameInstance.bId === socketId){
      gameInstance.bId = undefined
    }
    if(gameInstance.wId === socketId){
      gameInstance.wId = undefined
    }
  })

  socket.on("chatMessage", (input : string) => {
    const escapedString = (input)
    logAndEmit({
      gameInstanceId:gameInstance.id, 
      type: "chat",
      player: col,
      socketId: socketId,
      content: col + ": " + escapedString
    })
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

    logAndEmit({
      gameInstanceId:gameInstance.id, 
      type:"move",
      player:col,
      socketId: socketId,
      content: col + " moved from " + coordinateToAlgebraic(from) + " to " + coordinateToAlgebraic(to)
    })
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
