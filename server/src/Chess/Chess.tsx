export const BOARD_SIZE = 8;
export const STARTING_TIME = 300000;

export const ALGEBRAIC_X_AXIS = ["a", "b", "c", "d", "e", "f", "g", "h"];
export const ALGEBRAIC_Y_AXIS = ["1", "2", "3", "4", "5", "6", "7", "8"];

// prettier-ignore
export const starterPosition: Board = [
  { type: "r", color: "b" },
  { type: "k", color: "b" },
  { type: "b", color: "b" },
  { type: "q", color: "b" },
  { type: "K", color: "b" },
  { type: "b", color: "b" },
  { type: "k", color: "b" },
  { type: "r", color: "b" },
  { type: "p", color: "b" },
  { type: "p", color: "b" },
  { type: "p", color: "b" },
  { type: "p", color: "b" },
  { type: "p", color: "b" },
  { type: "p", color: "b" },
  { type: "p", color: "b" },
  { type: "p", color: "b" },
  null,null,null,null,null,null,null,null,
  null,null,null,null,null,null,null,null,
  null,null,null,null,null,null,null,null,
  null,null,null,null,null,null,null,null,
  { type: "p", color: "w" },
  { type: "p", color: "w" },
  { type: "p", color: "w" },
  { type: "p", color: "w" },
  { type: "p", color: "w" },
  { type: "p", color: "w" },
  { type: "p", color: "w" },
  { type: "p", color: "w" },
  { type: "r", color: "w" },
  { type: "k", color: "w" },
  { type: "b", color: "w" },
  { type: "q", color: "w" },
  { type: "K", color: "w" },
  { type: "b", color: "w" },
  { type: "k", color: "w" },
  { type: "r", color: "w" },
];

export interface Piece {
  readonly type: string;
  readonly color: string;
}

export interface Coordinate {
  readonly x: number;
  readonly y: number;
}

export type Board = (Piece | null)[];

export interface Move {
  from: Coordinate;
  to: Coordinate;
}

export interface GameState {
  readonly turn: string; // boolean?
  board: (Piece | null)[];
  readonly check: boolean;
  readonly finished: boolean;
  readonly stalemate: boolean;
  wLastMoveTime?: number; //for the server to set the game start time at last moment
  readonly bLastMoveTime?: number;
  readonly wTimeLeft: number;
  readonly bTimeLeft: number;
  readonly wCanCastle: boolean[];
  readonly bCanCastle: boolean[];

  // times ?: number; //timers??
}

