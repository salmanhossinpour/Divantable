import type { ChessMove, ChessPiece, ChessPieceKind, ChessState, PlayerSeat } from './types.ts';

function createInitialChessBoard(): (ChessPiece | null)[][] {
  const board: (ChessPiece | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
  const backRank: ChessPieceKind[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];

  for (let c = 0; c < 8; c++) {
    board[0][c] = { id: `b-${backRank[c]}-${c}`, owner: 1, kind: backRank[c] };
    board[1][c] = { id: `b-p-${c}`, owner: 1, kind: 'p' };
    board[6][c] = { id: `w-p-${c}`, owner: 0, kind: 'p' };
    board[7][c] = { id: `w-${backRank[c]}-${c}`, owner: 0, kind: backRank[c] };
  }
  return board;
}

function cloneBoard(board: (ChessPiece | null)[][]): (ChessPiece | null)[][] {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function isInside(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function findKing(board: (ChessPiece | null)[][], owner: 0 | 1): [number, number] | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.owner === owner && p.kind === 'k') return [r, c];
    }
  }
  return null;
}

export function isSquareAttacked(
  board: (ChessPiece | null)[][],
  targetRow: number,
  targetCol: number,
  attacker: 0 | 1
): boolean {
  // Pawn attacks
  const pawnSourceRow = attacker === 0 ? targetRow + 1 : targetRow - 1;
  for (const dc of [-1, 1]) {
    const c = targetCol + dc;
    if (isInside(pawnSourceRow, c)) {
      const p = board[pawnSourceRow][c];
      if (p && p.owner === attacker && p.kind === 'p') return true;
    }
  }

  // Knight attacks
  const knightDeltas = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];
  for (const [dr, dc] of knightDeltas) {
    const r = targetRow + dr;
    const c = targetCol + dc;
    if (isInside(r, c)) {
      const p = board[r][c];
      if (p && p.owner === attacker && p.kind === 'n') return true;
    }
  }

  // King attacks
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = targetRow + dr;
      const c = targetCol + dc;
      if (isInside(r, c)) {
        const p = board[r][c];
        if (p && p.owner === attacker && p.kind === 'k') return true;
      }
    }
  }

  // Orthogonal (rook / queen)
  const ortho = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of ortho) {
    let r = targetRow + dr;
    let c = targetCol + dc;
    while (isInside(r, c)) {
      const p = board[r][c];
      if (p) {
        if (p.owner === attacker && (p.kind === 'r' || p.kind === 'q')) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  // Diagonal (bishop / queen)
  const diag = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [dr, dc] of diag) {
    let r = targetRow + dr;
    let c = targetCol + dc;
    while (isInside(r, c)) {
      const p = board[r][c];
      if (p) {
        if (p.owner === attacker && (p.kind === 'b' || p.kind === 'q')) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  return false;
}

function isKingInCheck(board: (ChessPiece | null)[][], owner: 0 | 1): boolean {
  const k = findKing(board, owner);
  if (!k) return false;
  return isSquareAttacked(board, k[0], k[1], owner === 0 ? 1 : 0);
}

function applyMoveOnBoard(board: (ChessPiece | null)[][], move: ChessMove): (ChessPiece | null)[][] {
  const next = cloneBoard(board);
  const piece = next[move.fromRow][move.fromCol];
  if (!piece) return next;

  next[move.fromRow][move.fromCol] = null;

  if (move.isEnPassant) {
    next[move.fromRow][move.toCol] = null;
  }

  if (move.isCastle) {
    const row = move.fromRow;
    if (move.isCastle === 'king') {
      next[row][5] = next[row][7];
      next[row][7] = null;
    } else {
      next[row][3] = next[row][0];
      next[row][0] = null;
    }
  }

  next[move.toRow][move.toCol] = move.promotion
    ? { id: piece.id, owner: piece.owner, kind: move.promotion }
    : piece;

  return next;
}

function generatePseudoMoves(
  board: (ChessPiece | null)[][],
  turn: 0 | 1,
  castling: ChessState['castling'],
  enPassant: [number, number] | null
): ChessMove[] {
  const moves: ChessMove[] = [];
  const opponent: 0 | 1 = turn === 0 ? 1 : 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.owner !== turn) continue;

      if (p.kind === 'p') {
        const dir = turn === 0 ? -1 : 1;
        const startRow = turn === 0 ? 6 : 1;
        const promoRow = turn === 0 ? 0 : 7;

        const r1 = r + dir;
        if (isInside(r1, c) && !board[r1][c]) {
          moves.push({
            fromRow: r,
            fromCol: c,
            toRow: r1,
            toCol: c,
            promotion: r1 === promoRow ? 'q' : undefined,
          });
          const r2 = r + dir * 2;
          if (r === startRow && isInside(r2, c) && !board[r2][c]) {
            moves.push({ fromRow: r, fromCol: c, toRow: r2, toCol: c });
          }
        }

        for (const dc of [-1, 1]) {
          const nc = c + dc;
          if (!isInside(r1, nc)) continue;
          const target = board[r1][nc];
          if (target && target.owner === opponent) {
            moves.push({
              fromRow: r,
              fromCol: c,
              toRow: r1,
              toCol: nc,
              promotion: r1 === promoRow ? 'q' : undefined,
            });
          } else if (enPassant && enPassant[0] === r1 && enPassant[1] === nc) {
            moves.push({
              fromRow: r,
              fromCol: c,
              toRow: r1,
              toCol: nc,
              isEnPassant: true,
            });
          }
        }
      } else if (p.kind === 'n') {
        const deltas = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
        for (const [dr, dc] of deltas) {
          const nr = r + dr;
          const nc = c + dc;
          if (!isInside(nr, nc)) continue;
          const target = board[nr][nc];
          if (!target || target.owner === opponent) {
            moves.push({ fromRow: r, fromCol: c, toRow: nr, toCol: nc });
          }
        }
      } else if (p.kind === 'b' || p.kind === 'r' || p.kind === 'q') {
        const dirs: [number, number][] = [];
        if (p.kind === 'b' || p.kind === 'q') dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
        if (p.kind === 'r' || p.kind === 'q') dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
        for (const [dr, dc] of dirs) {
          let nr = r + dr;
          let nc = c + dc;
          while (isInside(nr, nc)) {
            const target = board[nr][nc];
            if (!target) {
              moves.push({ fromRow: r, fromCol: c, toRow: nr, toCol: nc });
            } else {
              if (target.owner === opponent) {
                moves.push({ fromRow: r, fromCol: c, toRow: nr, toCol: nc });
              }
              break;
            }
            nr += dr;
            nc += dc;
          }
        }
      } else if (p.kind === 'k') {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (!isInside(nr, nc)) continue;
            const target = board[nr][nc];
            if (!target || target.owner === opponent) {
              moves.push({ fromRow: r, fromCol: c, toRow: nr, toCol: nc });
            }
          }
        }

        // Castling
        const homeRow = turn === 0 ? 7 : 0;
        if (r === homeRow && c === 4 && !isSquareAttacked(board, homeRow, 4, opponent)) {
          const canK = turn === 0 ? castling.wK : castling.bK;
          const canQ = turn === 0 ? castling.wQ : castling.bQ;
          if (
            canK &&
            !board[homeRow][5] &&
            !board[homeRow][6] &&
            board[homeRow][7]?.kind === 'r' &&
            board[homeRow][7]?.owner === turn &&
            !isSquareAttacked(board, homeRow, 5, opponent) &&
            !isSquareAttacked(board, homeRow, 6, opponent)
          ) {
            moves.push({ fromRow: homeRow, fromCol: 4, toRow: homeRow, toCol: 6, isCastle: 'king' });
          }
          if (
            canQ &&
            !board[homeRow][3] &&
            !board[homeRow][2] &&
            !board[homeRow][1] &&
            board[homeRow][0]?.kind === 'r' &&
            board[homeRow][0]?.owner === turn &&
            !isSquareAttacked(board, homeRow, 3, opponent) &&
            !isSquareAttacked(board, homeRow, 2, opponent)
          ) {
            moves.push({ fromRow: homeRow, fromCol: 4, toRow: homeRow, toCol: 2, isCastle: 'queen' });
          }
        }
      }
    }
  }

  return moves;
}

