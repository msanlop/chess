import { debug } from "console";

export const BOARD_SIZE = 8;
export const STARTING_TIME = 300000;

const starterPositionSerialized = 
`br:bk:bb:bq:bK:bb:bk:br:\
bp:bp:bp:bp:bp:bp:bp:bp:\
::::::::\
::::::::\
::::::::\
::::::::\
wp:wp:wp:wp:wp:wp:wp:wp:\
wr:wk:wb:wq:wK:wb:wk:wr`

const deserialize = (pos : string) : (Piece | null)[] => {
    return pos.split(":").map(p => {        
        if(p.length === 0) {return null}
        return {type:p[1], color: p[0]}
    })
}

const starterPosition : (Piece | null)[] = deserialize(starterPositionSerialized)

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

export interface GameState {
    readonly turn : string; // boolean?
    readonly board : (Piece | null)[];
    readonly check : boolean;
    readonly finished : boolean;
    readonly stalemate : boolean;
    readonly wLastMoveTime ?: number;
    readonly bLastMoveTime ?: number;
    readonly wTimeLeft : number;
    readonly bTimeLeft : number;

    // times ?: number; //timers??
}

const genericGameState = {
    board: [], 
    turn:'X', 
    check:false, 
    finished:false, 
    stalemate:false,
    wLastMoveTime : undefined,
    bLastMoveTime : undefined,
    wTimeLeft : 1000,
    bTimeLeft : 1000,
}


export const startingGameState = {
    board: starterPosition, 
    turn: 'w', 
    check:false, 
    finished:false, 
    stalemate:false,
    wLastMoveTime : 300000,
    bLastMoveTime : 300000,
    wTimeLeft : STARTING_TIME,
    bTimeLeft : STARTING_TIME,
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
    knight : [[1, 2],[-1, 2],[1, -2],[-1, -2],[2, 1],[2, -1],[-2, 1],[-2, -1]],

}

const correctPawnDirections = (directions:number[][], color:string) : number[][] => {
    return directions.filter((tuple) => 
    ( color === 'b' && tuple[1] > 0 )
    || ( color === 'w' && tuple[1] < 0 )
);
}
    

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

//checks if given player is in check
const isCheck = (state: GameState, player: string) : boolean => {
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

    const pawnDirection = correctPawnDirections(directions.diagonal, state.turn)
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

//returns true if the given player has no allowed moves
const hasNoAllowedMoves = (state:GameState, player:string) => {
    const whitePieces = state.board
        .map( (val, index) => {return {...val, x:index%BOARD_SIZE, y:Math.floor(index/BOARD_SIZE)}})
        .filter( v => v !== null && v.color === player)

    for(const p of whitePieces){
        if(getAllowedMovesForPieceAtCoordinate({x:p.x, y:p.y}, state).some(b => b)){
            return false
        }
    }
    return true;
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

    const obstaclePiece = getPiece(newCoords, state);
    if(obstaclePiece && obstaclePiece !== null){
        if(obstaclePiece.color === piece.color){return null}
        //pawn attacks on the front
        else if(piece.type === 'p'){
            movesRef[newCoords.x + BOARD_SIZE*newCoords.y] = direction[0] !== 0
            return null;
        } else{
            movesRef[newCoords.x + BOARD_SIZE*newCoords.y] = true
            return null;
    }
    }
    if(piece.type === 'p' && direction[0] !== 0){return null;}

    
    movesRef[newCoords.x + BOARD_SIZE*newCoords.y] = true
    return newCoords;
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
            //TODO: add en passant
            const pawnDirections = correctPawnDirections([...directions.diagonal, ...directions.straight], piece.color)
            for (const direction of pawnDirections) {
                let newCoords = {...coords};
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

    const movesWithoutSelfChecks = moves.map((canMove, index) => {
        if(!canMove){return false;}
        const tempBoard = [...state.board]
        tempBoard[coords.x + BOARD_SIZE*coords.y] = null 
        tempBoard[index] = piece
        // const tempState = {board: tempBoard, turn:state.turn, check:false, finished:false, stalemate:false}
        return !isCheck({...genericGameState, board:tempBoard, turn:state.turn}, piece.color)
    })
    
    return movesWithoutSelfChecks;
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
    
    //get new timers
    let wNewTimeLeft = state.wTimeLeft;
    let bNewTimeLeft = state.bTimeLeft;
    let bNewLastMoveTime = state.bLastMoveTime;
    let wNewLastMoveTime = state.wLastMoveTime;
    if(state.turn == 'w'){
        wNewLastMoveTime = performance.now()
        wNewTimeLeft =  wNewTimeLeft - (wNewLastMoveTime - bNewLastMoveTime!)
    } else {
        bNewLastMoveTime = performance.now()
        bNewTimeLeft =  bNewTimeLeft - (bNewLastMoveTime - wNewLastMoveTime!)
    }
    
    const newState = {...genericGameState, board:newBoard, turn:newTurn}
    const check = isCheck(newState, newTurn); //TODO: check for actual checks
    const cantMove = hasNoAllowedMoves(newState,  newTurn);
    return {
        ...newState,
        check:check,
        finished:cantMove,
        stalemate:cantMove && !check,
        wLastMoveTime : wNewLastMoveTime,
        bLastMoveTime : bNewLastMoveTime,
        wTimeLeft : wNewTimeLeft,
        bTimeLeft : bNewTimeLeft,
    }
}

export {isGameFinished, starterPosition}