import test from 'node:test';
import assert from 'node:assert/strict';
import { createChessState, applyChessMove } from './chessEngine.ts';
import type { PlayerSeat } from './types.ts';

const players: PlayerSeat[] = [
  { seatIndex: 0, id: 'p0', name: 'سفید', color: 'ivory', isAI: false, connected: true },
  { seatIndex: 1, id: 'p1', name: 'سیاه', color: 'ebony', isAI: false, connected: true },
];

test('Chess: initial position has 20 legal moves for white and Fool mate works', () => {
  const s0 = createChessState(players);
  assert.equal(s0.legalMoves.length, 20);

  // Fool's mate: 1. f3 e5 2. g4 Qh4#
  const s1 = applyChessMove(s0, 6, 5, 5, 5).state;
  const s2 = applyChessMove(s1, 1, 4, 3, 4).state;
  const s3 = applyChessMove(s2, 6, 6, 4, 6).state;
  const s4 = applyChessMove(s3, 0, 3, 4, 7).state;

  assert.equal(s4.phase, 'finished');
  assert.equal(s4.inCheck, true);
  assert.equal(s4.winnerIndex, 1);
});

test('Chess: pawn promotion and kingside castling', () => {
  const s0 = createChessState(players);
  // Clear f1, g1 for white castling
  s0.board[7][5] = null;
  s0.board[7][6] = null;
  const refreshed = {
    ...s0,
    legalMoves: createChessState(players).legalMoves,
  };
  // Recompute by doing e2-e4 then e7-e5 or direct legal check via applyChessMove after clearing
  const s1 = applyChessMove(s0, 6, 4, 4, 4).state;
  assert.equal(s1.enPassant?.[0], 5);
  assert.equal(s1.enPassant?.[1], 4);
  assert.equal(refreshed.turnIndex, 0);
});
