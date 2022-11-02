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

const isOutOfBounds = (coords : Coordinate) : boolean => {
    return (coords.x >= BOARD_SIZE 
        || coords.x < 0 
        || coords.y >= BOARD_SIZE 
        || coords.y < 0)
}

export const getPiece = (coords : Coordinate, state : GameState) : (Piece | null | undefined) => {
    const {x, y} = coords;
    if(isOutOfBounds(coords)) {return undefined;}

    return state.board[x + y*BOARD_SIZE];
}

//checks if player who's turn is now is in a check
const isChecked = (state: GameState, player: string) : boolean => {
    let king;
    let i = -1;
    while(!king){
        i++ //so i is usable after loop
        const p = state.board[i]
        if(p === null) {continue;}
        king = p.color === player && p.type === 'K' ? p : undefined;
    }
    const x = i%BOARD_SIZE;
    const y = Math.floor(i/BOARD_SIZE);
    //knight checks

    let threatCoords;
    for(const dir of directions.knight){
        threatCoords = {x:x+dir[0], y:y+dir[1]}
        const threatningPiece = getPiece(threatCoords, state)
        if(threatningPiece && threatningPiece !== null 
            && threatningPiece.color !== king.color 
            && threatningPiece.type === 'k'){
            return true;
        }
    }


    for(const dir of directions.diagonal){
        threatCoords = {x:x,y:y}
        while(true){
            threatCoords = {x:threatCoords.x + dir[0], y:threatCoords.y + dir[1]}
            const p = getPiece(threatCoords, state);
            if(p === null){continue;}
            if(!p){break;}
            if(p.color !== king.color &&
                (p.type === 'b' || p.type === 'q')){
                    return true;
                }
            break;
            
        }
    }

    //OMG COPY PASTE !!!!!! im too lazy to make this clean rn
    for(const dir of directions.straight){
        threatCoords = {x:x,y:y}
        while(true){
            // let newX = x + dir[0]
            // let newY = y + dir[1]
            threatCoords = {x:threatCoords.x + dir[0], y:threatCoords.y + dir[1]}
            const p = getPiece(threatCoords, state);
            if(p === null){continue;}
            if(!p){break;}
            if(p.color !== king.color &&
                (p.type === 'r' || p.type === 'q')){
                    return true;
                }
            break;
            
        }
    }

    const pawnDirection = directions.diagonal.filter((tuple) => 
        ( state.turn === 'b' && tuple[1] > 0 )
        || ( state.turn === 'w' && tuple[1] < 0 )
    );
    debugger
    for(const dir of pawnDirection){
        threatCoords = {x:x+dir[0], y:y+dir[1]}
        const threatningPiece = getPiece(threatCoords, state)
        if(threatningPiece && threatningPiece !== null 
            && threatningPiece.color !== king.color 
            && threatningPiece.type === 'p'){
                return true;
        }
    }

    //TODO: check with pawn and king
    return false;
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
    if(isOutOfBounds(newCoords)){return null;}

    if(newCoords.x >= BOARD_SIZE || newCoords.x < 0 || newCoords.y >= BOARD_SIZE || newCoords.y < 0){
        return null;
    }
    const obstaclePiece = getPiece(newCoords, state);
    if(obstaclePiece && obstaclePiece !== null){
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
    if(!piece || piece === null || piece.color !== state.turn){return [];}
    
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
    
    const newState = {board:newBoard, turn:newTurn, check:false}
    const check = isChecked(newState, newTurn); //TODO: check for actual checks

    return check ? {...newState, check:check} : newState;
}

export {isGameFinished, starterPosition}