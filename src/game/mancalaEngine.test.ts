import test from 'node:test';
import assert from 'node:assert/strict';
import { createMancalaState, sowMancalaPit } from './mancalaEngine.ts';
import type { PlayerSeat } from './types.ts';

const seats: PlayerSeat[] = [
  { seatIndex: 0, id: 'p0', name: 'شما', color: 'ivory', isAI: false, connected: true },
  { seatIndex: 1, id: 'p1', name: 'حریف', color: 'ebony', isAI: false, connected: true },
];

test('Mancala: landing in own store grants extra turn', () => {
  const state = createMancalaState(seats);
  // Pit 2 has 4 stones -> lands on 3, 4, 5, 6 (own store!)
  const next = sowMancalaPit(state, 2);
  assert.equal(next.pits[2], 0);
  assert.equal(next.pits[6], 1);
  assert.equal(next.turnIndex, 0);
});
