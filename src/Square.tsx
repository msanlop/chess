import { useEffect, useState } from "react";
import './Square.css'

function Square(props : any) {

    var color = "white";
    const [x,y] = props.coords
    color = (x+y) % 2  === 0 ? "white" : "black";
    const style = {
        background: color,
        color: color === "black"? "white" : "black"
    }


    return (
        <div className="tile" style={style} onClick={e => props.onClick(x, y)}>
            {props.coords}
        </div>
    )
}


export default Square;