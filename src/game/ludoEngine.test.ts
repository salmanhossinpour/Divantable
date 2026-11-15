import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLudoState,
  rollLudoDice,
  moveLudoPawn,
  getLudoTrackIndex,
} from './ludoEngine.ts';
import type { PlayerSeat } from './types.ts';

const twoPlayers: PlayerSeat[] = [
  { seatIndex: 0, id: 'p0', name: 'بازیکن ۱', color: 'red', isAI: false, connected: true },
  { seatIndex: 1, id: 'p1', name: 'بازیکن ۲', color: 'yellow', isAI: false, connected: true },
];

test('Ludo: pawn in yard can only exit on 6', () => {
  const s0 = createLudoState(twoPlayers);
  const s1 = rollLudoDice(s0, 4);
  assert.equal(s1.phase, 'roll');
  assert.equal(s1.turnIndex, 1);

  const s2 = rollLudoDice(s0, 6);
  assert.equal(s2.phase, 'move');
  assert.deepEqual(s2.validPawnIds, [0, 1, 2, 3]);

  const { state: s3 } = moveLudoPawn(s2, 0);
  assert.equal(s3.pawns[0][0].progress, 0);
  assert.equal(s3.turnIndex, 0); // Bonus turn on 6
});

test('Ludo: captures opponent on non-safe track tile and grants bonus turn', () => {
  const s0 = createLudoState(twoPlayers);
  // Seat 0 (slot 0, start=0): pawn 0 at progress 28 -> track index 28 (not safe)
  // Seat 1 (slot 2, start=26): pawn 0 at progress 2 -> track index 28
  s0.pawns[0][0].progress = 24;
  s0.pawns[1][0].progress = 2;

  assert.equal(getLudoTrackIndex(2, 2), 28);
  assert.equal(getLudoTrackIndex(0, 28), 28);

  const rolled = rollLudoDice(s0, 4);
  assert.equal(rolled.phase, 'move');
  const { state: afterMove, captured } = moveLudoPawn(rolled, 0);
  assert.equal(captured, true);
  assert.equal(afterMove.pawns[1][0].progress, -1); // Returned to yard
  assert.equal(afterMove.turnIndex, 0); // Bonus turn
});

test('Ludo: exact 56 wins when all 4 pawns finish', () => {
  const s0 = createLudoState(twoPlayers);
  s0.pawns[0][0].progress = 56;
  s0.pawns[0][1].progress = 56;
  s0.pawns[0][2].progress = 56;
  s0.pawns[0][3].progress = 53;

  const rolled = rollLudoDice(s0, 3);
  const { state: won, finishedPawn } = moveLudoPawn(rolled, 3);
  assert.equal(finishedPawn, true);
  assert.equal(won.phase, 'finished');
  assert.equal(won.winnerIndex, 0);
});
