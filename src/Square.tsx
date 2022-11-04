import { FC, useEffect, useState } from "react";
import internal from "stream";
import './Square.css'
import {Coordinate} from './Chess/Chess'
import { reduceEachLeadingCommentRange } from "typescript";
import {pieceIcons} from './res/Pieces'

interface TileInformation {
    piece : {type: string, color : string};
    coords : Coordinate;
    onClick : (coords: Coordinate) => void;
    highlighted : boolean;
}

const Square : FC<TileInformation> = (props : TileInformation)  => {
    const [colors, setcolors] = useState({background: 'white', color: 'black'})
    var style;

    useEffect( () => {
    const {x,y} = props.coords
    if(props.highlighted){
            setcolors({background : '#c74c21', color : 'black'});
        } else{

            let bg = (x+y) % 2  === 0 ? "#219CC7" : "#EBFAFF"
            let text = bg === "white"? "black" : "white"
            setcolors({background : bg, color : text});
        }

    }, [props.highlighted])
    
    


    return (
        <div className="tile" 
            style={colors} 
            onClick={e => props.onClick(props.coords)}
        >

            {props.piece === null ? <></> : <img src={pieceIcons.get(props.piece.color + props.piece.type)}></img>}
        </div>
    )
}


export default Square;