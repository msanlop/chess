import React, { FC, useEffect, useState } from "react";
import internal from "stream";
import './Square.css'
import {Coordinate} from './Chess/Chess'
import { isPropertySignature, reduceEachLeadingCommentRange } from "typescript";
import {pieceIcons} from './res/Pieces'

interface TileInformation {
    piece : {type: string, color : string};
    coords : Coordinate;
    onClick : (coords: Coordinate, dragging : boolean) => void;
    highlighted : boolean;
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
                top:props.draggingCoords.y,
                left:props.draggingCoords.x,
            })            
        } else {
            setPosition({
                position:"relative",
                top:"20%",
                left:"0%"
            })
        }
    }, [props.draggingCoords])


    //update background color if highlighted and border if hover while dragging piece
    useEffect( () => {
        const {x,y} = props.coords
        let newStyle = {}
        if(props.highlighted){
                newStyle = {background : '#EE6C4D', color : 'black'}
            } else{

                let bg = (x+y) % 2  === 0 ? "#ffffff" : "#007acc"
                let text = bg === "white"? "black" : "white"
                newStyle = {background : bg, color : text}
            }
        if(props.dragHover){
            newStyle = {...newStyle, border:"solid", boxSizing: "border-box", borderColor:"#EE6C4D"}
        } else {
            newStyle = {...newStyle, border:"none", boxSizing: "border-box"}

        }
        setColorsStyle(newStyle)
    }, [props.highlighted, props.dragHover])
    
    const squareOnMouseDown = (e:React.MouseEvent) => {
        props.onMouseDown(props.coords, e)
    }


    return (
        <div className="tile" 
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