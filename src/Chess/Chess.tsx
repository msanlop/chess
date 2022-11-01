export const BOARD_SIZE = 8;

const starterPositionSerialized = 
`br:bk:bb:bq:bK:bb:bk:br:\
bp:bp:bp:bp:bp:bp:bp:bp:\
::::::::\
::::::::\
::::::::\
::::::::\
wp:wp:wp:wp:wp:wp:wp:wp:\
wr:wk:wb:wq:wK:wb:wk:wr`

interface Piece {
    type: string;
    color: string;
}

export interface Coordinate {
    x : number;
    y : number;
}

export interface Board {
    board : (Piece | null)[];
}

interface GameState {
    turn : string; // boolean?
    board : (Piece | null)[];
    // times ?: number; //timers??
}

const strides : Map<string, number[][]> = new Map([
    ['k', [[-1, 2], [1, 2], [-1, -2], [1, -2]]],
])


const deserialize = (pos : string) : (Piece | null)[] => {
    return pos.split(":").map(p => {        
        if(p.length === 0) {return null}
        return {type:p[1], color: p[0]}
    })
}

const starterPosition : (Piece | null)[] = deserialize(starterPositionSerialized)

export const getPiece = (coords : Coordinate, state : GameState) : (Piece | null) => {
    const {x, y} = coords;
    
    return state.board[x + y*BOARD_SIZE];
}

const isGameFinished = () => {
    return false
}

export const getAllowedMoves = (coords : Coordinate, state : GameState) : boolean[] => {    
    const piece = getPiece(coords, state)    
    if(piece === null || piece.color !== state.turn){return [];}
    
    const moves : boolean[] = new Array(BOARD_SIZE ** 2).fill(false)
    const {x, y} = coords;
    const strideArray = strides.get(piece.type)    
    if(!strideArray){return []}

    for (const stride of strideArray) {
        const newCoord = {x : x + stride[0], y: y + stride[1]}
        if(newCoord.x >= BOARD_SIZE || newCoord.x < 0 || newCoord.y >= BOARD_SIZE || newCoord.y < 0){
            continue;
        }

        if(getPiece(newCoord, state) !== null){
            //check if takes is possible
            break;
        }
        moves[newCoord.x + BOARD_SIZE*newCoord.y] = true
    }
    return moves;
}



export {isGameFinished, starterPosition}