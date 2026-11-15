import type { PlayerSeat, SnakesState } from './types.ts';

export const LADDERS: Record<number, number> = {
  4: 25,
  13: 46,
  33: 49,
  42: 63,
  50: 69,
  62: 81,
  74: 92,
};

export const SNAKES: Record<number, number> = {
  27: 5,
  40: 3,
  43: 18,
  54: 31,
  66: 45,
  76: 58,
  89: 53,
  99: 41,
};

// Returns [row, col] on 10x10 board where row 9 is bottom (squares 1..10) and row 0 is top (squares 91..100)
export function getSnakeBoardCoords(square: number): [number, number] {
  if (square <= 0) return [9.6, -0.6];
  const clamped = Math.min(100, Math.max(1, square));
  const zeroBased = clamped - 1;
  const rowFromBottom = Math.floor(zeroBased / 10);
  const colInRow = zeroBased % 10;
  const col = rowFromBottom % 2 === 0 ? colInRow : 9 - colInRow;
  const row = 9 - rowFromBottom;
  return [row, col];
}

export function createSnakesState(players: PlayerSeat[]): SnakesState {
  return {
    gameType: 'snakes',
    players,
    positions: players.map(() => 0),
    turnIndex: 0,
    phase: 'roll',
    diceValue: null,
    winnerIndex: null,
    lastEvent: `نوبت ${players[0]?.name ?? 'بازیکن ۱'} است. تاس بریزید!`,
    lastJump: null,
    turnCount: 1,
  };
}

export function rollSnakesDice(state: SnakesState, forcedRoll?: number): SnakesState {
  if (state.phase !== 'roll' || state.winnerIndex !== null) return state;

  const dice = forcedRoll ?? (Math.floor(Math.random() * 6) + 1);
  const turnIdx = state.turnIndex;
  const player = state.players[turnIdx];
  const currentPos = state.positions[turnIdx];
  const nextPositions = [...state.positions];
  let jump: SnakesState['lastJump'] = null;

  if (currentPos + dice > 100) {
    const nextTurn = (turnIdx + 1) % state.players.length;
    return {
      ...state,
      diceValue: dice,
      turnIndex: nextTurn,
      lastJump: null,
      turnCount: state.turnCount + 1,
      lastEvent: `${player.name} عدد ${dice} آورد اما برای خانه ۱۰۰ دقیق نیست. نوبت ${state.players[nextTurn].name}.`,
    };
  }

  let landing = currentPos + dice;
  let extraMsg = '';

  if (LADDERS[landing]) {
    const dest = LADDERS[landing];
    jump = { from: landing, to: dest, type: 'ladder', seatIndex: turnIdx };
    extraMsg = ` و از نردبان خانه ${landing} به ${dest} بالا رفت!`;
    landing = dest;
  } else if (SNAKES[landing]) {
    const dest = SNAKES[landing];
    jump = { from: landing, to: dest, type: 'snake', seatIndex: turnIdx };
    extraMsg = ` اما نیش مار ${landing} او را به ${dest} پایین برد!`;
    landing = dest;
  }

  nextPositions[turnIdx] = landing;

  if (landing === 100) {
    return {
      ...state,
      positions: nextPositions,
      diceValue: dice,
      phase: 'finished',
      winnerIndex: turnIdx,
      lastJump: jump,
      lastEvent: `${player.name} با عدد ${dice} به خانه ۱۰۰ رسید و برنده شد!`,
    };
  }

  const bonusTurn = dice === 6;
  const nextTurn = bonusTurn ? turnIdx : (turnIdx + 1) % state.players.length;

  return {
    ...state,
    positions: nextPositions,
    diceValue: dice,
    turnIndex: nextTurn,
    lastJump: jump,
    turnCount: state.turnCount + 1,
    lastEvent: `${player.name} عدد ${dice} آورد (خانه ${landing})${extraMsg}${bonusTurn ? ` جایزه ۶: نوبت مجدد!` : ` نوبت ${state.players[nextTurn].name}.`}`,
  };
}
