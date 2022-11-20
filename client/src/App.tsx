import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import Board from "./Board"
import {BOARD_SIZE, Coordinate, getAllowedMovesForPieceAtCoordinate, starterPosition, move, getPiece, GameState, startingGameState, STARTING_TIME} from "./Chess/Chess"
import InfoPanel from "./InfoPanel"
import Timer from './Timer';
import {io, Socket} from "socket.io-client"
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { tokenToString } from 'typescript';
import { debug } from 'console';
import HistoryControls from './HistoryControls';

const GAME_RESTART_TIME = 10000
let socket : Socket<DefaultEventsMap, DefaultEventsMap>;



function App() {

  const [selectedPiece, setSelectedPiece] = useState<Coordinate>({x : 0, y : 0})
  const [gameStateHistoryIndex,setGameStateHistoryIndex] = useState(0)
  const [gameState, setGameState] = useState<GameState[]>([{...startingGameState, wTimeLeft:-1, bTimeLeft:-1, wLastMoveTime:performance.now(), bLastMoveTime:performance.now()}])
  // const [gameStateHistory, setGameStateHistory] = useState<GameState[]>([])
  const [allowed, setAllowedMoves] = useState(new Array(BOARD_SIZE*BOARD_SIZE).fill(false))
  const [playerTurn, setPlayerTurn] = useState('w')
  const [draggingPiece, setDraggingPiece] = useState(false)
  const [timers, setTimers] = useState({w:STARTING_TIME, b:STARTING_TIME})
  const [intervalIds, setIntervalIds] = useState<number[]>([])
  const [counter, setCounter] = useState(0)
  const [playerColor, setPlayerColor] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [token, setToken] = useState('')

  // const [socket, setSocket] = useState<Socket<DefaultEventsMap, DefaultEventsMap>>()
  

  useEffect( () => {
    for(var i = 0; i<intervalIds.length; i++){
      const id = intervalIds.pop()
      window.clearInterval(id)
    }

    if(!playing){return;}

    const id : number = window.setInterval(updateTimers, 1000);
    intervalIds.push(id) //useing setState did not work with React.Strict mode on and one of the timers would not get cleared
    setIntervalIds(intervalIds);
    setCounter(performance.now())
  }, [gameState, playing])


  useEffect( () => {
    console.log(token);
    
    if(!token.endsWith('w') && !token.endsWith('b')){
      return;
    }

    if(!socket){
      socket = io('http://localhost:8080', {
        autoConnect: false,
        query: {
          token : token,
        }
      })
    }

    socket.on("connect", () => {
      console.log("connection established");
    })

    socket.on("disconnect", () => {
      console.log("connection lost");
    })

    socket.on("color", (col: string) => {
      console.log(col);
      
      if(!playerColor){
        setPlayerColor(col)
        console.log("I am playeing as ", col);
        
      }
    })

    socket.on('gameInit', initialState => {
      console.log("received starting game state");
      setPlaying(true)
      setGameState([initialState])
      setTimers({w:initialState.wTimeLeft, b:initialState.bTimeLeft})
      setGameStateHistoryIndex(0)
    })

    socket.on("newState", newState => {
      
      setGameStateHistoryIndex(gameState.length)
      setGameState([...gameState, newState])
      // const newState = move(selectedPiece, coords, gameState[gameState.length - 1])
      // setGameState([...gameState, newState])      
      setAllowedMoves(new Array(BOARD_SIZE).fill(false))
      setTimers({w:newState.wTimeLeft, b:newState.bTimeLeft})
    })

    socket.on("gameOver", () => {
      setPlaying(false)
      setTimeout(() => {
        setGameStateHistoryIndex(0)
        setGameState([startingGameState])
        socket.connect()

      }, GAME_RESTART_TIME + 2000)


    })

    if(!socket.connected){
      socket.connect()
    }
  }, [token])

  /**
   * selectTile handles the piece moves/captures.
   * If coords is undefined, unselect the piece (dragging piece out of the board).
   * If coords is an allowed move, process the move and update game state.
   * If coords is not an allowed move switch selected piece (if possible) to the selected tile.
   * 
   * @param coords piece coordinate
   */
  const selectTile = (coords : Coordinate | undefined, dragging : boolean) => {
    if(!playing || !coords){return;}
    const piece = getPiece(coords, gameState[gameStateHistoryIndex])
    //go back to present if click on old state
    if(gameStateHistoryIndex !== gameState.length - 1){
      setGameStateHistoryIndex(gameState.length - 1)
    }
    //unselect if cursor outside board
    if(!coords){
      setAllowedMoves(new Array(BOARD_SIZE).fill(false))
    }
    else if (!allowed[coords.x + BOARD_SIZE*coords.y]){
      if(!dragging && piece && piece.color === playerColor){
        setSelectedPiece({x:coords.x, y:coords.y})
        const moves = getAllowedMovesForPieceAtCoordinate(coords, gameState[gameStateHistoryIndex]);
        setAllowedMoves(moves)
      } else {
        //unselect pieces if dragging stoped over friendly piece
        setAllowedMoves(new Array(BOARD_SIZE).fill(false))
      }
    }
    else{
      
      if(socket.connected){
        socket.emit("move", {from:selectedPiece, to:coords}, (response:any) => {
          console.log(response.status);
          
          if(response.status === "ok"){
            // const newState = move(selectedPiece, coords, gameState[gameState.length - 1])
            // setGameStateHistoryIndex(gameState.length)
            // setGameState([...gameState, newState])      
            // setAllowedMoves(new Array(BOARD_SIZE).fill(false))
            // setTimers({w:newState.wTimeLeft, b:newState.bTimeLeft})
          } else {
            setAllowedMoves(new Array(BOARD_SIZE).fill(false))
          }
        })
      }
    }
  }

  const changeViewedState = (command : string) => {
    switch (command) {
      case 'f':
        setGameStateHistoryIndex(Math.min(gameState.length - 1, gameStateHistoryIndex+1))
        break;
      case 'b':
        setGameStateHistoryIndex(Math.max(0, gameStateHistoryIndex-1))
        break;
      case 'p':
        setGameStateHistoryIndex(gameState.length - 1)
        break;
    }
  }




  const updateTimers = () => {
    const {w, b} = timers
    if(gameState[gameState.length-1].turn === 'w'){
      setTimers({w:Math.max(w-(performance.now() - counter!), 0),b:b})
    } else {
      setTimers({w:w,b:Math.max(b-(performance.now() - counter!), 0)})
    }
    
    // if(socket){
    //   setInterval(() => {
    //     socket[0].emit("msg", "hello world"+ w.toString())
    //     console.log('sengind s.io message ');
    //   }, 1000)
    // }
    setCounter(performance.now())
  }
  


  return (
    <div className="App">
      <header className="App-header">
        <h2> Chess</h2>
        <p>waltuh</p>
        {/* <p>white time left</p> */}
        {/* {msToMin(timers.w)} */}
        {/* <p>black time left</p> */}
        {/* {msToMin(timers.b)} */}
        <input onChange={v => setToken(v.target.value)}></input>
      </header>
      <div className='App-body'>
      {gameState[gameStateHistoryIndex].finished ? <p>"Winner " + {gameState[gameState.length - 1].turn=== 'w' ? 'b' : 'w'}</p> : <div> </div>}
        {gameState[gameStateHistoryIndex].stalemate ? <p>"There has been a stalemate!!!!"</p> : <></>}
          <Board 
            onClickSelect={selectTile}
            color={playerColor}
            gameState={gameState[gameStateHistoryIndex]}
            oldState={gameStateHistoryIndex !== gameState.length-1}
            highlighted={allowed}
            timers={timers}
            />
        <div className='right-panel'>
        <HistoryControls onClick={changeViewedState}/>

          {/* <InfoPanel 
            onClick={changeViewedState}
            timers={timers}
            /> */}
        </div>
      </div>
    </div>
  );
}

export default App;
