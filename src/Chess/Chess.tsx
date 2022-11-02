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

// const directions : Map<string, number[][]> = new Map([
//     ['k', [[1, 2],[-1, 2],[1, -2],[-1, -2]]],
//     ['b', [[1,1],[-1,1],[1,-1],[-1,-1]]],
//     ['r', [[1,0],[0,1],[-1,0],[0,-1]]],
//     ['K', [[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]],
//     ['p', [[0,1], [0,-1]]],
//     ['q', [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[0,1],[-1,0],[0,-1]]],
// ])

const directions = {
    diagonal : [[1,1],[-1,1],[1,-1],[-1,-1]],
    straight : [[1,0],[0,1],[-1,0],[0,-1]],
    knight : [[1, 2],[-1, 2],[1, -2],[-1, -2]],

}
    

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
 * Checks if a piece can move in a certain direction and alters the give allowed moves array if it can.
 * It returns the new coordinate of the piece after a move in this direction 
 *  or null if the piece meets another piece or falls out of bounds.
 * 
 * @param coords coordinates of the piece
 * @param piece piece to move
 * @param state game state
 * @param direction a single piece direction
 * @param movesRef reference to the allowed moves array. Is modified in this function as a side effect
 * @returns Coordinate if the piece does not meet another piece or the ends up out of bounds, null otherwise
 */
const checkIfStepInDirectionAllowedForPiece = (coords : Coordinate, piece : Piece, state : GameState, direction:number[], movesRef: boolean[]) 
: (Coordinate | null) => {
    let newCoords = {...coords};
    newCoords = {x : newCoords.x + direction[0], y: newCoords.y + direction[1]}
    
    if(newCoords.x >= BOARD_SIZE || newCoords.x < 0 || newCoords.y >= BOARD_SIZE || newCoords.y < 0){
        return null;
    }
    const obstaclePiece = getPiece(newCoords, state);
    if(obstaclePiece !== null){
        //TODO: check if takes is possible
        if(obstaclePiece.color === piece.color){return null}
    }
    //TODO: check if move mates itself
    
    movesRef[newCoords.x + BOARD_SIZE*newCoords.y] = true
    return obstaclePiece === null ? newCoords : null;
}


const checkAllowedMovesInDirectionForPiece = (maximumSteps : number, coords : Coordinate, piece : Piece, state : GameState, direction:number[], movesRef: boolean[]) 
: void => {
    let newCoords = {...coords};
    for(let i=0; i<maximumSteps; i++){
            let nextCoords = checkIfStepInDirectionAllowedForPiece(newCoords, piece, state, direction, movesRef);
            if(nextCoords === null){break;}
            newCoords = nextCoords
        }
}



export const getAllowedMovesForPieceAtCoordinate = (coords : Coordinate, state : GameState) : boolean[] => {   
    const piece = getPiece(coords, state)    
    if(piece === null || piece.color !== state.turn){return [];}
    
    const moves : boolean[] = new Array(BOARD_SIZE ** 2).fill(false)
    const directionArray = directions.get(piece.type)    
    if(!directionArray){return []}

    switch (piece.type) {
        case 'k':
            for (const direction of [...directions.knight]) {
                checkAllowedMovesInDirectionForPiece(1, coords, piece, state, direction, moves);
            }
            break;
        case 'K':
            //TODO: check for castling
            for(const direction of [...directions.diagonal, ...directions.straight]){
                checkAllowedMovesInDirectionForPiece(1, coords, piece, state, direction, moves);
            }
            break;
        case 'p':
            debugger
            //TODO: add en passant
            for (const direction of [...directions.straight]) {
                let newCoords = {...coords};
                if(direction[0] !== 0 ||
                    piece.color === 'w' && direction[1] > 0 
                    || piece.color === 'b' && direction[1] < 0) {
                    continue;
                }
                const numberOfMoves = pawnIsInStartingPosition(coords, piece, state) ? 2 : 1;
                checkAllowedMovesInDirectionForPiece(numberOfMoves, coords, piece, state, direction, moves);
            }
            break;
        case 'b':
            for(const direction of directions.diagonal){
                checkAllowedMovesInDirectionForPiece(Infinity, coords, piece, state, direction, moves);                
            }
            break;
        case 'r':
            for(const direction of directions.straight){
                checkAllowedMovesInDirectionForPiece(Infinity, coords, piece, state, direction, moves);                
            }
            break;
        case 'q':
            for(const direction of [...directions.diagonal, ...directions.straight]){
                checkAllowedMovesInDirectionForPiece(Infinity, coords, piece, state, direction, moves);                
            }
            break;
            
        default:
            console.log("DEFAULT MOVE TAKEN");
            
            break;
    }        
    return moves;
}

/**
 * Moves a piece and returns the new game state
 * 
 * @param from coordinate of the moving piece
 * @param to destination of the moving piece
 * @param state game state
 * @returns new game state after the move
 */
export const move = (from : Coordinate, to:Coordinate, state:GameState) : GameState => {
    //TODO: check move is allowed for server purposes??
    const newBoard = [...state.board]
    const piece = newBoard[from.x + BOARD_SIZE*from.y];
    newBoard[to.x + BOARD_SIZE*to.y] = piece;
    newBoard[from.x + BOARD_SIZE*from.y] = null;
    const newTurn = state.turn === 'w' ? 'b' : 'w';
    

    return {board:newBoard, turn:newTurn};
}

export {isGameFinished, starterPosition}