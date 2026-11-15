import type { CheckersMove, CheckersPiece, CheckersState, PlayerSeat } from './types.ts';

function createInitialCheckersBoard(): (CheckersPiece | null)[][] {
  const board: (CheckersPiece | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
  let id0 = 0;
  let id1 = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 !== 1) continue;
      if (r < 3) {
        board[r][c] = { id: `ck-1-${id1++}`, owner: 1, isKing: false };
      } else if (r > 4) {
        board[r][c] = { id: `ck-0-${id0++}`, owner: 0, isKing: false };
      }
    }
  }
  return board;
}

function isInside(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

export function getCheckersCapturesForPiece(
  board: (CheckersPiece | null)[][],
  r: number,
  c: number
): CheckersMove[] {
  const piece = board[r][c];
  if (!piece) return [];

  const dirs = piece.isKing
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : piece.owner === 0
    ? [[-1, -1], [-1, 1]]
    : [[1, -1], [1, 1]];

  const moves: CheckersMove[] = [];
  for (const [dr, dc] of dirs) {
    const mr = r + dr;
    const mc = c + dc;
    const tr = r + dr * 2;
    const tc = c + dc * 2;
    if (!isInside(tr, tc)) continue;
    const mid = board[mr][mc];
    if (mid && mid.owner !== piece.owner && !board[tr][tc]) {
      moves.push({
        fromRow: r,
        fromCol: c,
        toRow: tr,
        toCol: tc,
        captured: [mr, mc],
      });
    }
  }
  return moves;
}

export function computeCheckersLegalMoves(
  board: (CheckersPiece | null)[][],
  turn: 0 | 1,
  mustJumpFrom: [number, number] | null
): CheckersMove[] {
  if (mustJumpFrom) {
    return getCheckersCapturesForPiece(board, mustJumpFrom[0], mustJumpFrom[1]);
  }

  const captures: CheckersMove[] = [];
  const simples: CheckersMove[] = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.owner !== turn) continue;

      const pieceCaps = getCheckersCapturesForPiece(board, r, c);
      if (pieceCaps.length > 0) {
        captures.push(...pieceCaps);
      }

      if (captures.length === 0) {
        const dirs = piece.isKing
          ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
          : piece.owner === 0
          ? [[-1, -1], [-1, 1]]
          : [[1, -1], [1, 1]];

        for (const [dr, dc] of dirs) {
          const tr = r + dr;
          const tc = c + dc;
          if (isInside(tr, tc) && !board[tr][tc]) {
            simples.push({ fromRow: r, fromCol: c, toRow: tr, toCol: tc });
          }
        }
      }
    }
  }

  return captures.length > 0 ? captures : simples;
}

export function createCheckersState(players: PlayerSeat[]): CheckersState {
  const p2 = players.slice(0, 2);
  const board = createInitialCheckersBoard();
  const legalMoves = computeCheckersLegalMoves(board, 0, null);

  return {
    gameType: 'checkers',
    players: p2,
    board,
    turnIndex: 0,
    phase: 'move',
    mustJumpFrom: null,
    legalMoves,
    winnerIndex: null,
    lastEvent: `نوبت ${p2[0]?.name ?? 'عاجی'} است. مهره‌ای را مورب حرکت دهید.`,
    turnCount: 1,
  };
}

export function applyCheckersMove(
  state: CheckersState,
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number
): { state: CheckersState; captured: boolean } {
  if (state.phase !== 'move') return { state, captured: false };

  const move = state.legalMoves.find(
    (m) => m.fromRow === fromRow && m.fromCol === fromCol && m.toRow === toRow && m.toCol === toCol
  );
  if (!move) return { state, captured: false };

  const nextBoard = state.board.map((r) => r.map((c) => (c ? { ...c } : null)));
  const piece = nextBoard[fromRow][fromCol]!;
  nextBoard[fromRow][fromCol] = null;

  let promotedNow = false;
  if (!piece.isKing) {
    if ((piece.owner === 0 && toRow === 0) || (piece.owner === 1 && toRow === 7)) {
      piece.isKing = true;
      promotedNow = true;
    }
  }
  nextBoard[toRow][toCol] = piece;

  let wasCapture = false;
  if (move.captured) {
    nextBoard[move.captured[0]][move.captured[1]] = null;
    wasCapture = true;
  }

  const moverName = state.players[state.turnIndex].name;

  // Multi-jump continuation if a piece captured and wasn't just crowned
  if (wasCapture && !promotedNow) {
    const chainJumps = getCheckersCapturesForPiece(nextBoard, toRow, toCol);
    if (chainJumps.length > 0) {
      return {
        state: {
          ...state,
          board: nextBoard,
          mustJumpFrom: [toRow, toCol],
          legalMoves: chainJumps,
          lastEvent: `${moverName} مهره‌ای را زد! پرش بعدی را ادامه دهید.`,
        },
        captured: true,
      };
    }
  }

  const nextTurn: 0 | 1 = state.turnIndex === 0 ? 1 : 0;
  const nextName = state.players[nextTurn].name;
  const nextLegal = computeCheckersLegalMoves(nextBoard, nextTurn, null);

  // Win check: opponent has 0 pieces or 0 legal moves
  let oppPieces = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (nextBoard[r][c]?.owner === nextTurn) oppPieces++;
    }
  }

  if (oppPieces === 0 || nextLegal.length === 0) {
    return {
      state: {
        ...state,
        board: nextBoard,
        mustJumpFrom: null,
        legalMoves: [],
        phase: 'finished',
        winnerIndex: state.turnIndex,
        lastEvent: `${moverName} برنده چکرز شد!`,
      },
      captured: wasCapture,
    };
  }

  return {
    state: {
      ...state,
      board: nextBoard,
      turnIndex: nextTurn,
      mustJumpFrom: null,
      legalMoves: nextLegal,
      turnCount: state.turnCount + 1,
      lastEvent: wasCapture
        ? `${moverName} مهره حریف را زد! نوبت ${nextName}.`
        : `${moverName} حرکت کرد. نوبت ${nextName}.`,
    },
    captured: wasCapture,
  };
}

export function chooseCheckersAIMove(state: CheckersState): CheckersMove | null {
  if (state.legalMoves.length === 0) return null;
  const ai = state.turnIndex;

  let best = state.legalMoves[0];
  let bestScore = -Infinity;

  for (const m of state.legalMoves) {
    let score = Math.random() * 2;
    if (m.captured) score += 25;
    if ((ai === 0 && m.toRow === 0) || (ai === 1 && m.toRow === 7)) score += 18;
    // Center control bonus
    score += (3.5 - Math.abs(m.toCol - 3.5)) * 1.5;

    // Slight penalty if landing adjacent to opponent who could jump next
    const sim = applyCheckersMove(state, m.fromRow, m.fromCol, m.toRow, m.toCol).state;
    if (sim.turnIndex !== ai && sim.legalMoves.some((om) => Boolean(om.captured))) {
      score -= 14;
    }

    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}
