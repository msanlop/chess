import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';
import Board from "./Board"
import {BOARD_SIZE, Coordinate, getAllowedMovesForPieceAtCoordinate, starterPosition, move, getPiece, GameState} from "./Chess/Chess"
import InfoPanel from "./InfoPanel"

function App() {

  const [selectedPiece, setSelectedPiece] = useState({x : 0, y : 0})
  const [gameStateHistoryIndex,setGameStateHistoryIndex] = useState(0)
  const [gameState, setGameState] = useState<GameState[]>([{board:starterPosition, turn:'w', check:false, finished:false, stalemate:false}])
  // const [gameStateHistory, setGameStateHistory] = useState<GameState[]>([])
  const [allowed, setAllowedMoves] = useState(new Array(BOARD_SIZE*BOARD_SIZE).fill(false))
  const [playerTurn, setPlayerTurn] = useState('w')
  const [draggingPiece, setDraggingPiece] = useState(false)

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
  
  console.log(gameStateHistoryIndex);


  return (
    <div className="App">
      <header className="App-header">
        
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
