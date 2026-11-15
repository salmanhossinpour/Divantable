import type { Connect4State, PlayerSeat } from './types.ts';

export const C4_ROWS = 6;
export const C4_COLS = 7;

export function createConnect4State(players: PlayerSeat[]): Connect4State {
  const p2 = players.slice(0, 2);
  return {
    gameType: 'connect4',
    players: p2,
    board: Array.from({ length: C4_ROWS }, () => Array(C4_COLS).fill(null)),
    turnIndex: 0,
    phase: 'move',
    winnerIndex: null,
    isDraw: false,
    winningCells: [],
    lastMove: null,
    lastEvent: `نوبت ${p2[0]?.name ?? 'قرمز'} است. یک ستون انتخاب کنید.`,
    turnCount: 1,
  };
}

function findConnect4Win(board: (0 | 1 | null)[][], player: 0 | 1): [number, number][] {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c < C4_COLS; c++) {
      if (board[r][c] !== player) continue;
      for (const [dr, dc] of dirs) {
        const line: [number, number][] = [[r, c]];
        for (let k = 1; k < 4; k++) {
          const nr = r + dr * k;
          const nc = c + dc * k;
          if (nr < 0 || nr >= C4_ROWS || nc < 0 || nc >= C4_COLS || board[nr][nc] !== player) {
            break;
          }
          line.push([nr, nc]);
        }
        if (line.length === 4) return line;
      }
    }
  }
  return [];
}

export function getAvailableConnect4Row(board: (0 | 1 | null)[][], col: number): number {
  if (col < 0 || col >= C4_COLS) return -1;
  for (let r = C4_ROWS - 1; r >= 0; r--) {
    if (board[r][col] === null) return r;
  }
  return -1;
}

export function dropConnect4Token(state: Connect4State, col: number): Connect4State {
  if (state.phase !== 'move') return state;
  const row = getAvailableConnect4Row(state.board, col);
  if (row === -1) return state;

  const nextBoard = state.board.map((r) => [...r]);
  nextBoard[row][col] = state.turnIndex;

  const winningCells = findConnect4Win(nextBoard, state.turnIndex);
  if (winningCells.length === 4) {
    return {
      ...state,
      board: nextBoard,
      phase: 'finished',
      winnerIndex: state.turnIndex,
      winningCells,
      lastMove: [row, col],
      lastEvent: `${state.players[state.turnIndex].name} ۴ مهره را در یک ردیف چید و برنده شد!`,
    };
  }

  const isBoardFull = nextBoard[0].every((cell) => cell !== null);
  if (isBoardFull) {
    return {
      ...state,
      board: nextBoard,
      phase: 'finished',
      winnerIndex: null,
      isDraw: true,
      lastMove: [row, col],
      lastEvent: 'صفحه پر شد! بازی ۴ در ردیف مساوی شد.',
    };
  }

  const nextTurn: 0 | 1 = state.turnIndex === 0 ? 1 : 0;
  return {
    ...state,
    board: nextBoard,
    turnIndex: nextTurn,
    lastMove: [row, col],
    turnCount: state.turnCount + 1,
    lastEvent: `${state.players[state.turnIndex].name} مهره را در ستون ${col + 1} انداخت. نوبت ${state.players[nextTurn].name}.`,
  };
}

export function chooseConnect4AICol(state: Connect4State): number | null {
  const ai = state.turnIndex;
  const opp: 0 | 1 = ai === 0 ? 1 : 0;
  const validCols: number[] = [];
  for (let c = 0; c < C4_COLS; c++) {
    if (getAvailableConnect4Row(state.board, c) !== -1) validCols.push(c);
  }
  if (validCols.length === 0) return null;

  // 1. Immediate win
  for (const c of validCols) {
    const r = getAvailableConnect4Row(state.board, c);
    const b = state.board.map((row) => [...row]);
    b[r][c] = ai;
    if (findConnect4Win(b, ai).length === 4) return c;
  }

  // 2. Block immediate opponent win
  for (const c of validCols) {
    const r = getAvailableConnect4Row(state.board, c);
    const b = state.board.map((row) => [...row]);
    b[r][c] = opp;
    if (findConnect4Win(b, opp).length === 4) return c;
  }

  // 3. Center preference + avoid setting up opponent win directly above
  let bestCol = validCols[0];
  let bestScore = -Infinity;
  for (const c of validCols) {
    const r = getAvailableConnect4Row(state.board, c);
    let score = 10 - Math.abs(c - 3) * 2.5 + Math.random();
    if (r > 0) {
      const b = state.board.map((row) => [...row]);
      b[r][c] = ai;
      b[r - 1][c] = opp;
      if (findConnect4Win(b, opp).length === 4) score -= 50;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCol = c;
    }
  }
  return bestCol;
}
