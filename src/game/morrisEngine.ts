import type { MorrisMove, MorrisState, PlayerSeat } from './types.ts';

// 24 classic Nine Men's Morris nodes mapped onto a 7x7 grid (0..6)
// Outer square: 0..7, Middle square: 8..15, Inner square: 16..23
export const MORRIS_NODE_COORDS: [number, number][] = [
  [0, 0], [0, 3], [0, 6], [3, 6], [6, 6], [6, 3], [6, 0], [3, 0], // 0..7
  [1, 1], [1, 3], [1, 5], [3, 5], [5, 5], [5, 3], [5, 1], [3, 1], // 8..15
  [2, 2], [2, 3], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2], [3, 2], // 16..23
];

export const MORRIS_ADJACENCY: number[][] = [
  [1, 7],        // 0
  [0, 2, 9],     // 1
  [1, 3],        // 2
  [2, 4, 11],    // 3
  [3, 5],        // 4
  [4, 6, 13],    // 5
  [5, 7],        // 6
  [0, 6, 15],    // 7
  [9, 15],       // 8
  [1, 8, 10, 17],// 9
  [9, 11],       // 10
  [3, 10, 12, 19],// 11
  [11, 13],      // 12
  [5, 12, 14, 21],// 13
  [13, 15],      // 14
  [7, 8, 14, 23],// 15
  [17, 23],      // 16
  [9, 16, 18],   // 17
  [17, 19],      // 18
  [11, 18, 20],  // 19
  [19, 21],      // 20
  [13, 20, 22],  // 21
  [21, 23],      // 22
  [15, 16, 22],  // 23
];

export const MORRIS_MILLS: [number, number, number][] = [
  // Outer
  [0, 1, 2], [2, 3, 4], [4, 5, 6], [6, 7, 0],
  // Middle
  [8, 9, 10], [10, 11, 12], [12, 13, 14], [14, 15, 8],
  // Inner
  [16, 17, 18], [18, 19, 20], [20, 21, 22], [22, 23, 16],
  // Radial spokes
  [1, 9, 17], [3, 11, 19], [5, 13, 21], [7, 15, 23],
];

export function isNodeInMill(nodes: (0 | 1 | null)[], idx: number, owner: 0 | 1): boolean {
  return MORRIS_MILLS.some(
    (mill) => mill.includes(idx) && mill.every((n) => nodes[n] === owner)
  );
}

function computeMorrisLegalMoves(
  nodes: (0 | 1 | null)[],
  turn: 0 | 1,
  subPhase: 'place' | 'slide' | 'remove',
  counts: [number, number]
): MorrisMove[] {
  if (subPhase === 'remove') {
    const opp: 0 | 1 = turn === 0 ? 1 : 0;
    const oppNodes: number[] = [];
    for (let i = 0; i < 24; i++) {
      if (nodes[i] === opp) oppNodes.push(i);
    }
    const nonMill = oppNodes.filter((n) => !isNodeInMill(nodes, n, opp));
    const targets = nonMill.length > 0 ? nonMill : oppNodes;
    return targets.map((to) => ({ to }));
  }

  if (subPhase === 'place') {
    const moves: MorrisMove[] = [];
    for (let i = 0; i < 24; i++) {
      if (nodes[i] === null) moves.push({ to: i });
    }
    return moves;
  }

  // 'slide' (or flying when counts[turn] === 3)
  const canFly = counts[turn] <= 3;
  const moves: MorrisMove[] = [];
  for (let i = 0; i < 24; i++) {
    if (nodes[i] !== turn) continue;
    if (canFly) {
      for (let j = 0; j < 24; j++) {
        if (nodes[j] === null) moves.push({ from: i, to: j });
      }
    } else {
      for (const adj of MORRIS_ADJACENCY[i]) {
        if (nodes[adj] === null) moves.push({ from: i, to: adj });
      }
    }
  }
  return moves;
}

export function createMorrisState(players: PlayerSeat[]): MorrisState {
  const p2 = players.slice(0, 2);
  const nodes: (0 | 1 | null)[] = Array(24).fill(null);
  const legalMoves = computeMorrisLegalMoves(nodes, 0, 'place', [0, 0]);

  return {
    gameType: 'morris',
    players: p2,
    nodes,
    turnIndex: 0,
    phase: 'move',
    subPhase: 'place',
    toPlace: [9, 9],
    counts: [0, 0],
    legalMoves,
    winnerIndex: null,
    lastEvent: `نوبت ${p2[0]?.name ?? 'عاجی'} است. مهره‌ای روی صفحه بگذارید (۹ باقیمانده).`,
    turnCount: 1,
  };
}

