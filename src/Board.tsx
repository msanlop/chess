import { Key, useState } from "react";
import Square from "./Square";
import './Board.css'
import { isPropertySignature } from "typescript";


const boardSide = 8

function Board(props:any) {


    return (
        <div className="chess-board">
            <ul>
                {props.gameState.board.map( (piece: any, index: number) => {
                    // if(index !== 4){return;}
                    const [x,y] = [index%boardSide, index/boardSide >> 0]

                    return (
                        <li key={index}>
                            <Square 
                                coords={{x,y}}
                                piece={piece}
                                highlighted={props.highlighted[index]}
                                onClick={props.onClick}
                            />
                        </li>
                    )
                    }
                )}
            </ul>
        </div>
    )
}


export default Board;