export function computeLegalChessMoves(
  board: (ChessPiece | null)[][],
  turn: 0 | 1,
  castling: ChessState['castling'],
  enPassant: [number, number] | null
): ChessMove[] {
  const pseudo = generatePseudoMoves(board, turn, castling, enPassant);
  return pseudo.filter((m) => {
    const nextBoard = applyMoveOnBoard(board, m);
    return !isKingInCheck(nextBoard, turn);
  });
}

export function createChessState(players: PlayerSeat[]): ChessState {
  const p2 = players.slice(0, 2);
  const board = createInitialChessBoard();
  const castling = { wK: true, wQ: true, bK: true, bQ: true };
  const legalMoves = computeLegalChessMoves(board, 0, castling, null);

  return {
    gameType: 'chess',
    players: p2,
    board,
    turnIndex: 0,
    phase: 'move',
    castling,
    enPassant: null,
    inCheck: false,
    legalMoves,
    winnerIndex: null,
    isDraw: false,
    lastMove: null,
    lastEvent: `نوبت ${p2[0]?.name ?? 'سفید'} است. مهره‌ای را حرکت دهید.`,
    turnCount: 1,
  };
}

export function applyChessMove(
  state: ChessState,
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number
): { state: ChessState; captured: boolean } {
  if (state.phase !== 'move') return { state, captured: false };

  const move = state.legalMoves.find(
    (m) => m.fromRow === fromRow && m.fromCol === fromCol && m.toRow === toRow && m.toCol === toCol
  );
  if (!move) return { state, captured: false };

  const piece = state.board[fromRow][fromCol]!;
  const target = state.board[toRow][toCol];
  const captured = Boolean(target) || Boolean(move.isEnPassant);
  const nextBoard = applyMoveOnBoard(state.board, move);

  // Update castling flags
  const nextCastling = { ...state.castling };
  if (piece.kind === 'k') {
    if (piece.owner === 0) {
      nextCastling.wK = false;
      nextCastling.wQ = false;
    } else {
      nextCastling.bK = false;
      nextCastling.bQ = false;
    }
  }
  if (piece.kind === 'r') {
    if (fromRow === 7 && fromCol === 7) nextCastling.wK = false;
    if (fromRow === 7 && fromCol === 0) nextCastling.wQ = false;
    if (fromRow === 0 && fromCol === 7) nextCastling.bK = false;
    if (fromRow === 0 && fromCol === 0) nextCastling.bQ = false;
  }
  if (toRow === 7 && toCol === 7) nextCastling.wK = false;
  if (toRow === 7 && toCol === 0) nextCastling.wQ = false;
  if (toRow === 0 && toCol === 7) nextCastling.bK = false;
  if (toRow === 0 && toCol === 0) nextCastling.bQ = false;

  const nextEnPassant: [number, number] | null =
    piece.kind === 'p' && Math.abs(toRow - fromRow) === 2
      ? [(fromRow + toRow) / 2, fromCol]
      : null;

  const nextTurn: 0 | 1 = state.turnIndex === 0 ? 1 : 0;
  const nextLegal = computeLegalChessMoves(nextBoard, nextTurn, nextCastling, nextEnPassant);
  const inCheck = isKingInCheck(nextBoard, nextTurn);
  const moverName = state.players[state.turnIndex].name;
  const nextName = state.players[nextTurn].name;

  if (nextLegal.length === 0) {
    if (inCheck) {
      return {
        state: {
          ...state,
          board: nextBoard,
          castling: nextCastling,
          enPassant: nextEnPassant,
          inCheck: true,
          legalMoves: [],
          phase: 'finished',
          winnerIndex: state.turnIndex,
          isDraw: false,
          lastMove: { fromRow, fromCol, toRow, toCol },
          lastEvent: `کیش و مات! ${moverName} برنده شطرنج شد!`,
        },
        captured,
      };
    } else {
      return {
        state: {
          ...state,
          board: nextBoard,
          castling: nextCastling,
          enPassant: nextEnPassant,
          inCheck: false,
          legalMoves: [],
          phase: 'finished',
          winnerIndex: null,
          isDraw: true,
          lastMove: { fromRow, fromCol, toRow, toCol },
          lastEvent: 'پات! بازی شطرنج با تساوی پایان یافت.',
        },
        captured,
      };
    }
  }

  return {
    state: {
      ...state,
      board: nextBoard,
      turnIndex: nextTurn,
      castling: nextCastling,
      enPassant: nextEnPassant,
      inCheck,
      legalMoves: nextLegal,
      lastMove: { fromRow, fromCol, toRow, toCol },
      turnCount: state.turnCount + 1,
      lastEvent: inCheck
        ? `${moverName} کیش داد! نوبت ${nextName}.`
        : `${moverName} حرکت کرد. نوبت ${nextName}.`,
    },
    captured,
  };
}

