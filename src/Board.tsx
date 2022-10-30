import { useState } from "react";
import Square from "./Square";
import './Board.css'


const boardSide = 8

function Board() {

    const [tiles, setTiles] = useState(new Array(64).fill(null))
    
    // 

    return (
        <div className="chess-board">
            <p>board here</p>
            <ul>
                {tiles.map( (piece, index) => {
                    const [x,y] = [index%boardSide, index/boardSide >> 0]

                    return (
                        <div key={index}>
                            <Square coords={[x,y]} />
                        </div>
                    )
                    }
                )}
            </ul>
        </div>
    )
}


export default Board;