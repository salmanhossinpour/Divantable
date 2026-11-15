import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ClientMessage,
  GameType,
  RoomSummary,
  ServerMessage,
  UnifiedGameState,
} from '../game/types.ts';

function getOrCreatePlayerId(): string {
  if (typeof window === 'undefined') return 'player-ssr';
  const existing = window.sessionStorage.getItem('divan_player_id');
  if (existing) return existing;
  const fresh = 'pl-' + Math.random().toString(36).slice(2, 10);
  window.sessionStorage.setItem('divan_player_id', fresh);
  return fresh;
}

export function useMultiplayer(onGameStateReceived: (state: UnifiedGameState, roomCode: string) => void) {
  const [playerId] = useState<string>(() => getOrCreatePlayerId());
  const [connected, setConnected] = useState(false);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [activeRoom, setActiveRoom] = useState<RoomSummary | null>(null);
  const [mySeatIndex, setMySeatIndex] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const callbackRef = useRef(onGameStateReceived);
  callbackRef.current = onGameStateReceived;

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setErrorMessage(null);
      ws.send(JSON.stringify({ type: 'list_rooms' } satisfies ClientMessage));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as ServerMessage;
        if (msg.type === 'rooms_list') {
          setRooms(msg.rooms);
        } else if (msg.type === 'room_joined') {
          setActiveRoom(msg.room);
          setMySeatIndex(msg.seatIndex);
          setErrorMessage(null);
        } else if (msg.type === 'room_updated') {
          setActiveRoom(msg.room);
        } else if (msg.type === 'game_state') {
          callbackRef.current(msg.state, msg.roomCode);
        } else if (msg.type === 'error') {
          setErrorMessage(msg.message);
        }
      } catch {
        // ignore malformed packets
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const sendMessage = useCallback((msg: ClientMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      setErrorMessage('اتصال به سرور برقرار نیست. در حال تلاش مجدد...');
      connect();
    }
  }, [connect]);

  const refreshRooms = useCallback(() => {
    connect();
    sendMessage({ type: 'list_rooms' });
  }, [connect, sendMessage]);

  const createRoom = useCallback(
    (gameType: GameType, maxPlayers: number, playerName: string) => {
      connect();
      sendMessage({ type: 'create_room', gameType, maxPlayers, playerName, playerId });
    },
    [connect, sendMessage, playerId]
  );

  const joinRoom = useCallback(
    (code: string, playerName: string) => {
      connect();
      sendMessage({ type: 'join_room', code, playerName, playerId });
    },
    [connect, sendMessage, playerId]
  );

  const leaveRoom = useCallback(() => {
    if (activeRoom) {
      sendMessage({ type: 'leave_room', code: activeRoom.code, playerId });
    }
    setActiveRoom(null);
    setMySeatIndex(null);
  }, [activeRoom, sendMessage, playerId]);

  const startRoom = useCallback(
    (fillWithAI: boolean) => {
      if (!activeRoom) return;
      sendMessage({ type: 'start_room', code: activeRoom.code, playerId, fillWithAI });
    },
    [activeRoom, sendMessage, playerId]
  );

  const sendRollDice = useCallback(() => {
    if (!activeRoom) return;
    sendMessage({ type: 'roll_dice', code: activeRoom.code, playerId });
  }, [activeRoom, sendMessage, playerId]);

  const sendLudoMove = useCallback(
    (pawnId: number) => {
      if (!activeRoom) return;
      sendMessage({ type: 'ludo_move', code: activeRoom.code, playerId, pawnId });
    },
    [activeRoom, sendMessage, playerId]
  );

  const sendBackgammonMove = useCallback(
    (from: number, to: number) => {
      if (!activeRoom) return;
      sendMessage({ type: 'backgammon_move', code: activeRoom.code, playerId, from, to });
    },
    [activeRoom, sendMessage, playerId]
  );

  const sendChessMove = useCallback(
    (fromRow: number, fromCol: number, toRow: number, toCol: number) => {
      if (!activeRoom) return;
      sendMessage({ type: 'chess_move', code: activeRoom.code, playerId, fromRow, fromCol, toRow, toCol });
    },
    [activeRoom, sendMessage, playerId]
  );

  const sendOthelloMove = useCallback(
    (row: number, col: number) => {
      if (!activeRoom) return;
      sendMessage({ type: 'othello_move', code: activeRoom.code, playerId, row, col });
    },
    [activeRoom, sendMessage, playerId]
  );

  const sendConnect4Drop = useCallback(
    (col: number) => {
      if (!activeRoom) return;
      sendMessage({ type: 'connect4_drop', code: activeRoom.code, playerId, col });
    },
    [activeRoom, sendMessage, playerId]
  );

  const sendCheckersMove = useCallback(
    (fromRow: number, fromCol: number, toRow: number, toCol: number) => {
      if (!activeRoom) return;
      sendMessage({ type: 'checkers_move', code: activeRoom.code, playerId, fromRow, fromCol, toRow, toCol });
    },
    [activeRoom, sendMessage, playerId]
  );

  const sendMorrisAction = useCallback(
    (to: number, from?: number) => {
      if (!activeRoom) return;
      sendMessage({ type: 'morris_action', code: activeRoom.code, playerId, to, from });
    },
    [activeRoom, sendMessage, playerId]
  );

  const sendMancalaSow = useCallback(
    (pitIndex: number) => {
      if (!activeRoom) return;
      sendMessage({ type: 'mancala_sow', code: activeRoom.code, playerId, pitIndex });
    },
    [activeRoom, sendMessage, playerId]
  );

  const sendMastermindSecret = useCallback(
    (secret: [number, number, number, number]) => {
      if (!activeRoom) return;
      sendMessage({ type: 'mastermind_secret', code: activeRoom.code, playerId, secret });
    },
    [activeRoom, sendMessage, playerId]
  );

  const sendMastermindGuess = useCallback(
    (guess: [number, number, number, number]) => {
      if (!activeRoom) return;
      sendMessage({ type: 'mastermind_guess', code: activeRoom.code, playerId, guess });
    },
    [activeRoom, sendMessage, playerId]
  );

  return {
    playerId,
    connected,
    rooms,
    activeRoom,
    mySeatIndex,
    errorMessage,
    setErrorMessage,
    connect,
    refreshRooms,
    createRoom,
    joinRoom,
    leaveRoom,
    startRoom,
    sendRollDice,
    sendLudoMove,
    sendBackgammonMove,
    sendChessMove,
    sendOthelloMove,
    sendConnect4Drop,
    sendCheckersMove,
    sendMorrisAction,
    sendMancalaSow,
    sendMastermindSecret,
    sendMastermindGuess,
  };
}
