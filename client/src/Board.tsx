import React, { Key, useState } from "react";
import Square from "./Square";
import './Board.css'
import { isPropertySignature } from "typescript";
import { pieceIcons } from "./res/Pieces";
import { BOARD_SIZE, Coordinate, getPiece } from "./Chess/Chess";
import BoardCoordinate from "./BoardCoordinate";
import Timer from "./Timer";

const uiCoordinatesArray = " abcdefgh".split('')

function Board(props:any) {

    const [intervalId, setIntervalId] = useState(0)
    const [draggingCoords, setDraggingCoords] = useState({x:0, y:0})
    const [lastHoveredCoords, setLastHoveredCoords] = useState<Coordinate | undefined>(undefined)
    const [dragging, setDragging] = useState(false)
    const [draggedPieceIndex, setDraggedPieceIndex] = useState(-1)

    /**
     * if dragging a piece, updates the piece position to follow mouse cursos
     */
    const followMouseCursor = (event : React.MouseEvent) => {     
        if(dragging){
            const x = event.pageX
            const y = event.pageY
            setDraggingCoords({x:x, y:y})
        }
    }

    /**
     * Handle dragging stop when mouse click is released
     */
    const up = () => {        
        setDraggedPieceIndex(-1)
        setDragging(false)
        props.onClickSelect(lastHoveredCoords, true)
    }

    /**
     * Update the coordinates of the last hovered tile
     */
    const enter = (coords:Coordinate) => {   
        setLastHoveredCoords(coords)
    }


    /**
     * Handle mouse down to start piece dragging
     */
    const onMouseDown = (coords : Coordinate, event: React.MouseEvent) => {
        const p = getPiece(coords, props.gameState)
        if(!dragging 
            && p !== null
            && p?.color === props.color){
            setDragging(true)
            const x = event.pageX
            const y = event.pageY
            setDraggedPieceIndex(coords.x + coords.y*BOARD_SIZE)
            setDraggingCoords({x:x, y:y})
            props.onClickSelect(coords)
            
        }
    }

    /**
     * Unselects piece if dragging when cursor leaves board
     */
    const exitBoard = () => {
        setLastHoveredCoords(undefined)
        setDragging(false)
        props.onClickSelect(undefined)
    }


    return (
        <div className="chess-board" 
            onMouseMove={followMouseCursor}
            onMouseLeave={exitBoard}
            >
            <Timer timerValue={props.timers.b} color="b"/>

            {/* <img src={pieceIcons.get("wq")!} style={{position:"absolute", top:draggingCoords.y, left:draggingCoords.x}}></img> */}
            <ul>
                {props.gameState.board.map( (piece: any, index: number) => {
                    // if(index !== 4){return;}
                    const [x,y] = [index%BOARD_SIZE, index/BOARD_SIZE >> 0]
                    //TODO: fix unecessary redraws
                    return (
                        <>

                        {/* draw index to the left of the board */}
                        {index % BOARD_SIZE === 0 ? <li key={'i'+ index}><BoardCoordinate char={ (BOARD_SIZE - y).toString()}/></li>: <></>}

                        <li key={index} onMouseMove={(e) => {}}>    
                            <Square 
                                coords={{x,y}}
                                piece={piece}
                                highlighted={props.highlighted[index]}
                                oldState={props.oldState}
                                isInCheck={props.gameState.check 
                                    && piece 
                                    && piece.type === 'K' 
                                    && props.gameState.turn === piece.color}
                                onClick={props.onClickSelect}
                                onMouseDown={onMouseDown}
                                onMouseUp={up}
                                onMouseEnter={enter}
                                draggingCoords={index === draggedPieceIndex && dragging ? draggingCoords: undefined}
                                dragHover={dragging && lastHoveredCoords!.x === x && lastHoveredCoords!.y === y} //TODO: only true for the hovered tile
                            />
                        </li>
                        </>
                    )
                    }
                )}

                {/* draw indices at the bottom of the board */}
                {uiCoordinatesArray.map(char => 
                    <li key={char}>
                        <BoardCoordinate char={char} />
                    </li>
                )}
            </ul>
            
            <Timer timerValue={props.timers.w} color="w"/>

        </div>
    )
}


export default Board;