export type GameType =
  | 'ludo'
  | 'snakes'
  | 'backgammon'
  | 'chess'
  | 'othello'
  | 'connect4'
  | 'checkers'
  | 'morris'
  | 'mancala'
  | 'mastermind';
export type PlayMode = 'ai' | 'local' | 'online';
export type PlayerColor = 'red' | 'blue' | 'yellow' | 'green' | 'ivory' | 'ebony';

export interface PlayerSeat {
  seatIndex: number;
  id: string;
  name: string;
  color: PlayerColor;
  isAI: boolean;
  connected: boolean;
}

export interface LudoPawn {
  id: number; // 0..3
  progress: number; // -1 = yard, 0..50 = outer track, 51..55 = home stretch, 56 = finished
}

export interface LudoState {
  gameType: 'ludo';
  players: PlayerSeat[];
  pawns: LudoPawn[][]; // [seatIndex][0..3]
  turnIndex: number;
  phase: 'roll' | 'move' | 'finished';
  diceValue: number | null;
  consecutiveSixes: number;
  validPawnIds: number[];
  winnerIndex: number | null;
  lastEvent: string;
  turnCount: number;
}

export interface SnakesState {
  gameType: 'snakes';
  players: PlayerSeat[];
  positions: number[]; // 0 = start, 1..100 = board square
  turnIndex: number;
  phase: 'roll' | 'finished';
  diceValue: number | null;
  winnerIndex: number | null;
  lastEvent: string;
  lastJump: { from: number; to: number; type: 'ladder' | 'snake'; seatIndex: number } | null;
  turnCount: number;
}

export interface BackgammonPoint {
  owner: 0 | 1 | null;
  count: number;
}

export interface BackgammonMove {
  from: number; // 0 = bar for P1 / 25 = bar for P0, 1..24 = point
  to: number; // 0 = bearoff for P0, 25 = bearoff for P1, 1..24 = point
  die: number;
  isHit: boolean;
}

export interface BackgammonState {
  gameType: 'backgammon';
  players: PlayerSeat[];
  points: BackgammonPoint[]; // length 26, indices 1..24 used
  bar: [number, number];
  borneOff: [number, number];
  turnIndex: 0 | 1;
  phase: 'roll' | 'move' | 'finished';
  dice: number[];
  remainingDice: number[];
  legalMoves: BackgammonMove[];
  winnerIndex: 0 | 1 | null;
  winType: 'normal' | 'gammon' | 'backgammon' | null;
  lastEvent: string;
  turnCount: number;
}

export type ChessPieceKind = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface ChessPiece {
  id: string;
  owner: 0 | 1; // 0 = ivory (bottom, rows 6-7), 1 = ebony (top, rows 0-1)
  kind: ChessPieceKind;
}

export interface ChessMove {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  isCastle?: 'king' | 'queen';
  isEnPassant?: boolean;
  promotion?: ChessPieceKind;
}

export interface ChessState {
  gameType: 'chess';
  players: PlayerSeat[];
  board: (ChessPiece | null)[][]; // 8x8
  turnIndex: 0 | 1;
  phase: 'move' | 'finished';
  castling: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
  enPassant: [number, number] | null;
  inCheck: boolean;
  legalMoves: ChessMove[];
  winnerIndex: 0 | 1 | null;
  isDraw: boolean;
  lastMove: { fromRow: number; fromCol: number; toRow: number; toCol: number } | null;
  lastEvent: string;
  turnCount: number;
}

export interface OthelloState {
  gameType: 'othello';
  players: PlayerSeat[];
  board: (0 | 1 | null)[][]; // 8x8: 0 = ivory, 1 = ebony
  turnIndex: 0 | 1;
  phase: 'move' | 'finished';
  legalMoves: [number, number][];
  scores: [number, number];
  winnerIndex: 0 | 1 | null;
  isDraw: boolean;
  lastMove: [number, number] | null;
  lastEvent: string;
  turnCount: number;
}

export interface Connect4State {
  gameType: 'connect4';
  players: PlayerSeat[];
  board: (0 | 1 | null)[][]; // 6 rows (0 = top, 5 = bottom) x 7 cols
  turnIndex: 0 | 1;
  phase: 'move' | 'finished';
  winnerIndex: 0 | 1 | null;
  isDraw: boolean;
  winningCells: [number, number][];
  lastMove: [number, number] | null;
  lastEvent: string;
  turnCount: number;
}

