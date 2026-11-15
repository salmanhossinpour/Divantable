import express from 'express';
import { createServer as createHttpServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import {
  createLudoState,
  rollLudoDice,
  moveLudoPawn,
  chooseLudoAIPawn,
  LUDO_COLORS,
} from './src/game/ludoEngine.ts';
import {
  createSnakesState,
  rollSnakesDice,
} from './src/game/snakesEngine.ts';
import {
  createBackgammonState,
  rollBackgammonDice,
  applyBackgammonMove,
  chooseBackgammonAIMove,
} from './src/game/backgammonEngine.ts';
import {
  createChessState,
  applyChessMove,
  chooseChessAIMove,
} from './src/game/chessEngine.ts';
import {
  createOthelloState,
  applyOthelloMove,
  chooseOthelloAIMove,
} from './src/game/othelloEngine.ts';
import {
  createConnect4State,
  dropConnect4Token,
  chooseConnect4AICol,
} from './src/game/connect4Engine.ts';
import {
  createCheckersState,
  applyCheckersMove,
  chooseCheckersAIMove,
} from './src/game/checkersEngine.ts';
import {
  createMorrisState,
  applyMorrisAction,
  chooseMorrisAIAction,
} from './src/game/morrisEngine.ts';
import {
  createMancalaState,
  sowMancalaPit,
  chooseMancalaAIPit,
} from './src/game/mancalaEngine.ts';
import {
  createMastermindState,
  setMastermindSecret,
  submitMastermindGuess,
} from './src/game/mastermindEngine.ts';
import type {
  ClientMessage,
  GameType,
  PlayerColor,
  PlayerSeat,
  RoomSummary,
  ServerMessage,
  UnifiedGameState,
} from './src/game/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RoomMember {
  id: string;
  name: string;
  color: PlayerColor;
  connected: boolean;
  ws: WebSocket | null;
}

interface RoomRecord {
  code: string;
  gameType: GameType;
  maxPlayers: number;
  hostId: string;
  hostName: string;
  members: RoomMember[];
  status: 'waiting' | 'playing' | 'finished';
  state: UnifiedGameState | null;
  createdAt: number;
  aiTimer: ReturnType<typeof setTimeout> | null;
}

