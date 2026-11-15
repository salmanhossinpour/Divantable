import type { LudoState, PlayerColor, PlayerSeat } from './types.ts';

export const LUDO_COLORS: PlayerColor[] = ['red', 'blue', 'yellow', 'green'];

export const LUDO_COLOR_NAMES_FA: Record<string, string> = {
  red: 'قرمز',
  blue: 'آبی',
  yellow: 'زرد',
  green: 'سبز',
};

// Track starting index on the 52-cell outer loop for each seat 0..3
// Note: 2-player games use seats 0 (bottom-left) and 2 (top-right) for symmetric opposition.
export const LUDO_START_INDEX: Record<number, number> = {
  0: 0,
  1: 13,
  2: 26,
  3: 39,
};

// Safe outer-track indices (4 start squares + 4 star squares)
export const LUDO_SAFE_TRACK_INDICES = new Set<number>([0, 8, 13, 21, 26, 34, 39, 47]);

// 52 outer track coordinates in (row, col) on 15x15 grid
export const LUDO_TRACK_COORDS: [number, number][] = [
  // 0..4 (Red arm up)
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  // 5..10 (Left arm bottom row going left)
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  // 11 (Left edge center)
  [7, 0],
  // 12..17 (Left arm top row going right; 13 is Blue start)
  [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  // 18..23 (Top arm left col going up)
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  // 24 (Top edge center)
  [0, 7],
  // 25..30 (Top arm right col going down; 26 is Yellow start)
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  // 31..36 (Right arm top row going right)
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  // 37 (Right edge center)
  [7, 14],
  // 38..43 (Right arm bottom row going left; 39 is Green start)
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  // 44..49 (Bottom arm right col going down)
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  // 50..51 (Bottom edge center & left)
  [14, 7], [14, 6],
];

// Home stretch (progress 51..55) + finish (56) for each board quadrant 0..3
export const LUDO_HOME_COORDS: Record<number, [number, number][]> = {
  0: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]], // Red (bottom)
  1: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],     // Blue (left)
  2: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],     // Yellow (top)
  3: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]], // Green (right)
};

export const LUDO_YARD_COORDS: Record<number, [number, number][]> = {
  0: [[10.5, 1.5], [10.5, 3.5], [12.5, 1.5], [12.5, 3.5]],
  1: [[1.5, 1.5], [1.5, 3.5], [3.5, 1.5], [3.5, 3.5]],
  2: [[1.5, 10.5], [1.5, 12.5], [3.5, 10.5], [3.5, 12.5]],
  3: [[10.5, 10.5], [10.5, 12.5], [12.5, 10.5], [12.5, 12.5]],
};

export function getBoardSlotForSeat(seatIndex: number, totalPlayers: number): number {
  if (totalPlayers === 2) {
    return seatIndex === 0 ? 0 : 2;
  }
  return seatIndex;
}

export function getLudoTrackIndex(boardSlot: number, progress: number): number | null {
  if (progress < 0 || progress > 50) return null;
  return (LUDO_START_INDEX[boardSlot] + progress) % 52;
}

export function createLudoState(players: PlayerSeat[]): LudoState {
  const pawns = players.map(() => [
    { id: 0, progress: -1 },
    { id: 1, progress: -1 },
    { id: 2, progress: -1 },
    { id: 3, progress: -1 },
  ]);

  return {
    gameType: 'ludo',
    players,
    pawns,
    turnIndex: 0,
    phase: 'roll',
    diceValue: null,
    consecutiveSixes: 0,
    validPawnIds: [],
    winnerIndex: null,
    lastEvent: `نوبت ${players[0]?.name ?? 'بازیکن ۱'} است. تاس بریزید!`,
    turnCount: 1,
  };
}

export function getValidLudoPawns(state: LudoState, dice: number): number[] {
  const playerPawns = state.pawns[state.turnIndex];
  if (!playerPawns) return [];
  const valid: number[] = [];

  for (const pawn of playerPawns) {
    if (pawn.progress === -1) {
      if (dice === 6) valid.push(pawn.id);
    } else if (pawn.progress + dice <= 56) {
      valid.push(pawn.id);
    }
  }
  return valid;
}

export function rollLudoDice(state: LudoState, forcedRoll?: number): LudoState {
  if (state.phase !== 'roll' || state.winnerIndex !== null) return state;

  const dice = forcedRoll ?? (Math.floor(Math.random() * 6) + 1);
  const currentPlayer = state.players[state.turnIndex];
  const nextSixes = dice === 6 ? state.consecutiveSixes + 1 : 0;

  if (nextSixes >= 3) {
    const nextTurn = (state.turnIndex + 1) % state.players.length;
    return {
      ...state,
      diceValue: dice,
      consecutiveSixes: 0,
      validPawnIds: [],
      turnIndex: nextTurn,
      phase: 'roll',
      turnCount: state.turnCount + 1,
      lastEvent: `${currentPlayer.name} سه بار ۶ آورد و نوبت سوخت! نوبت ${state.players[nextTurn].name}.`,
    };
  }

  const valid = getValidLudoPawns(state, dice);

  if (valid.length === 0) {
    const nextTurn = (state.turnIndex + 1) % state.players.length;
    return {
      ...state,
      diceValue: dice,
      consecutiveSixes: nextSixes,
      validPawnIds: [],
      turnIndex: nextTurn,
      phase: 'roll',
      turnCount: state.turnCount + 1,
      lastEvent: `${currentPlayer.name} عدد ${dice} آورد اما حرکت مجازی ندارد. نوبت ${state.players[nextTurn].name}.`,
    };
  }

  return {
    ...state,
    diceValue: dice,
    consecutiveSixes: nextSixes,
    validPawnIds: valid,
    phase: 'move',
    lastEvent: `${currentPlayer.name} عدد ${dice} آورد. یک مهره انتخاب کنید.`,
  };
}

