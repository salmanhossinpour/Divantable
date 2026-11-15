import type { MancalaState, PlayerSeat } from './types.ts';

// Pit layout (length 14):
// 0..5: Player 0 pits (counter-clockwise toward P0 store at index 6)
// 6:    Player 0 store
// 7..12: Player 1 pits (counter-clockwise toward P1 store at index 13)
// 13:   Player 1 store

export function createMancalaState(players: PlayerSeat[]): MancalaState {
  const p2 = players.slice(0, 2);
  return {
    gameType: 'mancala',
    players: p2,
    pits: [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0],
    turnIndex: 0,
    phase: 'move',
    winnerIndex: null,
    isDraw: false,
    lastSownPit: null,
    lastEvent: `نوبت ${p2[0]?.name ?? 'شما'} است. یکی از چاله‌های خود را انتخاب کنید.`,
    turnCount: 1,
  };
}

export function getLegalMancalaPits(state: MancalaState): number[] {
  if (state.phase !== 'move') return [];
  const start = state.turnIndex === 0 ? 0 : 7;
  const res: number[] = [];
  for (let i = start; i < start + 6; i++) {
    if (state.pits[i] > 0) res.push(i);
  }
  return res;
}

export function sowMancalaPit(state: MancalaState, pitIndex: number): MancalaState {
  if (state.phase !== 'move') return state;
  const turn = state.turnIndex;
  const ownStart = turn === 0 ? 0 : 7;
  const ownEnd = ownStart + 5;
  const ownStore = turn === 0 ? 6 : 13;
  const oppStore = turn === 0 ? 13 : 6;

  if (pitIndex < ownStart || pitIndex > ownEnd || state.pits[pitIndex] <= 0) {
    return state;
  }

  const nextPits = [...state.pits];
  let stones = nextPits[pitIndex];
  nextPits[pitIndex] = 0;

  let cur = pitIndex;
  while (stones > 0) {
    cur = (cur + 1) % 14;
    if (cur === oppStore) continue;
    nextPits[cur]++;
    stones--;
  }

  const moverName = state.players[turn].name;
  let capturedCount = 0;

  // Opposite-pit capture: last stone lands in own previously empty pit & opposite has > 0
  if (cur >= ownStart && cur <= ownEnd && nextPits[cur] === 1) {
    const oppPit = 12 - cur;
    if (nextPits[oppPit] > 0) {
      capturedCount = nextPits[oppPit] + 1;
      nextPits[ownStore] += capturedCount;
      nextPits[oppPit] = 0;
      nextPits[cur] = 0;
    }
  }

  // Check end-game condition (either side's 6 pits are empty)
  const p0Side = nextPits.slice(0, 6).reduce((a, b) => a + b, 0);
  const p1Side = nextPits.slice(7, 13).reduce((a, b) => a + b, 0);

  if (p0Side === 0 || p1Side === 0) {
    nextPits[6] += p0Side;
    nextPits[13] += p1Side;
    for (let i = 0; i < 6; i++) nextPits[i] = 0;
    for (let i = 7; i < 13; i++) nextPits[i] = 0;

    const s0 = nextPits[6];
    const s1 = nextPits[13];
    const isDraw = s0 === s1;
    const winnerIndex: 0 | 1 | null = isDraw ? null : s0 > s1 ? 0 : 1;

    return {
      ...state,
      pits: nextPits,
      phase: 'finished',
      winnerIndex,
      isDraw,
      lastSownPit: cur,
      lastEvent: isDraw
        ? `پایان منقله با تساوی ${s0} به ${s1}!`
        : `${state.players[winnerIndex!].name} با ${Math.max(s0, s1)} مهره برنده منقله شد!`,
    };
  }

  const extraTurn = cur === ownStore;
  const nextTurn: 0 | 1 = extraTurn ? turn : turn === 0 ? 1 : 0;
  const nextName = state.players[nextTurn].name;

  let eventMsg = `${moverName} از چاله کاشت. نوبت ${nextName}.`;
  if (extraTurn) {
    eventMsg = `آخرین مهره در انبار افتاد! نوبت اضافه برای ${moverName}.`;
  } else if (capturedCount > 0) {
    eventMsg = `${moverName} ${capturedCount} مهره را شکار کرد! نوبت ${nextName}.`;
  }

  return {
    ...state,
    pits: nextPits,
    turnIndex: nextTurn,
    lastSownPit: cur,
    turnCount: state.turnCount + 1,
    lastEvent: eventMsg,
  };
}

export function chooseMancalaAIPit(state: MancalaState): number | null {
  const legal = getLegalMancalaPits(state);
  if (legal.length === 0) return null;

  const ai = state.turnIndex;
  const ownStore = ai === 0 ? 6 : 13;
  let bestPit = legal[0];
  let bestScore = -Infinity;

  for (const pit of legal) {
    const next = sowMancalaPit(state, pit);
    let score = (next.pits[ownStore] - state.pits[ownStore]) * 10 + Math.random();
    if (next.turnIndex === ai && next.phase === 'move') score += 16; // Extra turn bonus
    if (score > bestScore) {
      bestScore = score;
      bestPit = pit;
    }
  }
  return bestPit;
}
