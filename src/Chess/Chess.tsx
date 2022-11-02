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
    readonly type: string;
    readonly color: string;
}

export interface Coordinate {
    readonly x : number;
    readonly y : number;
}

export interface Board {
    readonly board : (Piece | null)[];
}

interface GameState {
    readonly turn : string; // boolean?
    readonly board : (Piece | null)[];
    // times ?: number; //timers??
}

const strides : Map<string, number[][]> = new Map([
    ['k', [[1, 2],[-1, 2],[1, -2],[-1, -2]]],
    ['b', [[1,1],[-1,1],[1,-1],[-1,-1]]],
    ['r', [[1,0],[0,1],[-1,0],[0,-1]]],
    ['K', [[1,0],[0,1],[-1,0],[0,-1]]],
    ['p', [[0,1], [0,-1]]],
    ['q', [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[0,1],[-1,0],[0,-1]]],
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


const pawnIsInStartingPosition = (coords : Coordinate, piece: Piece, state : GameState) : boolean => {
    return (piece.color === 'w' && coords.y === 6 || piece.color === 'b' && coords.y === 1);
}

/**
 * Checks if a piece can move in a certain stride and alters the give allowed moves array if it can.
 * It returns the new coordinate of the piece after a move in this stride 
 *  or null if the piece meets another piece or falls out of bounds.
 * 
 * @param coords coordinates of the piece
 * @param piece piece to move
 * @param state game state
 * @param stride a single piece stride
 * @param movesRef reference to the allowed moves array. Is modified in this function as a side effect
 * @returns Coordinate if the piece does not meet another piece or the ends up out of bounds, null otherwise
 */
const checkStepInDirection = (coords : Coordinate, piece : Piece, state : GameState, stride:number[], movesRef: boolean[]) 
: (Coordinate | null) => {
    let newCoords = {...coords};
    newCoords = {x : newCoords.x + stride[0], y: newCoords.y + stride[1]}
    
    if(newCoords.x >= BOARD_SIZE || newCoords.x < 0 || newCoords.y >= BOARD_SIZE || newCoords.y < 0){
        return null;
    }
    if(getPiece(newCoords, state) !== null){
        //TODO: check if piece takes
        return null;
    }
    //TODO: check if move mates itself
    
    movesRef[newCoords.x + BOARD_SIZE*newCoords.y] = true
    return newCoords;
}


const checkMovesInDirection = (maximumSteps : number, coords : Coordinate, piece : Piece, state : GameState, stride:number[], movesRef: boolean[]) 
: void => {
    let newCoords = {...coords};
    for(let i=0; i<maximumSteps; i++){
            let nextCoords = checkStepInDirection(newCoords, piece, state, stride, movesRef);
            if(nextCoords === null){break;}
            newCoords = nextCoords
        }
}



export const getAllowedMoves = (coords : Coordinate, state : GameState) : boolean[] => {   
    const piece = getPiece(coords, state)    
    if(piece === null || piece.color !== state.turn){return [];}
    
    const moves : boolean[] = new Array(BOARD_SIZE ** 2).fill(false)
    const strideArray = strides.get(piece.type)    
    if(!strideArray){return []}

    switch (piece.type) {
        case 'k':
            for (const stride of strideArray) {
                checkMovesInDirection(1, coords, piece, state, stride, moves);
            }
            break;
        case 'K':
            //TODO: check for castling
            for(const stride of strideArray){
                checkMovesInDirection(1, coords, piece, state, stride, moves);
            }
            break;
        case 'p':
            //TODO: add en passant
            for (const stride of strideArray) {
                let newCoords = {...coords};
                if(piece.color === 'w' && stride[1] > 0 || piece.color === 'b' && stride[1] < 0) {
                    continue;
                }
                const numberOfMoves = pawnIsInStartingPosition(coords, piece, state) ? 2 : 1;
                checkMovesInDirection(numberOfMoves, coords, piece, state, stride, moves);
            }
            break;
        default:
            for (const stride of strideArray) {
                checkMovesInDirection(Infinity, coords, piece, state, stride, moves);                
            }
            break;
    }        
    return moves;
}



export {isGameFinished, starterPosition}