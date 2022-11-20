import React, { FC, useEffect, useState } from "react";
import internal from "stream";
import './Square.css'
import {Coordinate} from './Chess/Chess'
import { isPropertySignature, reduceEachLeadingCommentRange } from "typescript";
import {pieceIcons} from './res/Pieces'

//TODO: get something better...
const BLACK_BACKGROUND_COLOR = "#3178C6"
const CHECK_BACKGROUND_COLOR = "red"
const BLACK_BACKGROUND_COLOR_OLD_STATE = "grey"
const WHITE_BACKGROUND_COLOR = "#FFFFFF"
const HIGHLIGHT_COLOR = "#C94E3E"
const HOVER_DRAG_COLOR = HIGHLIGHT_COLOR
const HALF_ICON_SIZE = 70 / 2


interface TileInformation {
    piece : {type: string, color : string};
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
}

const Square : FC<TileInformation> = (props : TileInformation)  => {
    const [colorsStyle, setColorsStyle] = useState<any>({background: 'white', color: 'black'})
    const [position, setPosition] = useState<any>()

    //update style to allow absolute positioning
    useEffect( () => {
        if(props.draggingCoords) {
            setPosition({
                position:"absolute",
                top:props.draggingCoords.y - HALF_ICON_SIZE,
                left:props.draggingCoords.x - HALF_ICON_SIZE,

            })            
        } else {
            setPosition({
                position:"relative",
                // top:"20%",
                // left:"0%"
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
                else if((x+y) % 2  === 0){
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
                    style={position}>
                </img>}
        </div>
    )
}


export default Square;