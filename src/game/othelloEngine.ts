import type { OthelloState, PlayerSeat } from './types.ts';

const DIRS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

function createInitialOthelloBoard(): (0 | 1 | null)[][] {
  const board: (0 | 1 | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
  board[3][3] = 0;
  board[4][4] = 0;
  board[3][4] = 1;
  board[4][3] = 1;
  return board;
}

export function getOthelloFlips(
  board: (0 | 1 | null)[][],
  row: number,
  col: number,
  player: 0 | 1
): [number, number][] {
  if (board[row][col] !== null) return [];
  const opp: 0 | 1 = player === 0 ? 1 : 0;
  const flips: [number, number][] = [];

  for (const [dr, dc] of DIRS) {
    const line: [number, number][] = [];
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const cell = board[r][c];
      if (cell === opp) {
        line.push([r, c]);
      } else if (cell === player) {
        if (line.length > 0) flips.push(...line);
        break;
      } else {
        break;
      }
      r += dr;
      c += dc;
    }
  }
  return flips;
}

export function computeOthelloLegalMoves(board: (0 | 1 | null)[][], player: 0 | 1): [number, number][] {
  const moves: [number, number][] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (getOthelloFlips(board, r, c, player).length > 0) {
        moves.push([r, c]);
      }
    }
  }
  return moves;
}

function countOthelloScores(board: (0 | 1 | null)[][]): [number, number] {
  let s0 = 0;
  let s1 = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === 0) s0++;
      else if (board[r][c] === 1) s1++;
    }
  }
  return [s0, s1];
}

export function createOthelloState(players: PlayerSeat[]): OthelloState {
  const p2 = players.slice(0, 2);
  const board = createInitialOthelloBoard();
  const legalMoves = computeOthelloLegalMoves(board, 0);

  return {
    gameType: 'othello',
    players: p2,
    board,
    turnIndex: 0,
    phase: 'move',
    legalMoves,
    scores: [2, 2],
    winnerIndex: null,
    isDraw: false,
    lastMove: null,
    lastEvent: `نوبت ${p2[0]?.name ?? 'عاجی'} است. یک خانه مجاز انتخاب کنید.`,
    turnCount: 1,
  };
}

export function applyOthelloMove(state: OthelloState, row: number, col: number): { state: OthelloState; flipped: number } {
  if (state.phase !== 'move') return { state, flipped: 0 };
  const flips = getOthelloFlips(state.board, row, col, state.turnIndex);
  if (flips.length === 0) return { state, flipped: 0 };

  const nextBoard = state.board.map((r) => [...r]);
  nextBoard[row][col] = state.turnIndex;
  for (const [fr, fc] of flips) {
    nextBoard[fr][fc] = state.turnIndex;
  }

  const scores = countOthelloScores(nextBoard);
  const nextTurn: 0 | 1 = state.turnIndex === 0 ? 1 : 0;
  const nextMoves = computeOthelloLegalMoves(nextBoard, nextTurn);

  if (nextMoves.length > 0) {
    return {
      state: {
        ...state,
        board: nextBoard,
        turnIndex: nextTurn,
        legalMoves: nextMoves,
        scores,
        lastMove: [row, col],
        turnCount: state.turnCount + 1,
        lastEvent: `${state.players[state.turnIndex].name} ${flips.length} مهره را برگرداند! نوبت ${state.players[nextTurn].name}.`,
      },
      flipped: flips.length,
    };
  }

  // Opponent has no moves — check if current player can move again
  const sameMoves = computeOthelloLegalMoves(nextBoard, state.turnIndex);
  if (sameMoves.length > 0) {
    return {
      state: {
        ...state,
        board: nextBoard,
        turnIndex: state.turnIndex,
        legalMoves: sameMoves,
        scores,
        lastMove: [row, col],
        turnCount: state.turnCount + 1,
        lastEvent: `${state.players[nextTurn].name} حرکتی ندارد! نوبت مجدد برای ${state.players[state.turnIndex].name}.`,
      },
      flipped: flips.length,
    };
  }

  // Neither player can move -> Game Over
  const isDraw = scores[0] === scores[1];
  const winnerIndex: 0 | 1 | null = isDraw ? null : scores[0] > scores[1] ? 0 : 1;
  return {
    state: {
      ...state,
      board: nextBoard,
      legalMoves: [],
      scores,
      phase: 'finished',
      winnerIndex,
      isDraw,
      lastMove: [row, col],
      lastEvent: isDraw
        ? `تساوی ${scores[0]} به ${scores[1]}!`
        : `${state.players[winnerIndex!].name} با امتیاز ${Math.max(scores[0], scores[1])} برنده اتللو شد!`,
    },
    flipped: flips.length,
  };
}

const OTHELLO_WEIGHTS = [
  [120, -25, 20, 8, 8, 20, -25, 120],
  [-25, -45, -5, -5, -5, -5, -45, -25],
  [20, -5, 15, 3, 3, 15, -5, 20],
  [8, -5, 3, 3, 3, 3, -5, 8],
  [8, -5, 3, 3, 3, 3, -5, 8],
  [20, -5, 15, 3, 3, 15, -5, 20],
  [-25, -45, -5, -5, -5, -5, -45, -25],
  [120, -25, 20, 8, 8, 20, -25, 120],
];

export function chooseOthelloAIMove(state: OthelloState): [number, number] | null {
  if (state.legalMoves.length === 0) return null;
  let best = state.legalMoves[0];
  let bestScore = -Infinity;

  for (const [r, c] of state.legalMoves) {
    const flips = getOthelloFlips(state.board, r, c, state.turnIndex);
    const score = OTHELLO_WEIGHTS[r][c] + flips.length * 3 + Math.random() * 2;
    if (score > bestScore) {
      bestScore = score;
      best = [r, c];
    }
  }
  return best;
}
