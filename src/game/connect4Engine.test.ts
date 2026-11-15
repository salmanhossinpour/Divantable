import test from 'node:test';
import assert from 'node:assert/strict';
import { createConnect4State, dropConnect4Token } from './connect4Engine.ts';
import type { PlayerSeat } from './types.ts';

const players: PlayerSeat[] = [
  { seatIndex: 0, id: 'p0', name: 'قرمز', color: 'red', isAI: false, connected: true },
  { seatIndex: 1, id: 'p1', name: 'زرد', color: 'yellow', isAI: false, connected: true },
];

test('Connect4: gravity stacks tokens and detects 4-in-a-row win', () => {
  let s = createConnect4State(players);
  // P0 drops col 0, P1 drops col 1, repeated 3 times, then P0 wins vertically on col 0
  s = dropConnect4Token(s, 0);
  assert.equal(s.board[5][0], 0);
  s = dropConnect4Token(s, 1);
  s = dropConnect4Token(s, 0);
  assert.equal(s.board[4][0], 0);
  s = dropConnect4Token(s, 1);
  s = dropConnect4Token(s, 0);
  s = dropConnect4Token(s, 1);
  s = dropConnect4Token(s, 0);

  assert.equal(s.phase, 'finished');
  assert.equal(s.winnerIndex, 0);
  assert.equal(s.winningCells.length, 4);
});
