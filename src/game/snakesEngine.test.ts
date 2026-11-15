import test from 'node:test';
import assert from 'node:assert/strict';
import { createSnakesState, rollSnakesDice, getSnakeBoardCoords } from './snakesEngine.ts';
import type { PlayerSeat } from './types.ts';

const players: PlayerSeat[] = [
  { seatIndex: 0, id: 'p0', name: 'علی', color: 'red', isAI: false, connected: true },
  { seatIndex: 1, id: 'p1', name: 'سارا', color: 'blue', isAI: false, connected: true },
];

test('Snakes: boustrophedon board coordinates match 1..100', () => {
  assert.deepEqual(getSnakeBoardCoords(1), [9, 0]);
  assert.deepEqual(getSnakeBoardCoords(10), [9, 9]);
  assert.deepEqual(getSnakeBoardCoords(11), [8, 9]);
  assert.deepEqual(getSnakeBoardCoords(20), [8, 0]);
  assert.deepEqual(getSnakeBoardCoords(100), [0, 0]);
});

test('Snakes: climbs ladder and slides down snake', () => {
  const s0 = createSnakesState(players);
  // 0 + 4 = 4 -> ladder to 25
  const s1 = rollSnakesDice(s0, 4);
  assert.equal(s1.positions[0], 25);
  assert.equal(s1.lastJump?.type, 'ladder');
  assert.equal(s1.turnIndex, 1);

  // Player 1 moves to 27 via roll from 22 + 5 -> snake 27 -> 5
  s1.positions[1] = 22;
  const s2 = rollSnakesDice(s1, 5);
  assert.equal(s2.positions[1], 5);
  assert.equal(s2.lastJump?.type, 'snake');
});

test('Snakes: exact 100 wins and overshoot stays put', () => {
  const s0 = createSnakesState(players);
  s0.positions[0] = 97;
  const s1 = rollSnakesDice(s0, 5);
  assert.equal(s1.positions[0], 97);
  assert.equal(s1.winnerIndex, null);

  s1.turnIndex = 0;
  const s2 = rollSnakesDice(s1, 3);
  assert.equal(s2.positions[0], 100);
  assert.equal(s2.winnerIndex, 0);
  assert.equal(s2.phase, 'finished');
});
