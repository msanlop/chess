"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.move = exports.getAllowedMovesForPieceAtCoordinate = exports.isGameFinished = exports.getPiece = exports.startingGameState = exports.starterPosition = exports.STARTING_TIME = exports.BOARD_SIZE = void 0;
exports.BOARD_SIZE = 8;
exports.STARTING_TIME = 300000;
exports.starterPosition = [
    { "type": "r", "color": "b" }, { "type": "k", "color": "b" }, { "type": "b", "color": "b" }, { "type": "q", "color": "b" }, { "type": "K", "color": "b" }, { "type": "b", "color": "b" }, { "type": "k", "color": "b" }, { "type": "r", "color": "b" },
    { "type": "p", "color": "b" }, { "type": "p", "color": "b" }, { "type": "p", "color": "b" }, { "type": "p", "color": "b" }, { "type": "p", "color": "b" }, { "type": "p", "color": "b" }, { "type": "p", "color": "b" }, { "type": "p", "color": "b" },
    null, null, null, null, null, null, null, null,
    null, null, null, null, null, null, null, null,
    null, null, null, null, null, null, null, null,
    null, null, null, null, null, null, null, null,
    { "type": "p", "color": "w" }, { "type": "p", "color": "w" }, { "type": "p", "color": "w" }, { "type": "p", "color": "w" }, { "type": "p", "color": "w" }, { "type": "p", "color": "w" }, { "type": "p", "color": "w" }, { "type": "p", "color": "w" },
    { "type": "r", "color": "w" }, { "type": "k", "color": "w" }, { "type": "b", "color": "w" }, { "type": "q", "color": "w" }, { "type": "K", "color": "w" }, { "type": "b", "color": "w" }, { "type": "k", "color": "w" }, { "type": "r", "color": "w" }
];
const genericGameState = {
    board: [],
    turn: 'X',
    check: false,
    finished: false,
    stalemate: false,
    wLastMoveTime: undefined,
    bLastMoveTime: undefined,
    wTimeLeft: 1000,
    bTimeLeft: 1000,
    wCanCastle: [true, true],
    bCanCastle: [true, true],
};
exports.startingGameState = {
    board: exports.starterPosition,
    turn: 'w',
    check: false,
    finished: false,
    stalemate: false,
    wLastMoveTime: 300000,
    bLastMoveTime: 300000,
    wTimeLeft: exports.STARTING_TIME,
    bTimeLeft: exports.STARTING_TIME,
    wCanCastle: [true, true],
    bCanCastle: [true, true],
};
// const directions : Map<string, number[][]> = new Map([
//     ['k', [[1, 2],[-1, 2],[1, -2],[-1, -2]]],
//     ['b', [[1,1],[-1,1],[1,-1],[-1,-1]]],
//     ['r', [[1,0],[0,1],[-1,0],[0,-1]]],
//     ['K', [[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]],
//     ['p', [[0,1], [0,-1]]],
//     ['q', [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[0,1],[-1,0],[0,-1]]],
// ])
const directions = {
    diagonal: [[1, 1], [-1, 1], [1, -1], [-1, -1]],
    straight: [[1, 0], [0, 1], [-1, 0], [0, -1]],
    knight: [[1, 2], [-1, 2], [1, -2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1]],
};
const correctPawnDirections = (directions, color) => {
    return directions.filter((tuple) => (color === 'b' && tuple[1] > 0)
        || (color === 'w' && tuple[1] < 0));
};
const isOutOfBounds = (coords) => {
    return (coords.x >= exports.BOARD_SIZE
        || coords.x < 0
        || coords.y >= exports.BOARD_SIZE
        || coords.y < 0);
};
const getPiece = (coords, state) => {
    const { x, y } = coords;
    if (isOutOfBounds(coords)) {
        return undefined;
    }
    return state.board[x + y * exports.BOARD_SIZE];
};
exports.getPiece = getPiece;
//checks if given player is in check
const isCheck = (state, player) => {
    let king;
    let i = -1;
    while (!king) {
        i++; //so i is usable after loop
        const p = state.board[i];
        if (p === null) {
            continue;
        }
        king = p.color === player && p.type === 'K' ? p : undefined;
    }
    const x = i % exports.BOARD_SIZE;
    const y = Math.floor(i / exports.BOARD_SIZE);
    //knight checks
    let threatCoords;
    for (const dir of directions.knight) {
        threatCoords = { x: x + dir[0], y: y + dir[1] };
        const threatningPiece = (0, exports.getPiece)(threatCoords, state);
        if (threatningPiece && threatningPiece !== null
            && threatningPiece.color !== king.color
            && threatningPiece.type === 'k') {
            return true;
        }
    }
    for (const dir of directions.diagonal) {
        threatCoords = { x: x, y: y };
        while (true) {
            threatCoords = { x: threatCoords.x + dir[0], y: threatCoords.y + dir[1] };
            const p = (0, exports.getPiece)(threatCoords, state);
            if (p === null) {
                continue;
            }
            if (!p) {
                break;
            }
            if (p.color !== king.color &&
                (p.type === 'b' || p.type === 'q')) {
                return true;
            }
            break;
        }
    }
    //OMG COPY PASTE !!!!!! im too lazy to make this clean rn
    for (const dir of directions.straight) {
        threatCoords = { x: x, y: y };
        while (true) {
            // let newX = x + dir[0]
            // let newY = y + dir[1]
            threatCoords = { x: threatCoords.x + dir[0], y: threatCoords.y + dir[1] };
            const p = (0, exports.getPiece)(threatCoords, state);
            if (p === null) {
                continue;
            }
            if (!p) {
                break;
            }
            if (p.color !== king.color &&
                (p.type === 'r' || p.type === 'q')) {
                return true;
            }
            break;
        }
    }
    const pawnDirection = correctPawnDirections(directions.diagonal, state.turn);
    for (const dir of pawnDirection) {
        threatCoords = { x: x + dir[0], y: y + dir[1] };
        const threatningPiece = (0, exports.getPiece)(threatCoords, state);
        if (threatningPiece && threatningPiece !== null
            && threatningPiece.color !== king.color
            && threatningPiece.type === 'p') {
            return true;
        }
    }
    //TODO: check with pawn and king
    return false;
};
//returns true if the given player has no allowed moves
const hasNoAllowedMoves = (state, player) => {
    const whitePieces = state.board
        .map((val, index) => { return { ...val, x: index % exports.BOARD_SIZE, y: Math.floor(index / exports.BOARD_SIZE) }; })
        .filter(v => v !== null && v.color === player);
    for (const p of whitePieces) {
        if ((0, exports.getAllowedMovesForPieceAtCoordinate)({ x: p.x, y: p.y }, state).some(b => b)) {
            return false;
        }
    }
    return true;
};
const isGameFinished = () => {
    return false;
};
exports.isGameFinished = isGameFinished;
const pawnIsInStartingPosition = (coords, piece, state) => {
    return (piece.color === 'w' && coords.y === 6 || piece.color === 'b' && coords.y === 1);
};
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
const checkIfStepInDirectionAllowedForPiece = (coords, piece, state, direction, movesRef) => {
    let newCoords = { ...coords };
    newCoords = { x: newCoords.x + direction[0], y: newCoords.y + direction[1] };
    if (isOutOfBounds(newCoords)) {
        return null;
    }
    const obstaclePiece = (0, exports.getPiece)(newCoords, state);
    if (obstaclePiece && obstaclePiece !== null) {
        if (obstaclePiece.color === piece.color) {
            return null;
        }
        //pawn attacks on the front
        else if (piece.type === 'p') {
            movesRef[newCoords.x + exports.BOARD_SIZE * newCoords.y] = direction[0] !== 0;
            return null;
        }
        else {
            movesRef[newCoords.x + exports.BOARD_SIZE * newCoords.y] = true;
            return null;
        }
    }
    if (piece.type === 'p' && direction[0] !== 0) {
        return null;
    }
    movesRef[newCoords.x + exports.BOARD_SIZE * newCoords.y] = true;
    return newCoords;
};
const checkAllowedMovesInDirectionForPiece = (maximumSteps, coords, piece, state, direction, movesRef) => {
    let newCoords = { ...coords };
    for (let i = 0; i < maximumSteps; i++) {
        let nextCoords = checkIfStepInDirectionAllowedForPiece(newCoords, piece, state, direction, movesRef);
        if (nextCoords === null) {
            break;
        }
        newCoords = nextCoords;
    }
};
//get coordinates where king can move if doing a castle
const getAllowedCastleMovesForKingAtCoordinate = (coords, state) => {
    const allowedMovesCoords = [];
    const king = (0, exports.getPiece)(coords, state);
    if (king.color === 'b') {
        if (state.bCanCastle[0]
            && !(0, exports.getPiece)({ x: 3, y: 0 }, state)
            && !(0, exports.getPiece)({ x: 2, y: 0 }, state)
            && !(0, exports.getPiece)({ x: 1, y: 0 }, state)) {
            allowedMovesCoords.push({ x: 2, y: 0 });
        }
        if (state.bCanCastle[1]
            && !(0, exports.getPiece)({ x: 5, y: 0 }, state)
            && !(0, exports.getPiece)({ x: 6, y: 0 }, state)) {
            allowedMovesCoords.push({ x: 6, y: 0 });
        }
    }
    else {
        if (state.wCanCastle[0]
            && !(0, exports.getPiece)({ x: 3, y: 7 }, state)
            && !(0, exports.getPiece)({ x: 2, y: 7 }, state)
            && !(0, exports.getPiece)({ x: 1, y: 7 }, state)) {
            allowedMovesCoords.push({ x: 2, y: 7 });
        }
        if (state.wCanCastle[1]
            && !(0, exports.getPiece)({ x: 5, y: 7 }, state)
            && !(0, exports.getPiece)({ x: 6, y: 7 }, state)) {
            allowedMovesCoords.push({ x: 6, y: 7 });
        }
    }
    return allowedMovesCoords;
};
const getAllowedMovesForPieceAtCoordinate = (coords, state) => {
    const piece = (0, exports.getPiece)(coords, state);
    if (!piece || piece === null || piece.color !== state.turn) {
        return [];
    }
    const moves = new Array(exports.BOARD_SIZE ** 2).fill(false);
    switch (piece.type) {
        case 'k':
            for (const direction of [...directions.knight]) {
                checkAllowedMovesInDirectionForPiece(1, coords, piece, state, direction, moves);
            }
            break;
        case 'K':
            for (const direction of [...directions.diagonal, ...directions.straight]) {
                checkAllowedMovesInDirectionForPiece(1, coords, piece, state, direction, moves);
            }
            //get posible castle moves
            for (const c of getAllowedCastleMovesForKingAtCoordinate(coords, state)) {
                moves[c.x + exports.BOARD_SIZE * c.y] = true;
            }
            break;
        case 'p':
            //TODO: add en passant
            const pawnDirections = correctPawnDirections([...directions.diagonal, ...directions.straight], piece.color);
            for (const direction of pawnDirections) {
                let newCoords = { ...coords };
                const numberOfMoves = pawnIsInStartingPosition(coords, piece, state) ? 2 : 1;
                checkAllowedMovesInDirectionForPiece(numberOfMoves, coords, piece, state, direction, moves);
            }
            break;
        case 'b':
            for (const direction of directions.diagonal) {
                checkAllowedMovesInDirectionForPiece(Infinity, coords, piece, state, direction, moves);
            }
            break;
        case 'r':
            for (const direction of directions.straight) {
                checkAllowedMovesInDirectionForPiece(Infinity, coords, piece, state, direction, moves);
            }
            break;
        case 'q':
            for (const direction of [...directions.diagonal, ...directions.straight]) {
                checkAllowedMovesInDirectionForPiece(Infinity, coords, piece, state, direction, moves);
            }
            break;
        default:
            console.log("DEFAULT MOVE TAKEN");
            break;
    }
    const movesWithoutSelfChecks = moves.map((canMove, index) => {
        if (!canMove) {
            return false;
        }
        const tempBoard = [...state.board];
        tempBoard[coords.x + exports.BOARD_SIZE * coords.y] = null;
        tempBoard[index] = piece;
        // const tempState = {board: tempBoard, turn:state.turn, check:false, finished:false, stalemate:false}
        return !isCheck({ ...genericGameState, board: tempBoard, turn: state.turn }, piece.color);
    });
    return movesWithoutSelfChecks;
};
exports.getAllowedMovesForPieceAtCoordinate = getAllowedMovesForPieceAtCoordinate;
//get a board but with the from piece in to's position
const getBoardWithMovedPiece = (from, to, board) => {
    const newBoard = [...board]; //how to typedef instead of this
    const piece = newBoard[from.x + exports.BOARD_SIZE * from.y];
    newBoard[to.x + exports.BOARD_SIZE * to.y] = piece;
    newBoard[from.x + exports.BOARD_SIZE * from.y] = null;
    return newBoard;
};
/**
 * Moves a piece and returns the new game state
 *
 * @param from coordinate of the moving piece
 * @param to destination of the moving piece
 * @param state game state
 * @returns new game state after the move
 */