const genericGameState: GameState = {
  board: [],
  turn: "X",
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

export const startingGameState: GameState = {
  board: starterPosition,
  turn: "w",
  check: false,
  finished: false,
  stalemate: false,
  wTimeLeft: STARTING_TIME,
  bTimeLeft: STARTING_TIME,
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
  diagonal: [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ],
  straight: [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ],
  knight: [
    [1, 2],
    [-1, 2],
    [1, -2],
    [-1, -2],
    [2, 1],
    [2, -1],
    [-2, 1],
    [-2, -1],
  ],
};

const correctPawnDirections = (
  directions: number[][],
  color: string
): number[][] => {
  return directions.filter(
    (tuple) =>
      (color === "b" && tuple[1] > 0) || (color === "w" && tuple[1] < 0)
  );
};

export const coordinateToAlgebraic = (coord: Coordinate) => {
  if (isOutOfBounds(coord)) {
    return "invalid move";
  }
  return ALGEBRAIC_X_AXIS[coord.x].concat(
    ALGEBRAIC_Y_AXIS[BOARD_SIZE - 1 - coord.y]
  );
};

const isOutOfBounds = (coords: Coordinate): boolean => {
  return (
    coords.x >= BOARD_SIZE ||
    coords.x < 0 ||
    coords.y >= BOARD_SIZE ||
    coords.y < 0
  );
};

export const getPiece = (
  coords: Coordinate,
  state: GameState
): Piece | null | undefined => {
  const { x, y } = coords;
  if (isOutOfBounds(coords)) {
    return undefined;
  }

  return state.board[x + y * BOARD_SIZE];
};

//checks if given player is in check
const isCheck = (state: GameState, player: string): boolean => {
  let king;
  let i = -1;
  while (!king) {
    i++; //so i is usable after loop
    const p = state.board[i];
    if (p === null) {
      continue;
    }
    king = p.color === player && p.type === "K" ? p : undefined;
  }
  const x = i % BOARD_SIZE;
  const y = Math.floor(i / BOARD_SIZE);
  //knight checks

  let threatCoords;
  for (const dir of directions.knight) {
    threatCoords = { x: x + dir[0], y: y + dir[1] };
    const threatningPiece = getPiece(threatCoords, state);
    if (
      threatningPiece &&
      threatningPiece !== null &&
      threatningPiece.color !== king.color &&
      threatningPiece.type === "k"
    ) {
      return true;
    }
  }

  for (const dir of directions.diagonal) {
    threatCoords = { x: x, y: y };
    while (true) {
      threatCoords = {
        x: threatCoords.x + dir[0],
        y: threatCoords.y + dir[1],
      };
      const p = getPiece(threatCoords, state);
      if (p === null) {
        continue;
      }
      if (!p) {
        break;
      }
      if (p.color !== king.color && (p.type === "b" || p.type === "q")) {
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
      threatCoords = {
        x: threatCoords.x + dir[0],
        y: threatCoords.y + dir[1],
      };
      const p = getPiece(threatCoords, state);
      if (p === null) {
        continue;
      }
      if (!p) {
        break;
      }
      if (p.color !== king.color && (p.type === "r" || p.type === "q")) {
        return true;
      }
      break;
    }
  }

  const pawnDirection = correctPawnDirections(directions.diagonal, state.turn);
  for (const dir of pawnDirection) {
    threatCoords = { x: x + dir[0], y: y + dir[1] };
    const threatningPiece = getPiece(threatCoords, state);
    if (
      threatningPiece &&
      threatningPiece !== null &&
      threatningPiece.color !== king.color &&
      threatningPiece.type === "p"
    ) {
      return true;
    }
  }

  //TODO: check with pawn and king
  return false;
};

//returns true if the given player has no allowed moves
const hasNoAllowedMoves = (state: GameState, player: string) => {
  const whitePieces = state.board
    .map((val, index) => {
      return {
        ...val,
        x: index % BOARD_SIZE,
        y: Math.floor(index / BOARD_SIZE),
      };
    })
    .filter((v) => v !== null && v.color === player);

  for (const p of whitePieces) {
    if (
      getAllowedMovesForPieceAtCoordinate({ x: p.x, y: p.y }, state).some(
        (b) => b
      )
    ) {
      return false;
    }
  }
  return true;
};

const pawnIsInStartingPosition = (
  coords: Coordinate,
  piece: Piece
): boolean => {
  return (
    (piece.color === "w" && coords.y === 6) ||
    (piece.color === "b" && coords.y === 1)
  );
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
const checkIfStepInDirectionAllowedForPiece = (
  coords: Coordinate,
  piece: Piece,
  state: GameState,
  direction: number[],
  movesRef: boolean[]
): Coordinate | null => {
  let newCoords = { ...coords };
  newCoords = {
    x: newCoords.x + direction[0],
    y: newCoords.y + direction[1],
  };
  if (isOutOfBounds(newCoords)) {
    return null;
  }

  const obstaclePiece = getPiece(newCoords, state);
  if (obstaclePiece && obstaclePiece !== null) {
    if (obstaclePiece.color === piece.color) {
      return null;
    }
    //pawn attacks on the front
    else if (piece.type === "p") {
      movesRef[newCoords.x + BOARD_SIZE * newCoords.y] = direction[0] !== 0;
      return null;
    } else {
      movesRef[newCoords.x + BOARD_SIZE * newCoords.y] = true;
      return null;
    }
  }
  if (piece.type === "p" && direction[0] !== 0) {
    return null;
  }

  movesRef[newCoords.x + BOARD_SIZE * newCoords.y] = true;
  return newCoords;
};

const checkAllowedMovesInDirectionForPiece = (
  maximumSteps: number,
  coords: Coordinate,
  piece: Piece,
  state: GameState,
  direction: number[],
  movesRef: boolean[]
): void => {
  let newCoords = { ...coords };
  for (let i = 0; i < maximumSteps; i++) {
    const nextCoords = checkIfStepInDirectionAllowedForPiece(
      newCoords,
      piece,
      state,
      direction,
      movesRef
    );
    if (nextCoords === null) {
      break;
    }
    newCoords = nextCoords;
  }
};

//get coordinates where king can move if doing a castle
const getAllowedCastleMovesForKingAtCoordinate = (
  coords: Coordinate,
  state: GameState
): Coordinate[] => {
  const allowedMovesCoords: Coordinate[] = [];
  const king = getPiece(coords, state)!;
  if (king.color === "b") {
    if (
      state.bCanCastle[0] &&
      !getPiece({ x: 3, y: 0 }, state) &&
      !getPiece({ x: 2, y: 0 }, state) &&
      !getPiece({ x: 1, y: 0 }, state)
    ) {
      allowedMovesCoords.push({ x: 2, y: 0 });
    }
    if (
      state.bCanCastle[1] &&
      !getPiece({ x: 5, y: 0 }, state) &&
      !getPiece({ x: 6, y: 0 }, state)
    ) {
      allowedMovesCoords.push({ x: 6, y: 0 });
    }
  } else {
    if (
      state.wCanCastle[0] &&
      !getPiece({ x: 3, y: 7 }, state) &&
      !getPiece({ x: 2, y: 7 }, state) &&
      !getPiece({ x: 1, y: 7 }, state)
    ) {
      allowedMovesCoords.push({ x: 2, y: 7 });
    }
    if (
      state.wCanCastle[1] &&
      !getPiece({ x: 5, y: 7 }, state) &&
      !getPiece({ x: 6, y: 7 }, state)
    ) {
      allowedMovesCoords.push({ x: 6, y: 7 });
    }
  }

  return allowedMovesCoords;
};

export const getAllowedMovesForPieceAtCoordinate = (
  coords: Coordinate,
  state: GameState
): boolean[] => {
  const piece = getPiece(coords, state);
  if (!piece || piece === null || piece.color !== state.turn) {
    return [];
  }

  const moves: boolean[] = new Array(BOARD_SIZE ** 2).fill(false);

  switch (piece.type) {
    case "k":
      for (const direction of [...directions.knight]) {
        checkAllowedMovesInDirectionForPiece(
          1,
          coords,
          piece,
          state,
          direction,
          moves
        );
      }
      break;
    case "K":
      for (const direction of [
        ...directions.diagonal,
        ...directions.straight,
      ]) {
        checkAllowedMovesInDirectionForPiece(
          1,
          coords,
          piece,
          state,
          direction,
          moves
        );
      }
      //get posible castle moves
      for (const c of getAllowedCastleMovesForKingAtCoordinate(coords, state)) {
        moves[c.x + BOARD_SIZE * c.y] = true;
      }
      break;
    case "p":
      //TODO: add en passant
      const pawnDirections = correctPawnDirections(
        [...directions.diagonal, ...directions.straight],
        piece.color
      );
      for (const direction of pawnDirections) {
        let newCoords = { ...coords };
        const numberOfMoves = pawnIsInStartingPosition(coords, piece) ? 2 : 1;
        checkAllowedMovesInDirectionForPiece(
          numberOfMoves,
          coords,
          piece,
          state,
          direction,
          moves
        );
      }
      break;
    case "b":
      for (const direction of directions.diagonal) {
        checkAllowedMovesInDirectionForPiece(
          Infinity,
          coords,
          piece,
          state,
          direction,
          moves
        );
      }
      break;
    case "r":
      for (const direction of directions.straight) {
        checkAllowedMovesInDirectionForPiece(
          Infinity,
          coords,
          piece,
          state,
          direction,
          moves
        );
      }
      break;
    case "q":
      for (const direction of [
        ...directions.diagonal,
        ...directions.straight,
      ]) {
        checkAllowedMovesInDirectionForPiece(
          Infinity,
          coords,
          piece,
          state,
          direction,
          moves
        );
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
    tempBoard[coords.x + BOARD_SIZE * coords.y] = null;
    tempBoard[index] = piece;
    // const tempState = {board: tempBoard, turn:state.turn, check:false, finished:false, stalemate:false}
    return !isCheck(
      { ...genericGameState, board: tempBoard, turn: state.turn },
      piece.color
    );
  });

  return movesWithoutSelfChecks;
};

//get a board but with the from piece in to's position
const getBoardWithMovedPiece = (
  { from, to }: Move,
  board: (Piece | null)[]
) => {
  const newBoard = [...board]; //how to typedef instead of this
  const piece = newBoard[from.x + BOARD_SIZE * from.y];
  newBoard[to.x + BOARD_SIZE * to.y] = piece;
  newBoard[from.x + BOARD_SIZE * from.y] = null;
  return newBoard;
};

export const getUpdateTimers = (state: GameState) => {
  let wNewTimeLeft = state.wTimeLeft;
  let bNewTimeLeft = state.bTimeLeft;
  let bNewLastMoveTime = state.bLastMoveTime ? state.bLastMoveTime : Date.now();
  let wNewLastMoveTime = state.wLastMoveTime;
  if (state.turn == "w") {
    wNewLastMoveTime = Date.now();
    wNewTimeLeft = wNewTimeLeft - (wNewLastMoveTime - bNewLastMoveTime!);
  } else {
    bNewLastMoveTime = Date.now();
    bNewTimeLeft = bNewTimeLeft - (bNewLastMoveTime - wNewLastMoveTime!);
  }

  return {
    wLastMoveTime: wNewLastMoveTime,
    bLastMoveTime: bNewLastMoveTime,
    wTimeLeft: Math.max(wNewTimeLeft, 0),
    bTimeLeft: Math.max(bNewTimeLeft, 0),
  };
};

/**
 * Moves a piece and returns the new game state
 *
 * @param from coordinate of the moving piece
 * @param to destination of the moving piece
 * @param state game state
 * @returns new game state after the move
 */
export const move = ({ from, to }: Move, state: GameState): GameState => {
  let newBoard = getBoardWithMovedPiece({ from, to }, state.board);
  // const newBoard = [...state.board]
  // const piece = newBoard[from.x + BOARD_SIZE*from.y];
  // newBoard[to.x + BOARD_SIZE*to.y] = piece;
  // newBoard[from.x + BOARD_SIZE*from.y] = null;
  const newTurn = state.turn === "w" ? "b" : "w";

  //get new timers

  let wCatsle = state.wCanCastle;
  let bCatsle = state.bCanCastle;

  //update castle permissions and move rook if
  if (from.x === 0 && from.y === 0) {
    bCatsle[0] = false;
  } else if (from.x === 7 && from.y === 0) {
    bCatsle[1] = false;
  } else if (from.x === 4 && from.y === 0) {
    bCatsle = [false, false];
    if (to.x === 2 && to.y === 0) {
      newBoard = getBoardWithMovedPiece(
        { to: { x: 0, y: 0 }, from: { x: 3, y: 0 } },
        newBoard
      );
    } else if (to.x === 6 && to.y === 0) {
      newBoard = getBoardWithMovedPiece(
        { from: { x: 7, y: 0 }, to: { x: 5, y: 0 } },
        newBoard
      );
    }
  }
  if (from.x === 0 && from.y === 7) {
    wCatsle[0] = false;
  } else if (from.x === 7 && from.y === 7) {
    wCatsle[1] = false;
  } else if (from.x === 4 && from.y === 7) {
    wCatsle = [false, false];
    if (to.x === 2 && to.y === 7) {
      newBoard = getBoardWithMovedPiece(
        { from: { x: 0, y: 7 }, to: { x: 3, y: 7 } },
        newBoard
      );
    } else if (to.x === 6 && to.y === 7) {
      newBoard = getBoardWithMovedPiece(
        { from: { x: 7, y: 7 }, to: { x: 5, y: 7 } },
        newBoard
      );
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
    ...getUpdateTimers(state),
    wCanCastle: wCatsle,
    bCanCastle: bCatsle,
  };
};
