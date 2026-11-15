import type { BackgammonMove, BackgammonPoint, BackgammonState, PlayerSeat } from './types.ts';

// Player 0 (ivory) moves 24 -> 1 (bears off to 0). Home board: 1..6. Bar: 25.
// Player 1 (ebony) moves 1 -> 24 (bears off to 25). Home board: 19..24. Bar: 0.

export function createInitialBackgammonPoints(): BackgammonPoint[] {
  const points: BackgammonPoint[] = Array.from({ length: 26 }, () => ({ owner: null, count: 0 }));

  // Player 0 (ivory): 2@24, 5@13, 3@8, 5@6
  points[24] = { owner: 0, count: 2 };
  points[13] = { owner: 0, count: 5 };
  points[8] = { owner: 0, count: 3 };
  points[6] = { owner: 0, count: 5 };

  // Player 1 (ebony): 2@1, 5@12, 3@17, 5@19
  points[1] = { owner: 1, count: 2 };
  points[12] = { owner: 1, count: 5 };
  points[17] = { owner: 1, count: 3 };
  points[19] = { owner: 1, count: 5 };

  return points;
}

export function createBackgammonState(players: PlayerSeat[]): BackgammonState {
  const p2 = players.slice(0, 2);
  return {
    gameType: 'backgammon',
    players: p2,
    points: createInitialBackgammonPoints(),
    bar: [0, 0],
    borneOff: [0, 0],
    turnIndex: 0,
    phase: 'roll',
    dice: [],
    remainingDice: [],
    legalMoves: [],
    winnerIndex: null,
    winType: null,
    lastEvent: `نوبت ${p2[0]?.name ?? 'مهره عاجی'} است. دو تاس بریزید!`,
    turnCount: 1,
  };
}

export function canBearOff(points: BackgammonPoint[], bar: [number, number], turn: 0 | 1): boolean {
  if (bar[turn] > 0) return false;
  if (turn === 0) {
    for (let i = 7; i <= 24; i++) {
      if (points[i].owner === 0 && points[i].count > 0) return false;
    }
    return true;
  } else {
    for (let i = 1; i <= 18; i++) {
      if (points[i].owner === 1 && points[i].count > 0) return false;
    }
    return true;
  }
}

function getSingleDieMoves(
  points: BackgammonPoint[],
  bar: [number, number],
  turn: 0 | 1,
  die: number
): BackgammonMove[] {
  const moves: BackgammonMove[] = [];
  const dir = turn === 0 ? -1 : 1;
  const opponent: 0 | 1 = turn === 0 ? 1 : 0;
  const barPos = turn === 0 ? 25 : 0;
  const bearOffPos = turn === 0 ? 0 : 25;

  // Must enter from bar first
  if (bar[turn] > 0) {
    const dest = barPos + dir * die;
    if (dest >= 1 && dest <= 24) {
      const target = points[dest];
      if (target.owner === null || target.owner === turn || target.count <= 1) {
        moves.push({
          from: barPos,
          to: dest,
          die,
          isHit: target.owner === opponent && target.count === 1,
        });
      }
    }
    return moves;
  }

  const bearingOff = canBearOff(points, bar, turn);

  for (let from = 1; from <= 24; from++) {
    if (points[from].owner !== turn || points[from].count === 0) continue;
    const to = from + dir * die;

    if (to >= 1 && to <= 24) {
      const target = points[to];
      if (target.owner === null || target.owner === turn || target.count <= 1) {
        moves.push({
          from,
          to,
          die,
          isHit: target.owner === opponent && target.count === 1,
        });
      }
    } else if (bearingOff) {
      if (turn === 0 && to === 0) {
        moves.push({ from, to: bearOffPos, die, isHit: false });
      } else if (turn === 1 && to === 25) {
        moves.push({ from, to: bearOffPos, die, isHit: false });
      } else if ((turn === 0 && to < 0) || (turn === 1 && to > 25)) {
        // Allowed only if no checkers exist on higher home points
        let hasHigher = false;
        if (turn === 0) {
          for (let h = from + 1; h <= 6; h++) {
            if (points[h].owner === 0 && points[h].count > 0) {
              hasHigher = true;
              break;
            }
          }
        } else {
          for (let h = 19; h < from; h++) {
            if (points[h].owner === 1 && points[h].count > 0) {
              hasHigher = true;
              break;
            }
          }
        }
        if (!hasHigher) {
          moves.push({ from, to: bearOffPos, die, isHit: false });
        }
      }
    }
  }

  return moves;
}

