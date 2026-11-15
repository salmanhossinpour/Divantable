import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCheckersMove, createCheckersState } from './checkersEngine.ts';
import type { PlayerSeat } from './types.ts';

const seats: PlayerSeat[] = [
  { seatIndex: 0, id: 'p0', name: 'عاجی', color: 'ivory', isAI: false, connected: true },
  { seatIndex: 1, id: 'p1', name: 'آبنوس', color: 'ebony', isAI: false, connected: true },
];

test('Checkers: starts with 12 pieces each and enforces mandatory capture', () => {
  let state = createCheckersState(seats);
  assert.equal(state.legalMoves.length, 7);

  // Move P0 (5,0)->(4,1), then P1 (2,3)->(3,2)
  state = applyCheckersMove(state, 5, 0, 4, 1).state;
  state = applyCheckersMove(state, 2, 3, 3, 2).state;

  // Now P0 (4,1) can capture P1 (3,2) -> (2,3), so all legal moves must be captures
  assert.ok(state.legalMoves.some((m) => m.fromRow === 4 && m.fromCol === 1 && m.toRow === 2 && m.toCol === 3));
  assert.ok(state.legalMoves.every((m) => Boolean(m.captured)));

  const res = applyCheckersMove(state, 4, 1, 2, 3);
  assert.equal(res.captured, true);
  assert.equal(res.state.board[3][2], null);
});
