import React, { Key, useState } from "react";
import Square from "./Square";
import '../style/Board.css'
import { isPropertySignature } from "typescript";
import { pieceIcons } from "../res/Pieces";
import { ALGEBRAIC_X_AXIS, ALGEBRAIC_Y_AXIS, BOARD_SIZE, Coordinate, GameState, getPiece, Piece} from "../Chess/Chess";
import BoardCoordinate from "./BoardCoordinate";
import Timer from "./Timer"

interface BoardProps {
    onClickSelect : (coords ?: Coordinate, dragging ?: boolean) => void ;
    color : string | null; //'w' | 'b'
    gameState : GameState;
    oldState : boolean;
    highlighted : boolean[];
    timers : {w: number; b: number;};
}

function Board(props:BoardProps) {

    const [intervalId, setIntervalId] = useState(0)
    const [draggingCoords, setDraggingCoords] = useState({x:0, y:0})
    const [lastHoveredCoords, setLastHoveredCoords] = useState<Coordinate | undefined>(undefined)
    const [dragging, setDragging] = useState(false)
    const [draggedPieceIndex, setDraggedPieceIndex] = useState(-1)

    const isBlack = props.color === 'b'
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
        props.onClickSelect()
    }

    const invertArray = (board : any[]) : any[]  => {
        const temp = [...board]
        return temp.reverse()
    }

    const drawBoard = isBlack ? invertArray(props.gameState.board) : props.gameState.board;
    const drawHighlighted = isBlack ? invertArray(props.highlighted) : props.highlighted;
    const drawAxis = isBlack ? invertArray(ALGEBRAIC_X_AXIS) : ALGEBRAIC_X_AXIS;
    
    const topPadding = []
    for (let index = 0; index < BOARD_SIZE + 1; index++) {
        topPadding.push(<li key={''}><BoardCoordinate char={''}/></li>)
    }
    // const drawBoard = [null];
    
    
    const timer = (isBlack : boolean) => isBlack ? 
        <Timer timerValue={props.timers.b} color="b"/> : 
        <Timer timerValue={props.timers.w} color="w"/>

    return (
        <div className="chess-board" 
            onMouseMove={followMouseCursor}
            onMouseLeave={exitBoard}
            >
                
            {timer(!isBlack)}

                
            <ul>
                {/* {topPadding} */}
                {props.gameState.board.map( (piece: (Piece | null), index: number) => {
                    const drawIndex = isBlack ? BOARD_SIZE*BOARD_SIZE - 1 - index : index
                    const [x,y] = [drawIndex%BOARD_SIZE, drawIndex/BOARD_SIZE >> 0]
                    
                    return (
                        <>


                        {/* draw index to the left of the board */}
                        {/* {index % BOARD_SIZE === 0 ? 
                            <li key={'i'+ index}><BoardCoordinate char={ (BOARD_SIZE - y).toString()}/></li>: 
                            <></>} */}

                        <li key={index} onMouseMove={(e) => {}}>    
                            <Square 
                                coords={{x,y}}
                                piece={drawBoard[index]}
                                highlighted={drawHighlighted[index]}
                                oldState={props.oldState}
                                isInCheck={props.gameState.check 
                                    && drawBoard[index] !== null 
                                    && drawBoard[index]
                                    && drawBoard[index].type === 'K' 
                                    && props.gameState.turn === drawBoard[index].color}
                                drawAxis={drawAxis}
                                onClick={props.onClickSelect}
                                onMouseDown={onMouseDown}
                                onMouseUp={up}
                                tileIndex={index}
                                onMouseEnter={enter}
                                draggingCoords={drawIndex === draggedPieceIndex && dragging ? draggingCoords : undefined}
                                dragHover={dragging && lastHoveredCoords!.x === x && lastHoveredCoords!.y === y} //TODO: only true for the hovered tile
                            />
                        </li>
                        </>
                    )
                    }
                )}

                {/* draw indices at the bottom of the board, '' for padding */}
                {/* <BoardCoordinate char={''} />
                {drawAxis.map(char => 
                    <li key={char}>
                        <BoardCoordinate char={char} />
                    </li>
                )} */}
            </ul>
            
            {timer(isBlack)}

        </div>
    )
}


export default Board;