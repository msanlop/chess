import { useState } from "react";
import Square from "./Square";
import './Board.css'
import { isPropertySignature } from "typescript";


const boardSide = 8

function Board(props:any) {

    const [tiles, setTiles] = useState(new Array(64).fill(null))
    
    // 

    return (
        <div className="chess-board">
            <ul>
                {tiles.map( (piece, index) => {
                    const [x,y] = [index%boardSide, index/boardSide >> 0]

                    return (
                        <div key={index}>
                            <Square 
                                coords={[x,y]} 
                                onClick={props.onClick}
                            />
                        </div>
                    )
                    }
                )}
            </ul>
        </div>
    )
}


export default Board;