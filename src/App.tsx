import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';
import Board from "./Board"

function App() {

  const [lastCoords, setLastCoords] = useState({x : 0, y : 0})

  const onClick = (x : number, y : number) => {
    console.log(x, y);
    
    setLastCoords({x:x, y:y})
  }


  return (
    <div className="App">
      <header className="App-header">
        <p>Last coords used were : ({lastCoords.x} {lastCoords.y})</p>
        <Board onClick={onClick}/>
      </header>
    </div>
  );
}

export default App;