const PIECE_VALUES: Record<ChessPieceKind, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

function evaluateChessBoard(board: (ChessPiece | null)[][], aiOwner: 0 | 1): number {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const centerBonus = (3.5 - Math.abs(c - 3.5)) * 6 + (3.5 - Math.abs(r - 3.5)) * 6;
      const val = PIECE_VALUES[p.kind] + (p.kind !== 'k' ? centerBonus : 0);
      score += p.owner === aiOwner ? val : -val;
    }
  }
  return score;
}

export function chooseChessAIMove(state: ChessState): ChessMove | null {
  if (state.legalMoves.length === 0) return null;
  const aiTurn = state.turnIndex;
  const opp: 0 | 1 = aiTurn === 0 ? 1 : 0;

  let bestMove = state.legalMoves[0];
  let bestScore = -Infinity;

  for (const m of state.legalMoves) {
    const b1 = applyMoveOnBoard(state.board, m);
    const oppMoves = computeLegalChessMoves(b1, opp, state.castling, null);
    let worstReply = Infinity;

    if (oppMoves.length === 0) {
      worstReply = isKingInCheck(b1, opp) ? 99999 : 0;
    } else {
      // Sample top aggressive replies (captures/checks) + fast baseline for instant AI response
      const sortedOpp = oppMoves.slice(0, 18);
      for (const om of sortedOpp) {
        const b2 = applyMoveOnBoard(b1, om);
        const s = evaluateChessBoard(b2, aiTurn);
        if (s < worstReply) worstReply = s;
      }
    }

    const jitter = Math.random() * 4;
    if (worstReply + jitter > bestScore) {
      bestScore = worstReply + jitter;
      bestMove = m;
    }
  }

  return bestMove;
}
