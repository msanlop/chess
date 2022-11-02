import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';
import Board from "./Board"
import {BOARD_SIZE, Coordinate, getAllowedMovesForPieceAtCoordinate, starterPosition, move} from "./Chess/Chess"

function App() {

  const [selectedPiece, setSelectedPiece] = useState({x : 0, y : 0})
  const [gameState, setGameState] = useState({board:starterPosition, turn:'w', check:false})
  const [allowed, setAllowedMoves] = useState(new Array(BOARD_SIZE*BOARD_SIZE).fill(false))
  const [playerTurn, setPlayerTurn] = useState('w')

  const onClick = (coords : Coordinate) => {

    if(allowed[coords.x + BOARD_SIZE*coords.y]){
      setGameState(move(selectedPiece, coords, gameState))
      setAllowedMoves(new Array(BOARD_SIZE).fill(false))
    } else {
      setSelectedPiece({x:coords.x, y:coords.y})
      const moves = getAllowedMovesForPieceAtCoordinate(coords, gameState);
      setAllowedMoves(moves)
    }
    
  }


  return (
    <div className="App">
      <header className="App-header">
        <p>Last coords used were : ({selectedPiece.x} {selectedPiece.y})</p>
        <p>turn for {gameState.turn}</p>
        <p>Is there a check ? : {String(gameState.check)} </p>
        <Board 
          onClick={onClick}
          tiles={gameState.board}
          highlighted={allowed}
        />
      </header>
    </div>
  );
}

export default App;