const move = (from, to, state) => {
    //TODO: check move is allowed for server purposes??
    let newBoard = getBoardWithMovedPiece(from, to, state.board);
    // const newBoard = [...state.board]
    // const piece = newBoard[from.x + BOARD_SIZE*from.y];
    // newBoard[to.x + BOARD_SIZE*to.y] = piece;
    // newBoard[from.x + BOARD_SIZE*from.y] = null;
    const newTurn = state.turn === 'w' ? 'b' : 'w';
    //get new timers
    let wNewTimeLeft = state.wTimeLeft;
    let bNewTimeLeft = state.bTimeLeft;
    let bNewLastMoveTime = state.bLastMoveTime;
    let wNewLastMoveTime = state.wLastMoveTime;
    if (state.turn == 'w') {
        wNewLastMoveTime = performance.now();
        wNewTimeLeft = wNewTimeLeft - (wNewLastMoveTime - bNewLastMoveTime);
    }
    else {
        bNewLastMoveTime = performance.now();
        bNewTimeLeft = bNewTimeLeft - (bNewLastMoveTime - wNewLastMoveTime);
    }
    let wCatsle = state.wCanCastle;
    let bCatsle = state.bCanCastle;
    if (from.x === 0 && from.y === 0) {
        bCatsle[0] = false;
    }
    else if (from.x === 7 && from.y === 0) {
        bCatsle[1] = false;
    }
    else if (from.x === 4 && from.y === 0) {
        bCatsle = [false, false];
        if (to.x === 2 && to.y === 0) {
            newBoard = getBoardWithMovedPiece({ x: 0, y: 0 }, { x: 3, y: 0 }, newBoard);
        }
        else if (to.x === 6 && to.y === 0) {
            newBoard = getBoardWithMovedPiece({ x: 7, y: 0 }, { x: 5, y: 0 }, newBoard);
        }
    }
    if (from.x === 0 && from.y === 7) {
        wCatsle[0] = false;
    }
    else if (from.x === 7 && from.y === 7) {
        wCatsle[1] = false;
    }
    else if (from.x === 4 && from.y === 7) {
        wCatsle = [false, false];
        if (to.x === 2 && to.y === 7) {
            newBoard = getBoardWithMovedPiece({ x: 0, y: 7 }, { x: 3, y: 7 }, newBoard);
        }
        else if (to.x === 6 && to.y === 7) {
            newBoard = getBoardWithMovedPiece({ x: 7, y: 7 }, { x: 5, y: 7 }, newBoard);
        }
    }
    const newState = { ...genericGameState, board: newBoard, turn: newTurn };
    const check = isCheck(newState, newTurn); //TODO: check for actual checks
    const cantMove = hasNoAllowedMoves(newState, newTurn);
    return {
        ...newState,
        check: check,
        finished: cantMove,
        stalemate: cantMove && !check,
        wLastMoveTime: wNewLastMoveTime,
        bLastMoveTime: bNewLastMoveTime,
        wTimeLeft: wNewTimeLeft,
        bTimeLeft: bNewTimeLeft,
        wCanCastle: wCatsle,
        bCanCastle: bCatsle,
    };
};
exports.move = move;
//# sourceMappingURL=Chess.js.map