function applyRawMove(
  points: BackgammonPoint[],
  bar: [number, number],
  borneOff: [number, number],
  turn: 0 | 1,
  move: BackgammonMove
): { points: BackgammonPoint[]; bar: [number, number]; borneOff: [number, number] } {
  const nextPoints = points.map((p) => ({ ...p }));
  const nextBar: [number, number] = [bar[0], bar[1]];
  const nextBorneOff: [number, number] = [borneOff[0], borneOff[1]];
  const opponent: 0 | 1 = turn === 0 ? 1 : 0;

  if (move.from === 0 || move.from === 25) {
    nextBar[turn] = Math.max(0, nextBar[turn] - 1);
  } else {
    nextPoints[move.from].count -= 1;
    if (nextPoints[move.from].count <= 0) {
      nextPoints[move.from] = { owner: null, count: 0 };
    }
  }

  if (move.to === 0 || move.to === 25) {
    nextBorneOff[turn] += 1;
  } else {
    const dest = nextPoints[move.to];
    if (dest.owner === opponent && dest.count === 1) {
      nextBar[opponent] += 1;
      nextPoints[move.to] = { owner: turn, count: 1 };
    } else {
      nextPoints[move.to] = { owner: turn, count: dest.count + 1 };
    }
  }

  return { points: nextPoints, bar: nextBar, borneOff: nextBorneOff };
}

// Compute maximum number of dice playable from current position (used to enforce official Backgammon rules)
function maxPlayableDiceCount(
  points: BackgammonPoint[],
  bar: [number, number],
  borneOff: [number, number],
  turn: 0 | 1,
  remainingDice: number[]
): number {
  if (remainingDice.length === 0) return 0;
  const uniqueDice = Array.from(new Set(remainingDice));
  let best = 0;

  for (const d of uniqueDice) {
    const moves = getSingleDieMoves(points, bar, turn, d);
    if (moves.length === 0) continue;
    const idx = remainingDice.indexOf(d);
    const rest = [...remainingDice.slice(0, idx), ...remainingDice.slice(idx + 1)];
    for (const m of moves) {
      const next = applyRawMove(points, bar, borneOff, turn, m);
      const depth = 1 + maxPlayableDiceCount(next.points, next.bar, next.borneOff, turn, rest);
      if (depth > best) best = depth;
      if (best === remainingDice.length) return best;
    }
  }
  return best;
}

export function computeLegalBackgammonMoves(
  points: BackgammonPoint[],
  bar: [number, number],
  borneOff: [number, number],
  turn: 0 | 1,
  remainingDice: number[]
): BackgammonMove[] {
  if (remainingDice.length === 0) return [];

  const uniqueDice = Array.from(new Set(remainingDice));
  const candidates: { move: BackgammonMove; maxTotal: number }[] = [];

  for (const d of uniqueDice) {
    const moves = getSingleDieMoves(points, bar, turn, d);
    const idx = remainingDice.indexOf(d);
    const rest = [...remainingDice.slice(0, idx), ...remainingDice.slice(idx + 1)];
    for (const m of moves) {
      const next = applyRawMove(points, bar, borneOff, turn, m);
      const total = 1 + maxPlayableDiceCount(next.points, next.bar, next.borneOff, turn, rest);
      candidates.push({ move: m, maxTotal: total });
    }
  }

  if (candidates.length === 0) return [];
  const globalMax = Math.max(...candidates.map((c) => c.maxTotal));
  let filtered = candidates.filter((c) => c.maxTotal === globalMax).map((c) => c.move);

  // If only 1 die out of 2 distinct dice can be played, Backgammon rule requires playing the higher die
  if (globalMax === 1 && uniqueDice.length === 2) {
    const maxDie = Math.max(...uniqueDice);
    const highMoves = filtered.filter((m) => m.die === maxDie);
    if (highMoves.length > 0) filtered = highMoves;
  }

  // Deduplicate by (from, to) keeping smallest die if same destination
  const byKey = new Map<string, BackgammonMove>();
  for (const m of filtered) {
    const key = `${m.from}->${m.to}`;
    const existing = byKey.get(key);
    if (!existing || m.die < existing.die) {
      byKey.set(key, m);
    }
  }

  return Array.from(byKey.values());
}

