import test from 'node:test';
import assert from 'node:assert/strict';
import { applyMorrisAction, createMorrisState } from './morrisEngine.ts';
import type { PlayerSeat } from './types.ts';

const seats: PlayerSeat[] = [
  { seatIndex: 0, id: 'p0', name: 'عاجی', color: 'ivory', isAI: false, connected: true },
  { seatIndex: 1, id: 'p1', name: 'آبنوس', color: 'ebony', isAI: false, connected: true },
];

test('Morris: forming a mill switches to remove subPhase and captures opponent piece', () => {
  let state = createMorrisState(seats);
  state = applyMorrisAction(state, 0); // P0
  state = applyMorrisAction(state, 8); // P1
  state = applyMorrisAction(state, 1); // P0
  state = applyMorrisAction(state, 9); // P1
  state = applyMorrisAction(state, 2); // P0 forms mill (0,1,2)

  assert.equal(state.subPhase, 'remove');
  assert.equal(state.turnIndex, 0);
  state = applyMorrisAction(state, 8);
  assert.equal(state.nodes[8], null);
  assert.equal(state.turnIndex, 1);
  assert.equal(state.subPhase, 'place');
});
