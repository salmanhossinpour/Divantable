import type { MastermindState, PlayerSeat } from './types.ts';

export const MASTERMIND_COLORS = [
  { id: 0, nameFa: 'قرمز', hex: 0xc93b31, css: '#c93b31' },
  { id: 1, nameFa: 'آبی', hex: 0x266d94, css: '#266d94' },
  { id: 2, nameFa: 'سبز', hex: 0x2c7d50, css: '#2c7d50' },
  { id: 3, nameFa: 'زرد', hex: 0xdca028, css: '#dca028' },
  { id: 4, nameFa: 'نارنجی', hex: 0xd96b27, css: '#d96b27' },
  { id: 5, nameFa: 'بنفش', hex: 0x7b4b94, css: '#7b4b94' },
] as const;

export function generateRandomMastermindSecret(): [number, number, number, number] {
  return [
    Math.floor(Math.random() * 6),
    Math.floor(Math.random() * 6),
    Math.floor(Math.random() * 6),
    Math.floor(Math.random() * 6),
  ];
}

export function isValidMastermindTuple(arr: number[]): arr is [number, number, number, number] {
  return (
    Array.isArray(arr) &&
    arr.length === 4 &&
    arr.every((v) => Number.isInteger(v) && v >= 0 && v < 6)
  );
}

export function evaluateMastermindGuess(
  secret: [number, number, number, number],
  guess: [number, number, number, number]
): { exact: number; misplaced: number } {
  let exact = 0;
  const secretRem = Array(6).fill(0);
  const guessRem = Array(6).fill(0);

  for (let i = 0; i < 4; i++) {
    if (guess[i] === secret[i]) {
      exact++;
    } else {
      if (secret[i] >= 0 && secret[i] < 6) secretRem[secret[i]]++;
      if (guess[i] >= 0 && guess[i] < 6) guessRem[guess[i]]++;
    }
  }

  let misplaced = 0;
  for (let c = 0; c < 6; c++) {
    misplaced += Math.min(secretRem[c], guessRem[c]);
  }

  return { exact, misplaced };
}

export function createMastermindState(players: PlayerSeat[]): MastermindState {
  const p2 = players.slice(0, 2);
  const aiMaker = Boolean(p2[1]?.isAI);

  if (aiMaker) {
    return {
      gameType: 'mastermind',
      players: p2,
      secret: generateRandomMastermindSecret(),
      attempts: [],
      maxAttempts: 10,
      turnIndex: 0,
      phase: 'move',
      subPhase: 'guess',
      winnerIndex: null,
      lastEvent: `ربات رمز ۴ رنگی را انتخاب کرد. در ۱۰ فرصت آن را کشف کنید!`,
      turnCount: 1,
    };
  }

  return {
    gameType: 'mastermind',
    players: p2,
    secret: [-1, -1, -1, -1],
    attempts: [],
    maxAttempts: 10,
    turnIndex: 1,
    phase: 'move',
    subPhase: 'set_secret',
    winnerIndex: null,
    lastEvent: `نوبت ${p2[1]?.name ?? 'طراح کد'} است: ۴ رنگ مخفی را تعیین کنید.`,
    turnCount: 1,
  };
}

export function setMastermindSecret(
  state: MastermindState,
  secret: [number, number, number, number]
): MastermindState {
  if (state.phase !== 'move' || state.subPhase !== 'set_secret') return state;
  if (!isValidMastermindTuple(secret)) return state;

  return {
    ...state,
    secret: [...secret] as [number, number, number, number],
    subPhase: 'guess',
    turnIndex: 0,
    lastEvent: `رمز مخفی ثبت شد! نوبت ${state.players[0]?.name ?? 'رمزگشا'} برای حدس اول است.`,
  };
}

export function submitMastermindGuess(
  state: MastermindState,
  guess: [number, number, number, number]
): MastermindState {
  if (state.phase !== 'move' || state.subPhase !== 'guess') return state;
  if (!isValidMastermindTuple(guess)) return state;
  if (state.attempts.length >= state.maxAttempts) return state;

  const { exact, misplaced } = evaluateMastermindGuess(state.secret, guess);
  const nextAttempts = [
    ...state.attempts,
    { guess: [...guess] as [number, number, number, number], exact, misplaced },
  ];

  const breakerName = state.players[0]?.name ?? 'رمزگشا';
  const makerName = state.players[1]?.name ?? 'طراح کد';

  if (exact === 4) {
    return {
      ...state,
      attempts: nextAttempts,
      phase: 'finished',
      winnerIndex: 0,
      turnCount: nextAttempts.length,
      lastEvent: `آفرین! ${breakerName} رمز فکروبکر را در تلاش ${nextAttempts.length} کشف کرد!`,
    };
  }

  if (nextAttempts.length >= state.maxAttempts) {
    return {
      ...state,
      attempts: nextAttempts,
      phase: 'finished',
      winnerIndex: 1,
      turnCount: nextAttempts.length,
      lastEvent: `پایان ۱۰ فرصت! ${makerName} با رمز شکست‌ناپذیر برنده شد.`,
    };
  }

  return {
    ...state,
    attempts: nextAttempts,
    turnCount: nextAttempts.length + 1,
    lastEvent: `تلاش ${nextAttempts.length}: ${exact} دقیق (سیاه) · ${misplaced} جابه‌جا (سفید)`,
  };
}
