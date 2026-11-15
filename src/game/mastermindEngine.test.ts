import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMastermindState,
  evaluateMastermindGuess,
  setMastermindSecret,
  submitMastermindGuess,
} from './mastermindEngine.ts';
import type { PlayerSeat } from './types.ts';

const AI_SEATS: PlayerSeat[] = [
  { seatIndex: 0, id: 'p0', name: 'شما', color: 'ivory', isAI: false, connected: true },
  { seatIndex: 1, id: 'p1', name: 'ربات', color: 'ebony', isAI: true, connected: true },
];

const HUMAN_SEATS: PlayerSeat[] = [
  { seatIndex: 0, id: 'p0', name: 'رمزگشا', color: 'ivory', isAI: false, connected: true },
  { seatIndex: 1, id: 'p1', name: 'طراح', color: 'ebony', isAI: false, connected: true },
];

test('Mastermind: exact and misplaced evaluation handles duplicates without double counting', () => {
  const res1 = evaluateMastermindGuess([0, 0, 1, 2], [0, 2, 0, 0]);
  assert.equal(res1.exact, 1);
  assert.equal(res1.misplaced, 2); // second 0 and 2 match, third 0 does not double count

  const res2 = evaluateMastermindGuess([1, 2, 3, 4], [1, 2, 3, 4]);
  assert.equal(res2.exact, 4);
  assert.equal(res2.misplaced, 0);
});

test('Mastermind: human maker sets secret, breaker wins on exact match, or maker wins after 10 misses', () => {
  let state = createMastermindState(HUMAN_SEATS);
  assert.equal(state.subPhase, 'set_secret');
  assert.equal(state.turnIndex, 1);

  state = setMastermindSecret(state, [0, 1, 2, 3]);
  assert.equal(state.subPhase, 'guess');
  assert.equal(state.turnIndex, 0);

  const won = submitMastermindGuess(state, [0, 1, 2, 3]);
  assert.equal(won.phase, 'finished');
  assert.equal(won.winnerIndex, 0);

  let losing = state;
  for (let i = 0; i < 10; i++) {
    losing = submitMastermindGuess(losing, [5, 5, 5, 5]);
  }
  assert.equal(losing.phase, 'finished');
  assert.equal(losing.winnerIndex, 1);

  const aiStart = createMastermindState(AI_SEATS);
  assert.equal(aiStart.subPhase, 'guess');
  assert.equal(aiStart.turnIndex, 0);
});