export function moveLudoPawn(state: LudoState, pawnId: number): { state: LudoState; captured: boolean; finishedPawn: boolean } {
  if (state.phase !== 'move' || state.diceValue === null) {
    return { state, captured: false, finishedPawn: false };
  }
  if (!state.validPawnIds.includes(pawnId)) {
    return { state, captured: false, finishedPawn: false };
  }

  const dice = state.diceValue;
  const totalPlayers = state.players.length;
  const turnIdx = state.turnIndex;
  const currentPlayer = state.players[turnIdx];
  const nextPawns = state.pawns.map((list) => list.map((p) => ({ ...p })));
  const movingPawn = nextPawns[turnIdx].find((p) => p.id === pawnId)!;

  const newProgress = movingPawn.progress === -1 ? 0 : movingPawn.progress + dice;
  movingPawn.progress = newProgress;

  const finishedPawn = newProgress === 56;
  let captured = false;
  let captureDesc = '';

  // Check capture on outer track (0..50) if destination is not safe
  if (newProgress >= 0 && newProgress <= 50) {
    const moverSlot = getBoardSlotForSeat(turnIdx, totalPlayers);
    const trackIdx = getLudoTrackIndex(moverSlot, newProgress);
    if (trackIdx !== null && !LUDO_SAFE_TRACK_INDICES.has(trackIdx)) {
      for (let otherSeat = 0; otherSeat < totalPlayers; otherSeat++) {
        if (otherSeat === turnIdx) continue;
        const otherSlot = getBoardSlotForSeat(otherSeat, totalPlayers);
        for (const otherPawn of nextPawns[otherSeat]) {
          const otherTrackIdx = getLudoTrackIndex(otherSlot, otherPawn.progress);
          if (otherTrackIdx === trackIdx) {
            otherPawn.progress = -1;
            captured = true;
            captureDesc = ` و مهره ${state.players[otherSeat].name} را زد!`;
          }
        }
      }
    }
  }

  // Check win condition (all 4 pawns at 56)
  const hasWon = nextPawns[turnIdx].every((p) => p.progress === 56);
  if (hasWon) {
    return {
      state: {
        ...state,
        pawns: nextPawns,
        phase: 'finished',
        validPawnIds: [],
        winnerIndex: turnIdx,
        lastEvent: `${currentPlayer.name} برنده بازی منچ شد!`,
      },
      captured,
      finishedPawn,
    };
  }

  // Bonus turn on 6, capture, or reaching home center
  const bonusTurn = dice === 6 || captured || finishedPawn;
  const nextTurn = bonusTurn ? turnIdx : (turnIdx + 1) % totalPlayers;
  const nextSixes = bonusTurn ? state.consecutiveSixes : 0;

  let msg = `${currentPlayer.name} مهره را حرکت داد${captureDesc}`;
  if (finishedPawn) msg = `${currentPlayer.name} یک مهره را به خانه پایانی رساند!`;
  if (bonusTurn) {
    msg += ` جایزه نوبت مجدد برای ${currentPlayer.name}!`;
  } else {
    msg += ` نوبت ${state.players[nextTurn].name}.`;
  }

  return {
    state: {
      ...state,
      pawns: nextPawns,
      turnIndex: nextTurn,
      phase: 'roll',
      diceValue: null,
      consecutiveSixes: nextSixes,
      validPawnIds: [],
      turnCount: state.turnCount + 1,
      lastEvent: msg,
    },
    captured,
    finishedPawn,
  };
}

export function chooseLudoAIPawn(state: LudoState): number | null {
  if (state.validPawnIds.length === 0 || state.diceValue === null) return null;
  const dice = state.diceValue;
  const turnIdx = state.turnIndex;
  const totalPlayers = state.players.length;
  const moverSlot = getBoardSlotForSeat(turnIdx, totalPlayers);

  let bestId = state.validPawnIds[0];
  let bestScore = -Infinity;

  for (const id of state.validPawnIds) {
    const pawn = state.pawns[turnIdx].find((p) => p.id === id)!;
    const nextProg = pawn.progress === -1 ? 0 : pawn.progress + dice;
    let score = nextProg;

    if (pawn.progress === -1 && dice === 6) score += 85;
    if (nextProg === 56) score += 120;
    if (nextProg >= 51) score += 45;

    const trackIdx = getLudoTrackIndex(moverSlot, nextProg);
    if (trackIdx !== null) {
      if (LUDO_SAFE_TRACK_INDICES.has(trackIdx)) score += 30;
      else {
        for (let other = 0; other < totalPlayers; other++) {
          if (other === turnIdx) continue;
          const otherSlot = getBoardSlotForSeat(other, totalPlayers);
          for (const op of state.pawns[other]) {
            if (getLudoTrackIndex(otherSlot, op.progress) === trackIdx) {
              score += 140; // Prioritize capturing!
            }
          }
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestId = id;
    }
  }

  return bestId;
}
