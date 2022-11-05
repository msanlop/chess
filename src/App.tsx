import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import Board from "./Board"
import {BOARD_SIZE, Coordinate, getAllowedMovesForPieceAtCoordinate, starterPosition, move, getPiece, GameState, startingGameState, STARTING_TIME} from "./Chess/Chess"
import InfoPanel from "./InfoPanel"

function App() {

  const [selectedPiece, setSelectedPiece] = useState({x : 0, y : 0})
  const [gameStateHistoryIndex,setGameStateHistoryIndex] = useState(0)
  const [gameState, setGameState] = useState<GameState[]>([{...startingGameState, wLastMoveTime:performance.now(), bLastMoveTime:performance.now()}])
  // const [gameStateHistory, setGameStateHistory] = useState<GameState[]>([])
  const [allowed, setAllowedMoves] = useState(new Array(BOARD_SIZE*BOARD_SIZE).fill(false))
  const [playerTurn, setPlayerTurn] = useState('w')
  const [draggingPiece, setDraggingPiece] = useState(false)
  const [timers, setTimers] = useState({w:STARTING_TIME, b:STARTING_TIME})
  const [intervalIds, setIntervalIds] = useState<number[]>([])
  const [counter, setCounter] = useState(0)

  useEffect( () => {
    intervalIds.forEach(id => window.clearInterval(id))
    const id : number = window.setInterval(updateTimers, 1000);
    intervalIds.push(id) //useing setState did not work with React.Strict mode on and one of the timers would not get cleared
    setIntervalIds(intervalIds);
    setCounter(performance.now())
  }, [gameState])

  /**
   * selectTile handles the piece moves/captures.
   * If coords is undefined, unselect the piece (dragging piece out of the board).
   * If coords is an allowed move, process the move and update game state.
   * If coords is not an allowed move switch selected piece (if possible) to the selected tile.
   * 
   * @param coords piece coordinate
   */
  const selectTile = (coords : Coordinate | undefined, dragging : boolean) => {
    
    //go back to present if click on old state
    if(gameStateHistoryIndex !== gameState.length - 1){
      setGameStateHistoryIndex(gameState.length - 1)
    }
    //unselect if cursor outside board
    if(!coords){
      setAllowedMoves(new Array(BOARD_SIZE).fill(false))
    }
    else if (!allowed[coords.x + BOARD_SIZE*coords.y]){
      if(!dragging){
        setSelectedPiece({x:coords.x, y:coords.y})
        const moves = getAllowedMovesForPieceAtCoordinate(coords, gameState[gameStateHistoryIndex]);
        setAllowedMoves(moves)
      } else {
        //unselect pieces if dragging stoped over friendly piece
        setAllowedMoves(new Array(BOARD_SIZE).fill(false))
      }
    }
    else{
      const newState = move(selectedPiece, coords, gameState[gameState.length - 1])
      setGameStateHistoryIndex(gameState.length)
      setGameState([...gameState, newState])      
      setAllowedMoves(new Array(BOARD_SIZE).fill(false))
      setTimers({w:newState.wTimeLeft, b:newState.bTimeLeft})
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


  const msToMin = (ms:number) => {
    let min = Math.floor((ms/1000/60) << 0);
    let sec = Math.floor((ms/1000) % 60);
    return min.toString() + ":" + sec.toString()
  }

  const updateTimers = () => {
    
    const {w, b} = timers
    console.log("timers", w, b, gameState.length - 1);
    if(gameState[gameState.length-1].turn === 'w'){
      setTimers({w:w-(performance.now() - counter!),b:b})
    } else {
      setTimers({w:w,b:b-(performance.now() - counter!)})
    }
    setCounter(performance.now())
  }
  


  return (
    <div className="App">
      <header className="App-header">
        <p>white time left</p>
        {msToMin(timers.w)}
        <p>black time left</p>
        {msToMin(timers.b)}
      </header>
      <div className='App-body'>
      {gameState[gameStateHistoryIndex].finished ? <p>"Winner " + {gameState[gameState.length - 1].turn=== 'w' ? 'b' : 'w'}</p> : <div> </div>}
        {gameState[gameStateHistoryIndex].stalemate ? <p>"There has been a stalemate!!!!"</p> : <></>}
        <Board 
          onClickSelect={selectTile}
          gameState={gameState[gameStateHistoryIndex]}
          highlighted={allowed}
        />
        <div className='right-panel'>
          <InfoPanel 
            onClick={changeViewedState}/>
        </div>
      </div>
    </div>
  );
}

export default App;
