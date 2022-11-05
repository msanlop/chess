import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';
import Board from "./Board"
import {BOARD_SIZE, Coordinate, getAllowedMovesForPieceAtCoordinate, starterPosition, move, getPiece} from "./Chess/Chess"

function App() {

  const [selectedPiece, setSelectedPiece] = useState({x : 0, y : 0})
  const [gameState, setGameState] = useState({board:starterPosition, turn:'w', check:false})
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
    
    //unselect if cursor outside board
    if(!coords){
      setAllowedMoves(new Array(BOARD_SIZE).fill(false))
    }
    else if (!allowed[coords.x + BOARD_SIZE*coords.y]){
      if(!dragging){
        setSelectedPiece({x:coords.x, y:coords.y})
        const moves = getAllowedMovesForPieceAtCoordinate(coords, gameState);
        setAllowedMoves(moves)
      } else {
        //unselect pieces if dragging stoped over friendly piece
        setAllowedMoves(new Array(BOARD_SIZE).fill(false))
      }
    }
    else{
      setGameState(move(selectedPiece, coords, gameState))
      setAllowedMoves(new Array(BOARD_SIZE).fill(false))
    }
  }
  


  return (
    <div className="App">
      <header className="App-header">
        <p>Last coords used were : ({selectedPiece.x} {selectedPiece.y})</p>
        <p>turn for {gameState.turn}</p>
        <p>Is there a check ? : {String(gameState.check)} </p>
        <Board 
          onClickSelect={selectTile}
          gameState={gameState}
          highlighted={allowed}
        />
      </header>
    </div>
  );
}

export default App;