const rooms = new Map<string, RoomRecord>();
const clientSockets = new Map<WebSocket, { playerId?: string; roomCode?: string }>();

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateRoomCode(): string {
  let code = '';
  do {
    code = Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function getColorsForGame(gameType: GameType, maxPlayers: number): PlayerColor[] {
  if (
    gameType === 'backgammon' ||
    gameType === 'chess' ||
    gameType === 'othello' ||
    gameType === 'checkers' ||
    gameType === 'morris' ||
    gameType === 'mancala' ||
    gameType === 'mastermind'
  ) {
    return ['ivory', 'ebony'];
  }
  if (gameType === 'connect4') return ['red', 'yellow'];
  if (gameType === 'ludo' && maxPlayers === 2) return ['red', 'yellow'];
  return LUDO_COLORS;
}

function toRoomSummary(room: RoomRecord): RoomSummary {
  return {
    code: room.code,
    gameType: room.gameType,
    maxPlayers: room.maxPlayers,
    hostName: room.hostName,
    players: room.members.map((m) => ({
      id: m.id,
      name: m.name,
      color: m.color,
      connected: m.connected,
    })),
    status: room.status,
    createdAt: room.createdAt,
  };
}

function send(ws: WebSocket | null, msg: ServerMessage) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function sanitizeStateForSeat(state: UnifiedGameState, seatIndex: number): UnifiedGameState {
  if (state.gameType === 'mastermind' && state.phase !== 'finished' && seatIndex === 0) {
    return { ...state, secret: [-1, -1, -1, -1] };
  }
  return state;
}

function broadcastToRoom(room: RoomRecord, msg: ServerMessage) {
  for (const m of room.members) {
    send(m.ws, msg);
  }
}

function broadcastRoomGameState(room: RoomRecord) {
  if (!room.state) return;
  room.members.forEach((m, idx) => {
    send(m.ws, {
      type: 'game_state',
      state: sanitizeStateForSeat(room.state!, idx),
      roomCode: room.code,
    });
  });
}

function broadcastRoomsList() {
  const list = Array.from(rooms.values())
    .filter((r) => r.status === 'waiting')
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(toRoomSummary);

  const payload: ServerMessage = { type: 'rooms_list', rooms: list };
  for (const ws of clientSockets.keys()) {
    send(ws, payload);
  }
}

function scheduleRoomAI(room: RoomRecord) {
  if (room.aiTimer) {
    clearTimeout(room.aiTimer);
    room.aiTimer = null;
  }
  if (!room.state || room.state.phase === 'finished') {
    if (room.state?.phase === 'finished') {
      room.status = 'finished';
      broadcastToRoom(room, { type: 'room_updated', room: toRoomSummary(room) });
    }
    return;
  }

  const currentSeat = room.state.players[room.state.turnIndex];
  if (!currentSeat || !currentSeat.isAI) return;

  room.aiTimer = setTimeout(() => {
    room.aiTimer = null;
    if (!room.state || room.state.phase === 'finished') return;
    const activeSeat = room.state.players[room.state.turnIndex];
    if (!activeSeat || !activeSeat.isAI) return;

    if (room.state.gameType === 'ludo') {
      if (room.state.phase === 'roll') {
        room.state = rollLudoDice(room.state);
      } else if (room.state.phase === 'move') {
        const pawnId = chooseLudoAIPawn(room.state);
        if (pawnId !== null) {
          room.state = moveLudoPawn(room.state, pawnId).state;
        }
      }
    } else if (room.state.gameType === 'snakes') {
      if (room.state.phase === 'roll') {
        room.state = rollSnakesDice(room.state);
      }
    } else if (room.state.gameType === 'backgammon') {
      if (room.state.phase === 'roll') {
        room.state = rollBackgammonDice(room.state);
      } else if (room.state.phase === 'move') {
        const move = chooseBackgammonAIMove(room.state);
        if (move) {
          room.state = applyBackgammonMove(room.state, move.from, move.to).state;
        }
      }
    } else if (room.state.gameType === 'chess') {
      const move = chooseChessAIMove(room.state);
      if (move) {
        room.state = applyChessMove(room.state, move.fromRow, move.fromCol, move.toRow, move.toCol).state;
      }
    } else if (room.state.gameType === 'othello') {
      const cell = chooseOthelloAIMove(room.state);
      if (cell) {
        room.state = applyOthelloMove(room.state, cell[0], cell[1]).state;
      }
    } else if (room.state.gameType === 'connect4') {
      const col = chooseConnect4AICol(room.state);
      if (col !== null) {
        room.state = dropConnect4Token(room.state, col);
      }
    } else if (room.state.gameType === 'checkers') {
      const move = chooseCheckersAIMove(room.state);
      if (move) {
        room.state = applyCheckersMove(room.state, move.fromRow, move.fromCol, move.toRow, move.toCol).state;
      }
    } else if (room.state.gameType === 'morris') {
      const act = chooseMorrisAIAction(room.state);
      if (act) {
        room.state = applyMorrisAction(room.state, act.to, act.from);
      }
    } else if (room.state.gameType === 'mancala') {
      const pit = chooseMancalaAIPit(room.state);
      if (pit !== null) {
        room.state = sowMancalaPit(room.state, pit);
      }
    }

    broadcastRoomGameState(room);
    scheduleRoomAI(room);
  }, 750);
}

function handleClientMessage(ws: WebSocket, raw: string) {
  let msg: ClientMessage;
  try {
    msg = JSON.parse(raw) as ClientMessage;
  } catch {
    send(ws, { type: 'error', message: 'پیام نامعتبر است.' });
    return;
  }

  const meta = clientSockets.get(ws) ?? {};

  if (msg.type === 'list_rooms') {
    const list = Array.from(rooms.values())
      .filter((r) => r.status === 'waiting')
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(toRoomSummary);
    send(ws, { type: 'rooms_list', rooms: list });
    return;
  }

  if (msg.type === 'create_room') {
    const isTwoPlayerOnly =
      msg.gameType === 'backgammon' ||
      msg.gameType === 'chess' ||
      msg.gameType === 'othello' ||
      msg.gameType === 'connect4' ||
      msg.gameType === 'checkers' ||
      msg.gameType === 'morris' ||
      msg.gameType === 'mancala' ||
      msg.gameType === 'mastermind';
    const maxP = isTwoPlayerOnly ? 2 : Math.min(4, Math.max(2, msg.maxPlayers));
    const colors = getColorsForGame(msg.gameType, maxP);
    const code = generateRoomCode();
    const hostName = msg.playerName.trim() || 'میزبان';

    const room: RoomRecord = {
      code,
      gameType: msg.gameType,
      maxPlayers: maxP,
      hostId: msg.playerId,
      hostName,
      members: [
        {
          id: msg.playerId,
          name: hostName,
          color: colors[0],
          connected: true,
          ws,
        },
      ],
      status: 'waiting',
      state: null,
      createdAt: Date.now(),
      aiTimer: null,
    };

    rooms.set(code, room);
    meta.playerId = msg.playerId;
    meta.roomCode = code;
    clientSockets.set(ws, meta);

    send(ws, { type: 'room_joined', room: toRoomSummary(room), seatIndex: 0 });
    broadcastRoomsList();
    return;
  }

  if (msg.type === 'join_room') {
    const code = msg.code.trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      send(ws, { type: 'error', message: 'اتاق با این کد پیدا نشد.' });
      return;
    }

    // Reconnect check
    const existingIdx = room.members.findIndex((m) => m.id === msg.playerId);
    if (existingIdx !== -1) {
      room.members[existingIdx].ws = ws;
      room.members[existingIdx].connected = true;
      if (room.state) {
        room.state.players[existingIdx].connected = true;
      }
      meta.playerId = msg.playerId;
      meta.roomCode = code;
      clientSockets.set(ws, meta);
      send(ws, { type: 'room_joined', room: toRoomSummary(room), seatIndex: existingIdx });
      broadcastToRoom(room, { type: 'room_updated', room: toRoomSummary(room) });
      if (room.state) {
        send(ws, {
          type: 'game_state',
          state: sanitizeStateForSeat(room.state, existingIdx),
          roomCode: room.code,
        });
      }
      return;
    }

    if (room.status !== 'waiting') {
      send(ws, { type: 'error', message: 'این بازی هم‌اکنون در حال اجراست.' });
      return;
    }
    if (room.members.length >= room.maxPlayers) {
      send(ws, { type: 'error', message: 'ظرفیت اتاق تکمیل است.' });
      return;
    }

    const colors = getColorsForGame(room.gameType, room.maxPlayers);
    const seatIndex = room.members.length;
    const playerName = msg.playerName.trim() || `بازیکن ${seatIndex + 1}`;
    room.members.push({
      id: msg.playerId,
      name: playerName,
      color: colors[seatIndex],
      connected: true,
      ws,
    });

    meta.playerId = msg.playerId;
    meta.roomCode = code;
    clientSockets.set(ws, meta);

    send(ws, { type: 'room_joined', room: toRoomSummary(room), seatIndex });
    broadcastToRoom(room, { type: 'room_updated', room: toRoomSummary(room) });
    broadcastRoomsList();
    return;
  }

  if (msg.type === 'leave_room') {
    const room = rooms.get(msg.code);
    if (!room) return;
    room.members = room.members.filter((m) => m.id !== msg.playerId);
    meta.roomCode = undefined;
    clientSockets.set(ws, meta);

    if (room.members.length === 0) {
      if (room.aiTimer) clearTimeout(room.aiTimer);
      rooms.delete(room.code);
    } else {
      if (room.hostId === msg.playerId) {
        room.hostId = room.members[0].id;
        room.hostName = room.members[0].name;
      }
      broadcastToRoom(room, { type: 'room_updated', room: toRoomSummary(room) });
    }
    broadcastRoomsList();
    return;
  }

  if (msg.type === 'start_room') {
    const room = rooms.get(msg.code);
    if (!room) return;
    if (room.hostId !== msg.playerId) {
      send(ws, { type: 'error', message: 'فقط میزبان می‌تواند بازی را شروع کند.' });
      return;
    }

    const colors = getColorsForGame(room.gameType, room.maxPlayers);
    const seats: PlayerSeat[] = room.members.map((m, idx) => ({
      seatIndex: idx,
      id: m.id,
      name: m.name,
      color: colors[idx],
      isAI: false,
      connected: m.connected,
    }));

    const targetCount = msg.fillWithAI ? room.maxPlayers : Math.max(2, seats.length);
    if (seats.length < 2 && !msg.fillWithAI) {
      send(ws, { type: 'error', message: 'حداقل ۲ بازیکن برای شروع نیاز است یا گزینه ربات را فعال کنید.' });
      return;
    }

    while (seats.length < targetCount) {
      const idx = seats.length;
      seats.push({
        seatIndex: idx,
        id: `ai-${idx}`,
        name: `ربات ${idx + 1}`,
        color: colors[idx],
        isAI: true,
        connected: true,
      });
    }

    if (room.gameType === 'ludo') {
      room.state = createLudoState(seats);
    } else if (room.gameType === 'snakes') {
      room.state = createSnakesState(seats);
    } else if (room.gameType === 'backgammon') {
      room.state = createBackgammonState(seats);
    } else if (room.gameType === 'chess') {
      room.state = createChessState(seats);
    } else if (room.gameType === 'othello') {
      room.state = createOthelloState(seats);
    } else if (room.gameType === 'connect4') {
      room.state = createConnect4State(seats);
    } else if (room.gameType === 'checkers') {
      room.state = createCheckersState(seats);
    } else if (room.gameType === 'morris') {
      room.state = createMorrisState(seats);
    } else if (room.gameType === 'mancala') {
      room.state = createMancalaState(seats);
    } else {
      room.state = createMastermindState(seats);
    }

    room.status = 'playing';
    broadcastToRoom(room, { type: 'room_updated', room: toRoomSummary(room) });
    broadcastRoomGameState(room);
    broadcastRoomsList();
    scheduleRoomAI(room);
    return;
  }

  // In-game authoritative actions
  if (
    msg.type === 'roll_dice' ||
    msg.type === 'ludo_move' ||
    msg.type === 'backgammon_move' ||
    msg.type === 'chess_move' ||
    msg.type === 'othello_move' ||
    msg.type === 'connect4_drop' ||
    msg.type === 'checkers_move' ||
    msg.type === 'morris_action' ||
    msg.type === 'mancala_sow' ||
    msg.type === 'mastermind_secret' ||
    msg.type === 'mastermind_guess'
  ) {
    const room = rooms.get(msg.code);
    if (!room || !room.state || room.state.phase === 'finished') return;

    const currentSeat = room.state.players[room.state.turnIndex];
    if (!currentSeat || currentSeat.id !== msg.playerId) {
      send(ws, { type: 'error', message: 'اکنون نوبت شما نیست.' });
      return;
    }

    if (msg.type === 'roll_dice') {
      if (room.state.gameType === 'ludo' && room.state.phase === 'roll') {
        room.state = rollLudoDice(room.state);
      } else if (room.state.gameType === 'snakes' && room.state.phase === 'roll') {
        room.state = rollSnakesDice(room.state);
      } else if (room.state.gameType === 'backgammon' && room.state.phase === 'roll') {
        room.state = rollBackgammonDice(room.state);
      }
    } else if (msg.type === 'ludo_move' && room.state.gameType === 'ludo') {
      room.state = moveLudoPawn(room.state, msg.pawnId).state;
    } else if (msg.type === 'backgammon_move' && room.state.gameType === 'backgammon') {
      room.state = applyBackgammonMove(room.state, msg.from, msg.to).state;
    } else if (msg.type === 'chess_move' && room.state.gameType === 'chess') {
      room.state = applyChessMove(room.state, msg.fromRow, msg.fromCol, msg.toRow, msg.toCol).state;
    } else if (msg.type === 'othello_move' && room.state.gameType === 'othello') {
      room.state = applyOthelloMove(room.state, msg.row, msg.col).state;
    } else if (msg.type === 'connect4_drop' && room.state.gameType === 'connect4') {
      room.state = dropConnect4Token(room.state, msg.col);
    } else if (msg.type === 'checkers_move' && room.state.gameType === 'checkers') {
      room.state = applyCheckersMove(room.state, msg.fromRow, msg.fromCol, msg.toRow, msg.toCol).state;
    } else if (msg.type === 'morris_action' && room.state.gameType === 'morris') {
      room.state = applyMorrisAction(room.state, msg.to, msg.from);
    } else if (msg.type === 'mancala_sow' && room.state.gameType === 'mancala') {
      room.state = sowMancalaPit(room.state, msg.pitIndex);
    } else if (msg.type === 'mastermind_secret' && room.state.gameType === 'mastermind') {
      room.state = setMastermindSecret(room.state, msg.secret);
    } else if (msg.type === 'mastermind_guess' && room.state.gameType === 'mastermind') {
      room.state = submitMastermindGuess(room.state, msg.guess);
    }

    broadcastRoomGameState(room);
    scheduleRoomAI(room);
  }
}

async function startServer() {
  const app = express();
  const httpServer = createHttpServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, rooms: rooms.size });
  });

  app.get('/api/rooms', (_req, res) => {
    const list = Array.from(rooms.values())
      .filter((r) => r.status === 'waiting')
      .map(toRoomSummary);
    res.json({ rooms: list });
  });

  wss.on('connection', (ws) => {
    clientSockets.set(ws, {});
    ws.on('message', (data) => {
      handleClientMessage(ws, String(data));
    });
    ws.on('close', () => {
      const meta = clientSockets.get(ws);
      clientSockets.delete(ws);
      if (meta?.roomCode && meta.playerId) {
        const room = rooms.get(meta.roomCode);
        if (room) {
          const member = room.members.find((m) => m.id === meta.playerId);
          if (member) {
            member.connected = false;
            member.ws = null;
          }
          if (room.state) {
            const seat = room.state.players.find((p) => p.id === meta.playerId);
            if (seat) seat.connected = false;
          }
          broadcastToRoom(room, { type: 'room_updated', room: toRoomSummary(room) });
        }
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Divan 3D Tabletop Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
