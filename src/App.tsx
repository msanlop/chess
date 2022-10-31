import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';
import Board from "./Board"
import {BOARD_SIZE, Coordinate, getAllowedMoves, starterPosition} from "./Chess/Chess"

function App() {

  const [lastCoords, setLastCoords] = useState({x : 0, y : 0})
  const [tiles, setTiles] = useState(starterPosition)
  const [highlighted, setHighlighted] = useState(new Array(BOARD_SIZE).fill(false))
  const [playerTurn, setPlayerTurn] = useState('w')

  const onClick = (coords : Coordinate) => {
    setLastCoords({x:coords.x, y:coords.y})

    const moves = getAllowedMoves(coords, {board:tiles, turn:playerTurn});
    setHighlighted(moves)
    
  }


  return (
    <div className="App">
      <header className="App-header">
        <p>Last coords used were : ({lastCoords.x} {lastCoords.y})</p>
        <Board 
          onClick={onClick}
          tiles={tiles}
          highlighted={highlighted}
        />
      </header>
    </div>
  );
}

export default App;