export function rollBackgammonDice(state: BackgammonState, forcedDice?: [number, number]): BackgammonState {
  if (state.phase !== 'roll' || state.winnerIndex !== null) return state;

  const d1 = forcedDice ? forcedDice[0] : Math.floor(Math.random() * 6) + 1;
  const d2 = forcedDice ? forcedDice[1] : Math.floor(Math.random() * 6) + 1;
  const remaining = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
  const legal = computeLegalBackgammonMoves(state.points, state.bar, state.borneOff, state.turnIndex, remaining);
  const player = state.players[state.turnIndex];

  if (legal.length === 0) {
    const nextTurn: 0 | 1 = state.turnIndex === 0 ? 1 : 0;
    return {
      ...state,
      dice: [d1, d2],
      remainingDice: [],
      legalMoves: [],
      turnIndex: nextTurn,
      phase: 'roll',
      turnCount: state.turnCount + 1,
      lastEvent: `${player.name} تاس ${d1} و ${d2} آورد اما حرکت مجازی ندارد! نوبت ${state.players[nextTurn].name}.`,
    };
  }

  return {
    ...state,
    dice: [d1, d2],
    remainingDice: remaining,
    legalMoves: legal,
    phase: 'move',
    lastEvent: `${player.name} تاس ${d1} و ${d2}${d1 === d2 ? ' (جفت!)' : ''} آورد. مهره‌ای را حرکت دهید.`,
  };
}

export function applyBackgammonMove(state: BackgammonState, from: number, to: number): { state: BackgammonState; isHit: boolean } {
  if (state.phase !== 'move') return { state, isHit: false };

  const move = state.legalMoves.find((m) => m.from === from && m.to === to);
  if (!move) return { state, isHit: false };

  const turn = state.turnIndex;
  const player = state.players[turn];
  const opponent: 0 | 1 = turn === 0 ? 1 : 0;
  const next = applyRawMove(state.points, state.bar, state.borneOff, turn, move);

  // Check win
  if (next.borneOff[turn] >= 15) {
    let winType: 'normal' | 'gammon' | 'backgammon' = 'normal';
    if (next.borneOff[opponent] === 0) {
      const oppInWinnerHome =
        next.bar[opponent] > 0 ||
        (turn === 0
          ? next.points.slice(1, 7).some((p) => p.owner === 1 && p.count > 0)
          : next.points.slice(19, 25).some((p) => p.owner === 0 && p.count > 0));
      winType = oppInWinnerHome ? 'backgammon' : 'gammon';
    }

    return {
      state: {
        ...state,
        points: next.points,
        bar: next.bar,
        borneOff: next.borneOff,
        remainingDice: [],
        legalMoves: [],
        phase: 'finished',
        winnerIndex: turn,
        winType,
        lastEvent: `${player.name} برنده تخته نرد شد${winType === 'gammon' ? ' (مارس!)' : winType === 'backgammon' ? ' (سه‌مارس!)' : '!'}`,
      },
      isHit: move.isHit,
    };
  }

  const dieIdx = state.remainingDice.indexOf(move.die);
  const nextRemaining = [
    ...state.remainingDice.slice(0, dieIdx),
    ...state.remainingDice.slice(dieIdx + 1),
  ];

  const nextLegal = computeLegalBackgammonMoves(next.points, next.bar, next.borneOff, turn, nextRemaining);

  if (nextRemaining.length === 0 || nextLegal.length === 0) {
    const nextTurn: 0 | 1 = turn === 0 ? 1 : 0;
    return {
      state: {
        ...state,
        points: next.points,
        bar: next.bar,
        borneOff: next.borneOff,
        remainingDice: [],
        legalMoves: [],
        turnIndex: nextTurn,
        phase: 'roll',
        turnCount: state.turnCount + 1,
        lastEvent:
          nextRemaining.length > 0
            ? `${player.name} دیگر حرکت مجازی ندارد. نوبت ${state.players[nextTurn].name}.`
            : `${player.name} حرکت خود را کامل کرد. نوبت ${state.players[nextTurn].name}.`,
      },
      isHit: move.isHit,
    };
  }

  return {
    state: {
      ...state,
      points: next.points,
      bar: next.bar,
      borneOff: next.borneOff,
      remainingDice: nextRemaining,
      legalMoves: nextLegal,
      lastEvent: `${player.name}${move.isHit ? ' مهره حریف را زد!' : ' حرکت کرد.'} (${nextRemaining.join(' ، ')} باقی‌مانده)`,
    },
    isHit: move.isHit,
  };
}

export function chooseBackgammonAIMove(state: BackgammonState): BackgammonMove | null {
  if (state.legalMoves.length === 0) return null;
  const turn = state.turnIndex;
  let best = state.legalMoves[0];
  let bestScore = -Infinity;

  for (const m of state.legalMoves) {
    const next = applyRawMove(state.points, state.bar, state.borneOff, turn, m);
    let score = 0;

    if (m.isHit) score += 45;
    if (m.to === 0 || m.to === 25) score += 60;

    // Score board structure: making anchors (count >= 2), minimizing single blots
    for (let i = 1; i <= 24; i++) {
      const p = next.points[i];
      if (p.owner === turn) {
        if (p.count >= 2) score += 18;
        if (p.count === 1) score -= 14;
        // Advance bonus
        const progress = turn === 0 ? 25 - i : i;
        score += progress * p.count * 0.6;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }

  return best;
}
