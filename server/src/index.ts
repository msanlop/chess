import * as http from 'http'
import {Server} from 'socket.io'
import { GameState, getUpdateTimers, move, startingGameState } from './Chess/Chess';

const PORT = 8080
const GAME_RESTART_TIME = 10000

interface GameInstance {
  id: string;
  //socket ids of connected clients, a single connection per side is allowed
  wId?: string;
  bId?: string;
  gameStates : GameState[];
  gameIsStarted:boolean;
  timerTimeoutId ?: NodeJS.Timeout;
}


const defaultGameInstance = () : GameInstance => {
  return JSON.parse(JSON.stringify(
    {
      wId: undefined,
      bId:undefined,
      gameStates: [startingGameState], //TODO: make deep copy just incase
      gameIsStarted:false,
      id: "12314"
    }
    ))
}

const getLastGameState = (gameInstance : GameInstance) => gameInstance.gameStates[gameInstance.gameStates.length - 1]

// const playerGameInstances: Map<string, [GameInstance, string]> = new Map() TODO: allow for many game instances
let gameInstance : GameInstance = defaultGameInstance()


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


const terminateGameInstance = (instance : GameInstance) => {
  console.log("game over")
  io.to(instance.id.toString()).emit("gameOver")
  //terminate session in 10s
  setTimeout(() => {
    console.log("restarting instance")
    instance.gameIsStarted = false //avoid quick reconnect issues but keeps ids
    disconnectOldSocketIfExisting(instance.wId)
    disconnectOldSocketIfExisting(instance.bId)
    gameInstance = defaultGameInstance() //TODO: clear in map or whatever later
    !!true
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
  console.log(socket.id, ' connected as player : ', col);

  if(!gameInstance.gameIsStarted && gameInstance.bId && gameInstance.wId){
    console.log("both players connected, starting game");
    gameInstance.gameIsStarted = true
    const state = getLastGameState(gameInstance)
    state.wLastMoveTime = performance.now()
    io.to(gameInstance.id).emit('gameInit', state)
  } else if (gameInstance.gameIsStarted){
    console.log(col, "player reconnected, sending game state");
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
  const id = socket.id
  const token : string = socket.handshake.query.token as string

  socket.on('disconnect', () => {
    console.log(id, ' disconnected');
    if(gameInstance.bId === id){
      gameInstance.bId = undefined
    }
    if(gameInstance.wId === id){
      gameInstance.wId = undefined
    }
  })

  socket.on('move', (fromTo, callback) => {
    if(!token.endsWith(gameInstance.gameStates[gameInstance.gameStates.length - 1].turn)){ 
      callback({status:"Move not allowed"})
    }
      console.log(id, " is moving from ", fromTo.from, " to ", fromTo.to);
      const newState = move(fromTo.from, fromTo.to, getLastGameState(gameInstance));
      gameInstance.gameStates.push(newState)
      if(newState.finished) {
        io.to(gameInstance.id.toString()).emit("newState", newState)
        terminateGameInstance(gameInstance)
      } else {
        clearTimeout(gameInstance.timerTimeoutId)
        const newTimeroutId = setTimeout( () => {
          terminateGameInstance(gameInstance)
        }, newState[newState.turn + "TimeLeft"])
        gameInstance.timerTimeoutId = newTimeroutId
        io.to(gameInstance.id.toString()).emit("newState", newState)
      }
      callback({status:"ok"})
  })

  handleSocketConnection(socket, token)
});


// TODO: make server with auth and routing
server.listen(PORT, () => console.log(new Date(), '- server is listening on port ', PORT))
