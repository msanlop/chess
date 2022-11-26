import { useEffect, useState } from 'react';
import './App.css';
import Board from "./component/Board"
import {BOARD_SIZE, Coordinate, getAllowedMovesForPieceAtCoordinate, starterPosition, move, getPiece, GameState, startingGameState, STARTING_TIME} from "./Chess/Chess"
// import InfoPanel from "./Components/InfoPanel"
// import Timer from './Timer';
import {io, Socket} from "socket.io-client"
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { debug } from 'console';
import HistoryControls from './component/HistoryControls';

const GAME_RESTART_TIME = 10000
let socket : Socket<DefaultEventsMap, DefaultEventsMap>;



function App() {

  const [selectedPieceCoords, setSelectedPiece] = useState<Coordinate>({x : 0, y : 0})
  const [gameStateHistoryIndex,setGameStateHistoryIndex] = useState(0)
  const [gameStates, setGameStates] = useState<GameState[]>([{...startingGameState, wTimeLeft:5000}])
  const [allowed, setAllowedMoves] = useState(new Array(BOARD_SIZE*BOARD_SIZE).fill(false))
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
  }, [gameStates, playing, counter])


  useEffect( () => {
    
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
      //using ...gameStates in setGameStates uses outdates values of when this handlers are created
      while(gameStates.pop());
      gameStates.push(initialState)
      setGameStates(gameStates)
      setGameStateHistoryIndex(0)
      setTimers({w:initialState.wTimeLeft, b:initialState.bTimeLeft})
      setCounter(performance.now())
    })

    socket.on("newState", newState => {
      setGameStateHistoryIndex(gameStates.length)
      gameStates.push(newState)
      setGameStates(gameStates)      
      setTimers({w:newState.wTimeLeft, b:newState.bTimeLeft})
    })

    socket.on("gameOver", () => {
      setPlaying(false)
      setTimeout(() => {
        setGameStateHistoryIndex(0)
        setGameStates([startingGameState])
        socket.connect()

      }, GAME_RESTART_TIME + 2000)


    })

    if(!socket.connected){
      socket.connect()
    }
  }, [token])

  useEffect( () => setAllowedMoves(new Array(BOARD_SIZE).fill(false)), [gameStates, gameStateHistoryIndex])

  /**
   * selectTile handles the piece moves/captures.
   * If coords is undefined, unselect the piece (dragging piece out of the board).
   * If coords is an allowed move, process the move and update game state.
   * If coords is not an allowed move switch selected piece (if possible) to the selected tile.
   * 
   * @param coords piece coordinate
   */
  const selectTile = (coords ?: Coordinate, dragging ?: boolean) => {
    if(!playing || !coords){return;}
    const piece = getPiece(coords, gameStates[gameStateHistoryIndex])
    //go back to present if click on old state
    if(gameStateHistoryIndex !== gameStates.length - 1){
      setGameStateHistoryIndex(gameStates.length - 1)
    }
    //unselect if cursor outside board
    if(!coords){
      setAllowedMoves(new Array(BOARD_SIZE).fill(false))
    }
    else if (!allowed[coords.x + BOARD_SIZE*coords.y]){
      if(!dragging && piece && piece.color === playerColor){
        setSelectedPiece({x:coords.x, y:coords.y})
        const moves = getAllowedMovesForPieceAtCoordinate(coords, gameStates[gameStateHistoryIndex]);
        setAllowedMoves(moves)
      } else {
        //unselect pieces if dragging stoped over friendly piece
        setAllowedMoves(new Array(BOARD_SIZE).fill(false))
      }
    }
    else{
      
      if(socket.connected){
        socket.emit("move", selectedPieceCoords, coords, (response:any) => {
          console.log(response.status);
          setAllowedMoves(new Array(BOARD_SIZE).fill(false))
        })
      }
    }
  }

  const changeViewedState = (command : string) => {
    switch (command) {
      case 'f':
        setGameStateHistoryIndex(Math.min(gameStates.length - 1, gameStateHistoryIndex+1))
        break;
      case 'b':
        setGameStateHistoryIndex(Math.max(0, gameStateHistoryIndex-1))
        break;
      case 'p':
        setGameStateHistoryIndex(gameStates.length - 1)
        break;
    }
  }




  const updateTimers = () => {
    const {w, b} = timers
    if(gameStates[gameStates.length-1].turn === 'w'){
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
      {gameStates[gameStateHistoryIndex].finished ? <p>"Winner " + {gameStates[gameStates.length - 1].turn=== 'w' ? 'b' : 'w'}</p> : <div> </div>}
        {gameStates[gameStateHistoryIndex].stalemate ? <p>"There has been a stalemate!!!!"</p> : <></>}
          <Board 
            onClickSelect={selectTile}
            color={playerColor}
            gameState={gameStates[gameStateHistoryIndex]}
            oldState={gameStateHistoryIndex !== gameStates.length-1}
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