export function applyMorrisAction(state: MorrisState, to: number, from?: number): MorrisState {
  if (state.phase !== 'move') return state;

  const isLegal = state.legalMoves.some((m) => m.to === to && m.from === from);
  if (!isLegal) return state;

  const nextNodes = [...state.nodes];
  const nextToPlace: [number, number] = [...state.toPlace] as [number, number];
  const nextCounts: [number, number] = [...state.counts] as [number, number];
  const turn = state.turnIndex;
  const opp: 0 | 1 = turn === 0 ? 1 : 0;
  const moverName = state.players[turn].name;
  const oppName = state.players[opp].name;

  if (state.subPhase === 'remove') {
    nextNodes[to] = null;
    nextCounts[opp] = Math.max(0, nextCounts[opp] - 1);

    // Check if opponent lost (<3 pieces after placement finished)
    const oppNextSub: 'place' | 'slide' = nextToPlace[opp] > 0 ? 'place' : 'slide';
    const oppMoves = computeMorrisLegalMoves(nextNodes, opp, oppNextSub, nextCounts);
    if ((nextToPlace[opp] === 0 && nextCounts[opp] < 3) || oppMoves.length === 0) {
      return {
        ...state,
        nodes: nextNodes,
        counts: nextCounts,
        legalMoves: [],
        phase: 'finished',
        winnerIndex: turn,
        lastEvent: `${moverName} مهره حریف را حذف کرد و برنده دوز ۹ تایی شد!`,
      };
    }

    return {
      ...state,
      nodes: nextNodes,
      counts: nextCounts,
      turnIndex: opp,
      subPhase: oppNextSub,
      legalMoves: oppMoves,
      turnCount: state.turnCount + 1,
      lastEvent: `${moverName} یک مهره را برداشت! نوبت ${oppName}.`,
    };
  }

  if (state.subPhase === 'place') {
    nextNodes[to] = turn;
    nextToPlace[turn] = Math.max(0, nextToPlace[turn] - 1);
    nextCounts[turn]++;
  } else {
    if (from === undefined) return state;
    nextNodes[from] = null;
    nextNodes[to] = turn;
  }

  // Check if placing/moving formed a mill
  if (isNodeInMill(nextNodes, to, turn)) {
    const removeMoves = computeMorrisLegalMoves(nextNodes, turn, 'remove', nextCounts);
    if (removeMoves.length > 0) {
      return {
        ...state,
        nodes: nextNodes,
        toPlace: nextToPlace,
        counts: nextCounts,
        subPhase: 'remove',
        legalMoves: removeMoves,
        lastEvent: `دوز! ${moverName} یک ردیف ۳تایی ساخت — یکی از مهره‌های حریف را حذف کنید.`,
      };
    }
  }

  const oppSub: 'place' | 'slide' = nextToPlace[opp] > 0 ? 'place' : 'slide';
  const oppMoves = computeMorrisLegalMoves(nextNodes, opp, oppSub, nextCounts);
  if ((nextToPlace[opp] === 0 && nextCounts[opp] < 3) || oppMoves.length === 0) {
    return {
      ...state,
      nodes: nextNodes,
      toPlace: nextToPlace,
      counts: nextCounts,
      legalMoves: [],
      phase: 'finished',
      winnerIndex: turn,
      lastEvent: `${moverName} راه حریف را بست و برنده دوز ۹ تایی شد!`,
    };
  }

  return {
    ...state,
    nodes: nextNodes,
    toPlace: nextToPlace,
    counts: nextCounts,
    turnIndex: opp,
    subPhase: oppSub,
    legalMoves: oppMoves,
    turnCount: state.turnCount + 1,
    lastEvent:
      oppSub === 'place'
        ? `نوبت ${oppName} است (${nextToPlace[opp]} مهره باقیمانده برای گذاشتن).`
        : nextCounts[opp] === 3
        ? `نوبت ${oppName} است (حالت پرواز آزاد با ۳ مهره).`
        : `نوبت ${oppName} است. مهره‌ای را روی خط حرکت دهید.`,
  };
}

export function chooseMorrisAIAction(state: MorrisState): MorrisMove | null {
  if (state.legalMoves.length === 0) return null;
  const ai = state.turnIndex;
  const opp: 0 | 1 = ai === 0 ? 1 : 0;

  let best = state.legalMoves[0];
  let bestScore = -Infinity;

  for (const m of state.legalMoves) {
    let score = Math.random() * 2;
    if (state.subPhase === 'remove') {
      // Prefer removing opponent pieces on high-degree intersections
      score += MORRIS_ADJACENCY[m.to].length * 5;
    } else {
      const testNodes = [...state.nodes];
      if (m.from !== undefined) testNodes[m.from] = null;
      testNodes[m.to] = ai;
      if (isNodeInMill(testNodes, m.to, ai)) score += 60;

      // Block opponent's potential mill
      const blockNodes = [...state.nodes];
      blockNodes[m.to] = opp;
      if (isNodeInMill(blockNodes, m.to, opp)) score += 35;

      // Prefer 3-way and 4-way intersections
      score += MORRIS_ADJACENCY[m.to].length * 3;
    }
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}