export interface CheckersPiece {
  id: string;
  owner: 0 | 1; // 0 = ivory (bottom rows 5-7, moves up), 1 = ebony (top rows 0-2, moves down)
  isKing: boolean;
}

export interface CheckersMove {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  captured?: [number, number];
}

export interface CheckersState {
  gameType: 'checkers';
  players: PlayerSeat[];
  board: (CheckersPiece | null)[][]; // 8x8
  turnIndex: 0 | 1;
  phase: 'move' | 'finished';
  mustJumpFrom: [number, number] | null;
  legalMoves: CheckersMove[];
  winnerIndex: 0 | 1 | null;
  lastEvent: string;
  turnCount: number;
}

export interface MorrisMove {
  from?: number;
  to: number;
}

export interface MorrisState {
  gameType: 'morris';
  players: PlayerSeat[];
  nodes: (0 | 1 | null)[]; // 24 nodes (0..23)
  turnIndex: 0 | 1;
  phase: 'move' | 'finished';
  subPhase: 'place' | 'slide' | 'remove';
  toPlace: [number, number];
  counts: [number, number];
  legalMoves: MorrisMove[];
  winnerIndex: 0 | 1 | null;
  lastEvent: string;
  turnCount: number;
}

export interface MancalaState {
  gameType: 'mancala';
  players: PlayerSeat[];
  pits: number[]; // length 14: 0..5 P0 pits, 6 P0 store, 7..12 P1 pits, 13 P1 store
  turnIndex: 0 | 1;
  phase: 'move' | 'finished';
  winnerIndex: 0 | 1 | null;
  isDraw: boolean;
  lastSownPit: number | null;
  lastEvent: string;
  turnCount: number;
}

export interface MastermindAttempt {
  guess: [number, number, number, number];
  exact: number;
  misplaced: number;
}

export interface MastermindState {
  gameType: 'mastermind';
  players: PlayerSeat[];
  secret: [number, number, number, number]; // -1 when masked for remote breaker
  attempts: MastermindAttempt[];
  maxAttempts: number;
  turnIndex: 0 | 1; // 0 = code-breaker, 1 = code-maker (during set_secret)
  phase: 'move' | 'finished';
  subPhase: 'set_secret' | 'guess';
  winnerIndex: 0 | 1 | null;
  lastEvent: string;
  turnCount: number;
}

export type UnifiedGameState =
  | LudoState
  | SnakesState
  | BackgammonState
  | ChessState
  | OthelloState
  | Connect4State
  | CheckersState
  | MorrisState
  | MancalaState
  | MastermindState;

export interface RoomSummary {
  code: string;
  gameType: GameType;
  maxPlayers: number;
  hostName: string;
  players: { id: string; name: string; color: PlayerColor; connected: boolean }[];
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
}

export type ClientMessage =
  | { type: 'list_rooms' }
  | { type: 'create_room'; gameType: GameType; maxPlayers: number; playerName: string; playerId: string }
  | { type: 'join_room'; code: string; playerName: string; playerId: string }
  | { type: 'leave_room'; code: string; playerId: string }
  | { type: 'start_room'; code: string; playerId: string; fillWithAI: boolean }
  | { type: 'roll_dice'; code: string; playerId: string }
  | { type: 'ludo_move'; code: string; playerId: string; pawnId: number }
  | { type: 'backgammon_move'; code: string; playerId: string; from: number; to: number }
  | { type: 'chess_move'; code: string; playerId: string; fromRow: number; fromCol: number; toRow: number; toCol: number }
  | { type: 'othello_move'; code: string; playerId: string; row: number; col: number }
  | { type: 'connect4_drop'; code: string; playerId: string; col: number }
  | { type: 'checkers_move'; code: string; playerId: string; fromRow: number; fromCol: number; toRow: number; toCol: number }
  | { type: 'morris_action'; code: string; playerId: string; to: number; from?: number }
  | { type: 'mancala_sow'; code: string; playerId: string; pitIndex: number }
  | { type: 'mastermind_secret'; code: string; playerId: string; secret: [number, number, number, number] }
  | { type: 'mastermind_guess'; code: string; playerId: string; guess: [number, number, number, number] };

export type ServerMessage =
  | { type: 'rooms_list'; rooms: RoomSummary[] }
  | { type: 'room_joined'; room: RoomSummary; seatIndex: number }
  | { type: 'room_updated'; room: RoomSummary }
  | { type: 'game_state'; state: UnifiedGameState; roomCode: string }
  | { type: 'error'; message: string };
