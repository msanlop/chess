import React, { FC, useEffect, useState } from "react";
import internal from "stream";
import '../style/Square.css'
import {ALGEBRAIC_Y_AXIS, BOARD_SIZE, Coordinate, Piece} from '../Chess/Chess'
import { isPropertySignature, reduceEachLeadingCommentRange } from "typescript";
import {pieceIcons} from '../res/Pieces'

//TODO: get something better...
const BLACK_BACKGROUND_COLOR = "#3178C6"
const CHECK_BACKGROUND_COLOR = "red"
const BLACK_BACKGROUND_COLOR_OLD_STATE = "grey"
const WHITE_BACKGROUND_COLOR = "#FFFFFF"
const HIGHLIGHT_COLOR = "#C94E3E"
const HOVER_DRAG_COLOR = HIGHLIGHT_COLOR
const HALF_ICON_SIZE = 70 / 2


interface TileInformation {
    piece : (Piece | null);
    coords : Coordinate;
    onClick : (coords: Coordinate, dragging : boolean) => void;
    highlighted : boolean;
    oldState : boolean;
    isInCheck : boolean;
    draggingCoords ?: Coordinate;
    onMouseDown : (coords: Coordinate, e: React.MouseEvent) => void;
    onMouseUp : (coords: Coordinate) => void;
    onMouseEnter : (coords: Coordinate) => void;
    dragHover : boolean;
    drawAxis: number[];
    tileIndex : number;
}

const Square : FC<TileInformation> = (props : TileInformation)  => {
    const [colorsStyle, setColorsStyle] = useState<any>({background: 'white', color: 'black'})
    const [position, setPosition] = useState<any>()

    const isWhite = (x : number, y :number) => (x+y) % 2  === 0

    const getTileCharacter = (coords:Coordinate) => {
        const {x,y} = coords
        const index = props.tileIndex
        const isLeft = index % BOARD_SIZE === 0
        const isBottom = BOARD_SIZE*BOARD_SIZE - index <= BOARD_SIZE
        let letter = <></>
        let number = <></>
        if(!isLeft && !isBottom) return
        if(isBottom) {
            letter = <div id="boardLetterCoordinate" style={
                {color:isWhite(x, y) ?
                    BLACK_BACKGROUND_COLOR : WHITE_BACKGROUND_COLOR}}>
            {props.drawAxis.at(x)}
            </div>
        }
        if (isLeft) {
            number = <div id="boardNumberCoordinate" style={
                {color:isWhite(x, y) ?
                    BLACK_BACKGROUND_COLOR : WHITE_BACKGROUND_COLOR}}>
            {BOARD_SIZE - props.coords.y}
            </div>
        }
        return [letter, number]
        
    }

    //update style to allow absolute positioning
    useEffect( () => {
        if(props.draggingCoords) {
            setPosition({
                position:"fixed",
                top:props.draggingCoords.y - window.scrollY - HALF_ICON_SIZE,
                left:props.draggingCoords.x - window.scrollX - HALF_ICON_SIZE,
                zIndex: 100,
            })            
        } else {
            setPosition({
                position:"relative",
                zIndex: 10,
            })
        }
    }, [props.draggingCoords])


    //update background color if highlighted and border if hover while dragging piece
    useEffect( () => {
        const {x,y} = props.coords
        let newStyle = {}
        if(props.highlighted){
                newStyle = {background : HIGHLIGHT_COLOR, color : 'black'}
            } else{

                // let bg = (x+y) % 2  === 0 ? WHITE_BACKGROUND_COLOR : BLACK_BACKGROUND_COLOR
                let bg;
                if(props.isInCheck){
                    bg = CHECK_BACKGROUND_COLOR
                }
                else if(isWhite(x,y)){
                    bg = WHITE_BACKGROUND_COLOR
                } else {
                    bg = props.oldState ? BLACK_BACKGROUND_COLOR_OLD_STATE : BLACK_BACKGROUND_COLOR
                }

                let text = bg === "white"? "black" : "white"
                newStyle = {background : bg, color : text}
            }
        if(props.dragHover){
            newStyle = {...newStyle, border:"solid", boxSizing: "border-box", borderColor: HOVER_DRAG_COLOR}
        } else {
            newStyle = {...newStyle, border:"none", boxSizing: "border-box"}
        }
        setColorsStyle(newStyle)
    }, [props.highlighted, props.dragHover, props.oldState, props.isInCheck])
    
    const squareOnMouseDown = (e:React.MouseEvent) => {
        props.onMouseDown(props.coords, e)
    }


    return (
        <div className="square" 
            id="tile"
            style={{...colorsStyle}} 
            onClick={e => props.onClick(props.coords, false)}
            onMouseDown={squareOnMouseDown}
            onMouseUp={() => props.onMouseUp(props.coords)}
            onMouseEnter={() => {props.onMouseEnter(props.coords)}}
        >
            {props.piece === null ? <></> : 
                <img src={pieceIcons.get(props.piece.color + props.piece.type)} className="piece-icon" 
                    style={{...position}}>
                </img>}
                {getTileCharacter(props.coords)}
        </div>
    )
}


export default Square;