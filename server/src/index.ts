import * as http from 'http'
import {Server} from 'socket.io'
import { GameState, move, startingGameState } from './Chess/Chess';

const PORT = 8080
const GAME_RESTART_TIME = 10000

interface GameInstance {
  id: string;
  //socket ids of connected clients, a single connection per side is allowed
  wId?: string;
  bId?: string;
  gameState : GameState;
  gameIsStarted:boolean;
}


const defaultGameInstance : GameInstance = {
  wId: undefined,
  bId:undefined,
  gameState:startingGameState, //TODO: make deep copy just incase
  gameIsStarted:false,
  id: "12314"
};

// const playerGameInstances: Map<string, [GameInstance, string]> = new Map() TODO: allow for many game instances
let gameInstance : GameInstance = JSON.parse(JSON.stringify(defaultGameInstance))


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


const disconnectOldSocketIfExisting = (socketId ?: string) => {
  if(socketId && io.sockets.sockets.has(socketId)){
    io.sockets.sockets.get(socketId)!.disconnect();
  }
}

const handleSocketConnection = (socket, token) => {
  if (token.length === 0){
    console.log("invalid token, disconnecting");
    socket.disconnect()
  }
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
    io.to(gameInstance.id).emit('gameInit', gameInstance.gameState)
  } else if (gameInstance.gameIsStarted){
    console.log(col, "player reconnected, sending game state");
    //TODO: send whole history, maybe sequence of moves and reconstruct on client
    //or compact serialized gamestate like before
    io.to(gameInstance.id).emit("gameInit", gameInstance.gameState)
  }

  console.log(gameInstance.wId, gameInstance.bId);
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
    if(token.endsWith(gameInstance.gameState.turn)){
      console.log(id, " is moving from ", fromTo.from, " to ", fromTo.to);
      const newState = move(fromTo.from, fromTo.to, gameInstance.gameState);
      gameInstance.gameState = newState
      if(newState.finished) {
        io.to(gameInstance.id.toString()).emit("newState", gameInstance.gameState)
        io.to(gameInstance.id.toString()).emit("gameOver")
        //terminate session in 10s
        setTimeout(() => {
          disconnectOldSocketIfExisting(gameInstance.wId)
          disconnectOldSocketIfExisting(gameInstance.bId)
          gameInstance = JSON.parse(JSON.stringify(defaultGameInstance))
        }, GAME_RESTART_TIME)
      } else {
        io.to(gameInstance.id.toString()).emit("newState", gameInstance.gameState)
      }
      callback({status:"ok"})
    } else {
      callback({status:"Move not allowed"})
    }
  })

  handleSocketConnection(socket, token)
});


// TODO: make server with auth and routing
server.listen(PORT, () => console.log(new Date(), '- server is listening on port ', PORT))
