import './BoardCoordinate.css'
interface CoordinateCharacter {
    char : string
}

const BoardCoordinate = (props : CoordinateCharacter) => {






    return (
        <div className="coordinate" id='tile'>
            {props.char}
        </div>
    )
}


export default BoardCoordinate;