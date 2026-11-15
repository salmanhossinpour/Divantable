import test from 'node:test';
import assert from 'node:assert/strict';
import { createOthelloState, applyOthelloMove } from './othelloEngine.ts';
import type { PlayerSeat } from './types.ts';

const players: PlayerSeat[] = [
  { seatIndex: 0, id: 'p0', name: 'عاجی', color: 'ivory', isAI: false, connected: true },
  { seatIndex: 1, id: 'p1', name: 'آبنوس', color: 'ebony', isAI: false, connected: true },
];

test('Othello: starts 2-2 with 4 legal opening moves and flips disc accurately', () => {
  const s0 = createOthelloState(players);
  assert.deepEqual(s0.scores, [2, 2]);
  assert.equal(s0.legalMoves.length, 4);

  // P0 (ivory) plays (2, 4) -> flips (3, 4) -> score 4-1
  const { state: s1, flipped } = applyOthelloMove(s0, 2, 4);
  assert.equal(flipped, 1);
  assert.deepEqual(s1.scores, [4, 1]);
  assert.equal(s1.turnIndex, 1);
});
