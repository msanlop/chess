import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';
import Board from "./Board"
import {starterPosition} from "./Chess/Chess"

function App() {

  const [lastCoords, setLastCoords] = useState({x : 0, y : 0})
  const [tiles, setTiles] = useState(starterPosition)

  const onClick = (x : number, y : number) => {    
    setLastCoords({x:x, y:y})
  }


  return (
    <div className="App">
      <header className="App-header">
        <p>Last coords used were : ({lastCoords.x} {lastCoords.y})</p>
        <Board 
          onClick={onClick}
          tiles={tiles}
        />
      </header>
    </div>
  );
}

export default App;
