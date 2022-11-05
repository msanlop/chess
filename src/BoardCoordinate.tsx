import './BoardCoordinate.css'
interface CoordinateCharacter {
    char : string
}

const BoardCoordinate = (props : CoordinateCharacter) => {






    return (
        <div className="coordinate">
            {props.char}
        </div>
    )
}


export default BoardCoordinate;