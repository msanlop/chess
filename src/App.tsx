import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';
import Board from "./Board"
import {BOARD_SIZE, Coordinate, getAllowedMoves, starterPosition} from "./Chess/Chess"

function App() {

  const [selectedPiece, setSelectedPiece] = useState({x : 0, y : 0})
  const [gameState, setGameState] = useState({board:starterPosition, turn:'w'})
  const [allowed, setAllowedMoves] = useState(new Array(BOARD_SIZE*BOARD_SIZE).fill(false))
  const [playerTurn, setPlayerTurn] = useState('w')

  const onClick = (coords : Coordinate) => {
    setLastCoords({x:coords.x, y:coords.y})

    const moves = getAllowedMovesForPieceAtCoordinate(coords, {board:tiles, turn:playerTurn});
    setAllowedMoves(moves)
    
  }


  return (
    <div className="App">
      <header className="App-header">
        <p>Last coords used were : ({selectedPiece.x} {selectedPiece.y})</p>
        <p>turn for {gameState.turn}</p>
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
