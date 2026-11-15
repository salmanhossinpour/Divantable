import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createBackgammonState,
  rollBackgammonDice,
  applyBackgammonMove,
  canBearOff,
} from './backgammonEngine.ts';
import type { PlayerSeat } from './types.ts';

const players: PlayerSeat[] = [
  { seatIndex: 0, id: 'p0', name: 'عاجی', color: 'ivory', isAI: false, connected: true },
  { seatIndex: 1, id: 'p1', name: 'آبنوس', color: 'ebony', isAI: false, connected: true },
];

test('Backgammon: initial setup has 15 checkers per player', () => {
  const state = createBackgammonState(players);
  let p0Count = 0;
  let p1Count = 0;
  for (let i = 1; i <= 24; i++) {
    if (state.points[i].owner === 0) p0Count += state.points[i].count;
    if (state.points[i].owner === 1) p1Count += state.points[i].count;
  }
  assert.equal(p0Count, 15);
  assert.equal(p1Count, 15);
});

test('Backgammon: doubles grant 4 moves and hitting sends blot to bar', () => {
  const s0 = createBackgammonState(players);
  // Put single P1 blot on point 20
  s0.points[20] = { owner: 1, count: 1 };
  const rolled = rollBackgammonDice(s0, [4, 4]);
  assert.equal(rolled.remainingDice.length, 4);

  // Move P0 from 24 to 20 (hits P1 blot)
  const { state: s1, isHit } = applyBackgammonMove(rolled, 24, 20);
  assert.equal(isHit, true);
  assert.equal(s1.bar[1], 1);
  assert.equal(s1.points[20].owner, 0);
  assert.equal(s1.points[20].count, 1);
  assert.equal(s1.remainingDice.length, 3);
});

test('Backgammon: mandatory bar re-entry and bearing off victory', () => {
  const s0 = createBackgammonState(players);
  // Test mandatory bar re-entry: P0 on bar must re-enter before moving point 6
  s0.bar = [1, 0];
  const barRoll = rollBackgammonDice(s0, [3, 5]);
  assert.equal(barRoll.legalMoves.every((m) => m.from === 25), true);

  // Clear board and leave 1 checker for P0 on point 3
  const sWin = createBackgammonState(players);
  for (let i = 1; i <= 24; i++) sWin.points[i] = { owner: null, count: 0 };
  sWin.points[3] = { owner: 0, count: 1 };
  sWin.borneOff = [14, 5];

  assert.equal(canBearOff(sWin.points, sWin.bar, 0), true);
  // With [5, 4], either die bears off directly in 1 move
  const rolled = rollBackgammonDice(sWin, [5, 4]);
  const { state: won } = applyBackgammonMove(rolled, 3, 0);
  assert.equal(won.phase, 'finished');
  assert.equal(won.winnerIndex, 0);
  assert.equal(won.winType, 'normal');
});
