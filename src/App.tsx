import { useCallback, useEffect, useState } from 'react';
import { ThreeTabletopCanvas, type CameraPreset } from './components/ThreeTabletopCanvas.tsx';
import { TitleScreen } from './components/TitleScreen.tsx';
import { GameHud } from './components/GameHud.tsx';
import { MultiplayerLobbyModal } from './components/MultiplayerLobbyModal.tsx';
import { StatusModal } from './components/StatusModal.tsx';
import { GameGuideModal } from './components/GameGuideModal.tsx';
import { useMultiplayer } from './hooks/useMultiplayer.ts';
import { usePWAInstall } from './hooks/usePWAInstall.ts';
import { soundEngine } from './audio/soundEngine.ts';
import {
  chooseLudoAIPawn,
  createLudoState,
  LUDO_COLOR_NAMES_FA,
  LUDO_COLORS,
  moveLudoPawn,
  rollLudoDice,
} from './game/ludoEngine.ts';
import { createSnakesState, rollSnakesDice } from './game/snakesEngine.ts';
import {
  applyBackgammonMove,
  chooseBackgammonAIMove,
  createBackgammonState,
  rollBackgammonDice,
} from './game/backgammonEngine.ts';
import { applyChessMove, chooseChessAIMove, createChessState } from './game/chessEngine.ts';
import { applyOthelloMove, chooseOthelloAIMove, createOthelloState } from './game/othelloEngine.ts';
import { chooseConnect4AICol, createConnect4State, dropConnect4Token } from './game/connect4Engine.ts';
import { applyCheckersMove, chooseCheckersAIMove, createCheckersState } from './game/checkersEngine.ts';
import { applyMorrisAction, chooseMorrisAIAction, createMorrisState } from './game/morrisEngine.ts';
import { chooseMancalaAIPit, createMancalaState, sowMancalaPit } from './game/mancalaEngine.ts';
import {
  createMastermindState,
  setMastermindSecret,
  submitMastermindGuess,
} from './game/mastermindEngine.ts';
import type { GameType, PlayerSeat, PlayMode, UnifiedGameState } from './game/types.ts';

type AppScreen = 'title' | 'playing' | 'paused' | 'gameover';

function parseGameParam(): GameType {
  if (typeof window === 'undefined') return 'ludo';
  const g = new URLSearchParams(window.location.search).get('game');
  if (
    g === 'snakes' ||
    g === 'backgammon' ||
    g === 'ludo' ||
    g === 'chess' ||
    g === 'othello' ||
    g === 'connect4' ||
    g === 'checkers' ||
    g === 'morris' ||
    g === 'mancala' ||
    g === 'mastermind'
  ) {
    return g;
  }
  return 'ludo';
}

function buildLocalSeats(gameType: GameType, mode: PlayMode, count: number): PlayerSeat[] {
  if (gameType === 'mastermind') {
    return [
      { seatIndex: 0, id: 'local-0', name: 'رمزگشا (شما)', color: 'ivory', isAI: false, connected: true },
      {
        seatIndex: 1,
        id: 'local-1',
        name: mode === 'ai' ? 'ربات طراح' : 'طراح رمز (بازیکن ۲)',
        color: 'ebony',
        isAI: mode === 'ai',
        connected: true,
      },
    ];
  }

  if (
    gameType === 'backgammon' ||
    gameType === 'chess' ||
    gameType === 'othello' ||
    gameType === 'checkers' ||
    gameType === 'morris' ||
    gameType === 'mancala'
  ) {
    return [
      { seatIndex: 0, id: 'local-0', name: 'مهره عاجی (شما)', color: 'ivory', isAI: false, connected: true },
      {
        seatIndex: 1,
        id: 'local-1',
        name: mode === 'ai' ? 'ربات آبنوس' : 'مهره آبنوس (بازیکن ۲)',
        color: 'ebony',
        isAI: mode === 'ai',
        connected: true,
      },
    ];
  }

  if (gameType === 'connect4') {
    return [
      { seatIndex: 0, id: 'local-0', name: 'شما (قرمز)', color: 'red', isAI: false, connected: true },
      {
        seatIndex: 1,
        id: 'local-1',
        name: mode === 'ai' ? 'ربات زرد' : 'بازیکن ۲ (زرد)',
        color: 'yellow',
        isAI: mode === 'ai',
        connected: true,
      },
    ];
  }

  const total = Math.min(4, Math.max(2, count));
  const colors = total === 2 && gameType === 'ludo' ? (['red', 'yellow'] as const) : LUDO_COLORS;

  return Array.from({ length: total }, (_, idx) => {
    const color = colors[idx];
    const colorFa = LUDO_COLOR_NAMES_FA[color] ?? '';
    const isAI = mode === 'ai' && idx > 0;
    return {
      seatIndex: idx,
      id: `local-${idx}`,
      name: idx === 0 ? `شما (${colorFa})` : isAI ? `ربات ${colorFa}` : `بازیکن ${idx + 1} (${colorFa})`,
      color,
      isAI,
      connected: true,
    };
  });
}

function createInitialGameState(gameType: GameType, mode: PlayMode, count: number): UnifiedGameState {
  const seats = buildLocalSeats(gameType, mode, count);
  if (gameType === 'ludo') return createLudoState(seats);
  if (gameType === 'snakes') return createSnakesState(seats);
  if (gameType === 'backgammon') return createBackgammonState(seats);
  if (gameType === 'chess') return createChessState(seats);
  if (gameType === 'othello') return createOthelloState(seats);
  if (gameType === 'connect4') return createConnect4State(seats);
  if (gameType === 'checkers') return createCheckersState(seats);
  if (gameType === 'morris') return createMorrisState(seats);
  if (gameType === 'mancala') return createMancalaState(seats);
  return createMastermindState(seats);
}

export default function App() {
  const [selectedGame, setSelectedGame] = useState<GameType>(() => parseGameParam());

  const [selectedMode, setSelectedMode] = useState<PlayMode>('ai');
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [appScreen, setAppScreen] = useState<AppScreen>(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('autostart') === '1') {
      return 'playing';
    }
    return 'title';
  });

  const [gameState, setGameState] = useState<UnifiedGameState | null>(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('autostart') === '1') {
      return createInitialGameState(parseGameParam(), 'ai', 2);
    }
    return null;
  });

  const [lobbyOpen, setLobbyOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideGame, setGuideGame] = useState<GameType>(() => parseGameParam());
  const [isOnlineGame, setIsOnlineGame] = useState(false);
  const [selectedBgPoint, setSelectedBgPoint] = useState<number | null>(null);
  const [selectedGridCell, setSelectedGridCell] = useState<[number, number] | null>(null);
  const [selectedMorrisNode, setSelectedMorrisNode] = useState<number | null>(null);
  const [mastermindDraft, setMastermindDraft] = useState<{ guess: (number | null)[]; slot: number }>({
    guess: [null, null, null, null],
    slot: 0,
  });
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('iso');
  const [diceRollSeq, setDiceRollSeq] = useState(0);
  const [muted, setMuted] = useState(false);

  const { isInstallable, install } = usePWAInstall();

  const handleOnlineState = useCallback((state: UnifiedGameState) => {
    setSelectedGame(state.gameType);
    setGameState((prev) => {
      if (!prev || prev.turnCount !== state.turnCount || prev.phase !== state.phase) {
        const isDiceGame =
          state.gameType === 'ludo' || state.gameType === 'snakes' || state.gameType === 'backgammon';
        if (isDiceGame && (state.phase === 'move' || (state.gameType === 'snakes' && state.diceValue !== null))) {
          setDiceRollSeq((s) => s + 1);
          soundEngine.playDiceRoll();
        } else if (!isDiceGame && prev && prev.turnCount !== state.turnCount) {
          soundEngine.playPieceHop(1.04);
        }
      }
      return state;
    });
    setSelectedBgPoint(null);
    setSelectedGridCell(null);
    setSelectedMorrisNode(null);
    setMastermindDraft({ guess: [null, null, null, null], slot: 0 });
    setIsOnlineGame(true);
    setLobbyOpen(false);
    if (state.phase === 'finished') {
      soundEngine.playVictory();
      setAppScreen('gameover');
    } else {
      setAppScreen('playing');
    }
  }, []);

  const mp = useMultiplayer(handleOnlineState);

  // Sync body dataset state for automation & shell styling
  useEffect(() => {
    document.body.dataset.state = appScreen;
  }, [appScreen]);

  const startOfflineGame = useCallback(
    (game: GameType = selectedGame, mode: PlayMode = selectedMode === 'online' ? 'ai' : selectedMode, count: number = playerCount) => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      setIsOnlineGame(false);
      setSelectedGame(game);
      setSelectedBgPoint(null);
      setSelectedGridCell(null);
      setSelectedMorrisNode(null);
      setMastermindDraft({ guess: [null, null, null, null], slot: 0 });
      setGameState(createInitialGameState(game, mode, count));
      setAppScreen('playing');
    },
    [selectedGame, selectedMode, playerCount]
  );

  const handleRollDice = useCallback(() => {
    if (!gameState || appScreen !== 'playing' || gameState.phase !== 'roll') return;
    const currentSeat = gameState.players[gameState.turnIndex];

    if (isOnlineGame) {
      if (mp.mySeatIndex !== gameState.turnIndex || currentSeat?.isAI) return;
      soundEngine.playDiceRoll();
      setDiceRollSeq((s) => s + 1);
      mp.sendRollDice();
      return;
    }

    if (currentSeat?.isAI) return;

    soundEngine.playDiceRoll();
    setDiceRollSeq((s) => s + 1);

    if (gameState.gameType === 'ludo') {
      const next = rollLudoDice(gameState);
      setGameState(next);
    } else if (gameState.gameType === 'snakes') {
      const next = rollSnakesDice(gameState);
      if (next.lastJump?.type === 'ladder') soundEngine.playLadder();
      else if (next.lastJump?.type === 'snake') soundEngine.playSnake();
      else soundEngine.playPieceHop();

      setGameState(next);
      if (next.phase === 'finished') {
        soundEngine.playVictory();
        setTimeout(() => setAppScreen('gameover'), 450);
      }
    } else if (gameState.gameType === 'backgammon') {
      const next = rollBackgammonDice(gameState);
      setSelectedBgPoint(null);
      setGameState(next);
    }
  }, [gameState, appScreen, isOnlineGame, mp]);

  const handleSelectLudoPawn = useCallback(
    (pawnId: number) => {
      if (!gameState || gameState.gameType !== 'ludo' || gameState.phase !== 'move') return;
      if (!gameState.validPawnIds.includes(pawnId)) return;

      if (isOnlineGame) {
        if (mp.mySeatIndex !== gameState.turnIndex) return;
        soundEngine.playPieceHop(1.08);
        mp.sendLudoMove(pawnId);
        return;
      }

      const { state: next, captured } = moveLudoPawn(gameState, pawnId);
      if (captured) soundEngine.playCapture();
      else soundEngine.playPieceHop(1.05);

      setGameState(next);
      if (next.phase === 'finished') {
        soundEngine.playVictory();
        setTimeout(() => setAppScreen('gameover'), 450);
      }
    },
    [gameState, isOnlineGame, mp]
  );

  const handleSelectBgPoint = useCallback(
    (pointIndex: number, isBearOff = false, isBar = false, owner?: 0 | 1) => {
      if (!gameState || gameState.gameType !== 'backgammon' || gameState.phase !== 'move') return;
      const turn = gameState.turnIndex;

      if (isOnlineGame && mp.mySeatIndex !== turn) return;
      if (gameState.players[turn]?.isAI) return;

      const executeMove = (from: number, to: number) => {
        if (isOnlineGame) {
          soundEngine.playPieceHop(0.95);
          mp.sendBackgammonMove(from, to);
          setSelectedBgPoint(null);
          return;
        }
        const { state: next, isHit } = applyBackgammonMove(gameState, from, to);
        if (isHit) soundEngine.playCapture();
        else soundEngine.playPieceHop(0.95);

        setSelectedBgPoint(null);
        setGameState(next);
        if (next.phase === 'finished') {
          soundEngine.playVictory();
          setTimeout(() => setAppScreen('gameover'), 450);
        }
      };

      // Map bar & bear-off clicks unambiguously
      const resolvedPoint = isBar
        ? turn === 0
          ? 25
          : 0
        : isBearOff
        ? turn === 0
          ? 0
          : 25
        : pointIndex;

      if (isBearOff && owner !== undefined && owner !== turn) return;

      // If a source point is already selected, try completing move to resolvedPoint
      if (selectedBgPoint !== null) {
        const matchingMove = gameState.legalMoves.find(
          (m) => m.from === selectedBgPoint && m.to === resolvedPoint
        );
        if (matchingMove) {
          executeMove(matchingMove.from, matchingMove.to);
          return;
        }

        // Clicking same point again when only 1 legal destination exists auto-completes it
        if (selectedBgPoint === resolvedPoint) {
          const fromMoves = gameState.legalMoves.filter((m) => m.from === selectedBgPoint);
          if (fromMoves.length === 1) {
            executeMove(fromMoves[0].from, fromMoves[0].to);
            return;
          }
          setSelectedBgPoint(null);
          return;
        }
      }

      // Otherwise check if resolvedPoint is a valid source point
      const movesFromHere = gameState.legalMoves.filter((m) => m.from === resolvedPoint);
      if (movesFromHere.length > 0) {
        soundEngine.playPieceHop(1.25);
        setSelectedBgPoint(resolvedPoint);
      }
    },
    [gameState, selectedBgPoint, isOnlineGame, mp]
  );

  const handleSelectGridCell = useCallback(
    (row: number, col: number) => {
      if (!gameState || appScreen !== 'playing' || gameState.phase !== 'move') return;
      const turn = gameState.turnIndex;
      if (isOnlineGame && mp.mySeatIndex !== turn) return;
      if (gameState.players[turn]?.isAI) return;

      if (gameState.gameType === 'chess') {
        if (selectedGridCell) {
          const [sr, sc] = selectedGridCell;
          const matching = gameState.legalMoves.find(
            (m) => m.fromRow === sr && m.fromCol === sc && m.toRow === row && m.toCol === col
          );
          if (matching) {
            if (isOnlineGame) {
              soundEngine.playPieceHop(1.05);
              mp.sendChessMove(sr, sc, row, col);
              setSelectedGridCell(null);
              return;
            }
            const { state: next, captured } = applyChessMove(gameState, sr, sc, row, col);
            if (captured) soundEngine.playCapture();
            else soundEngine.playPieceHop(1.02);
            setSelectedGridCell(null);
            setGameState(next);
            if (next.phase === 'finished') {
              soundEngine.playVictory();
              setTimeout(() => setAppScreen('gameover'), 450);
            }
            return;
          }
          if (sr === row && sc === col) {
            setSelectedGridCell(null);
            return;
          }
        }

        const hasMovesFromHere = gameState.legalMoves.some((m) => m.fromRow === row && m.fromCol === col);
        if (hasMovesFromHere) {
          soundEngine.playPieceHop(1.25);
          setSelectedGridCell([row, col]);
        } else {
          setSelectedGridCell(null);
        }
        return;
      }

      if (gameState.gameType === 'checkers') {
        const activeFrom = gameState.mustJumpFrom ?? selectedGridCell;
        if (activeFrom) {
          const [sr, sc] = activeFrom;
          const matching = gameState.legalMoves.find(
            (m) => m.fromRow === sr && m.fromCol === sc && m.toRow === row && m.toCol === col
          );
          if (matching) {
            if (isOnlineGame) {
              soundEngine.playPieceHop(1.05);
              mp.sendCheckersMove(sr, sc, row, col);
              setSelectedGridCell(null);
              return;
            }
            const { state: next, captured } = applyCheckersMove(gameState, sr, sc, row, col);
            if (captured) soundEngine.playCapture();
            else soundEngine.playPieceHop(1.02);
            setSelectedGridCell(next.mustJumpFrom);
            setGameState(next);
            if (next.phase === 'finished') {
              soundEngine.playVictory();
              setTimeout(() => setAppScreen('gameover'), 450);
            }
            return;
          }
          if (!gameState.mustJumpFrom && sr === row && sc === col) {
            setSelectedGridCell(null);
            return;
          }
        }

        if (!gameState.mustJumpFrom) {
          const hasMovesFromHere = gameState.legalMoves.some((m) => m.fromRow === row && m.fromCol === col);
          if (hasMovesFromHere) {
            soundEngine.playPieceHop(1.25);
            setSelectedGridCell([row, col]);
          } else {
            setSelectedGridCell(null);
          }
        }
        return;
      }

      if (gameState.gameType === 'othello') {
        const isLegal = gameState.legalMoves.some(([lr, lc]) => lr === row && lc === col);
        if (!isLegal) return;

        if (isOnlineGame) {
          soundEngine.playPieceHop(1.05);
          mp.sendOthelloMove(row, col);
          return;
        }
        const { state: next } = applyOthelloMove(gameState, row, col);
        soundEngine.playPieceHop(1.05);
        setGameState(next);
        if (next.phase === 'finished') {
          soundEngine.playVictory();
          setTimeout(() => setAppScreen('gameover'), 450);
        }
      }
    },
    [gameState, appScreen, selectedGridCell, isOnlineGame, mp]
  );

  const handleSelectConnect4Col = useCallback(
    (col: number) => {
      if (!gameState || appScreen !== 'playing' || gameState.gameType !== 'connect4' || gameState.phase !== 'move') return;
      const turn = gameState.turnIndex;
      if (isOnlineGame && mp.mySeatIndex !== turn) return;
      if (gameState.players[turn]?.isAI) return;

      if (isOnlineGame) {
        soundEngine.playPieceHop(0.92);
        mp.sendConnect4Drop(col);
        return;
      }
      const next = dropConnect4Token(gameState, col);
      if (next === gameState) return;
      soundEngine.playPieceHop(0.92);
      setGameState(next);
      if (next.phase === 'finished') {
        soundEngine.playVictory();
        setTimeout(() => setAppScreen('gameover'), 450);
      }
    },
    [gameState, appScreen, isOnlineGame, mp]
  );

  const handleSelectMorrisNode = useCallback(
    (nodeIndex: number) => {
      if (!gameState || appScreen !== 'playing' || gameState.gameType !== 'morris' || gameState.phase !== 'move') return;
      const turn = gameState.turnIndex;
      if (isOnlineGame && mp.mySeatIndex !== turn) return;
      if (gameState.players[turn]?.isAI) return;

      if (gameState.subPhase === 'place' || gameState.subPhase === 'remove') {
        const isLegal = gameState.legalMoves.some((m) => m.to === nodeIndex);
        if (!isLegal) return;
        if (isOnlineGame) {
          soundEngine.playPieceHop(gameState.subPhase === 'remove' ? 0.85 : 1.08);
          mp.sendMorrisAction(nodeIndex);
          setSelectedMorrisNode(null);
          return;
        }
        const prevSub = gameState.subPhase;
        const next = applyMorrisAction(gameState, nodeIndex);
        if (prevSub === 'remove') soundEngine.playCapture();
        else soundEngine.playPieceHop(1.06);
        setSelectedMorrisNode(null);
        setGameState(next);
        if (next.phase === 'finished') {
          soundEngine.playVictory();
          setTimeout(() => setAppScreen('gameover'), 450);
        }
        return;
      }

      // Slide or fly phase (requires selecting own stone then destination)
      if (selectedMorrisNode !== null) {
        const isLegalDest = gameState.legalMoves.some(
          (m) => m.from === selectedMorrisNode && m.to === nodeIndex
        );
        if (isLegalDest) {
          if (isOnlineGame) {
            soundEngine.playPieceHop(1.05);
            mp.sendMorrisAction(nodeIndex, selectedMorrisNode);
            setSelectedMorrisNode(null);
            return;
          }
          const next = applyMorrisAction(gameState, nodeIndex, selectedMorrisNode);
          soundEngine.playPieceHop(1.05);
          setSelectedMorrisNode(null);
          setGameState(next);
          if (next.phase === 'finished') {
            soundEngine.playVictory();
            setTimeout(() => setAppScreen('gameover'), 450);
          }
          return;
        }
        if (selectedMorrisNode === nodeIndex) {
          setSelectedMorrisNode(null);
          return;
        }
      }

      const canPick = gameState.legalMoves.some((m) => m.from === nodeIndex);
      if (canPick) {
        soundEngine.playPieceHop(1.25);
        setSelectedMorrisNode(nodeIndex);
      } else {
        setSelectedMorrisNode(null);
      }
    },
    [gameState, appScreen, selectedMorrisNode, isOnlineGame, mp]
  );

  const handleSelectMancalaPit = useCallback(
    (pitIndex: number) => {
      if (!gameState || appScreen !== 'playing' || gameState.gameType !== 'mancala' || gameState.phase !== 'move') return;
      const turn = gameState.turnIndex;
      if (isOnlineGame && mp.mySeatIndex !== turn) return;
      if (gameState.players[turn]?.isAI) return;

      if (isOnlineGame) {
        soundEngine.playPieceHop(1.1);
        mp.sendMancalaSow(pitIndex);
        return;
      }
      const next = sowMancalaPit(gameState, pitIndex);
      if (next === gameState) return;
      soundEngine.playPieceHop(1.1);
      setGameState(next);
      if (next.phase === 'finished') {
        soundEngine.playVictory();
        setTimeout(() => setAppScreen('gameover'), 450);
      }
    },
    [gameState, appScreen, isOnlineGame, mp]
  );

  const handleSelectMastermindSlot = useCallback((slotIndex: number) => {
    const clamped = Math.max(0, Math.min(3, slotIndex));
    setMastermindDraft((prev) => ({ ...prev, slot: clamped }));
    soundEngine.playPieceHop(1.22);
  }, []);

  const handlePickMastermindColor = useCallback((colorId: number) => {
    soundEngine.playPieceHop(1.15);
    setMastermindDraft((prev) => {
      const nextGuess = [...prev.guess];
      nextGuess[prev.slot] = colorId;
      let nextSlot = nextGuess.findIndex((v, i) => i > prev.slot && v === null);
      if (nextSlot === -1) nextSlot = nextGuess.findIndex((v) => v === null);
      if (nextSlot === -1) nextSlot = (prev.slot + 1) % 4;
      return { guess: nextGuess, slot: nextSlot };
    });
  }, []);

  const handleClearMastermindDraft = useCallback(() => {
    setMastermindDraft({ guess: [null, null, null, null], slot: 0 });
  }, []);

  const handleSubmitMastermind = useCallback(() => {
    if (!gameState || appScreen !== 'playing' || gameState.gameType !== 'mastermind' || gameState.phase !== 'move') return;
    if (mastermindDraft.guess.some((v) => v === null)) return;
    const tuple = mastermindDraft.guess as [number, number, number, number];
    const turn = gameState.turnIndex;
    if (isOnlineGame && mp.mySeatIndex !== turn) return;
    if (gameState.players[turn]?.isAI) return;

    if (isOnlineGame) {
      soundEngine.playPieceHop(1.05);
      if (gameState.subPhase === 'set_secret') {
        mp.sendMastermindSecret(tuple);
      } else {
        mp.sendMastermindGuess(tuple);
      }
      setMastermindDraft({ guess: [null, null, null, null], slot: 0 });
      return;
    }

    const next =
      gameState.subPhase === 'set_secret'
        ? setMastermindSecret(gameState, tuple)
        : submitMastermindGuess(gameState, tuple);

    if (next.phase === 'finished') {
      if (next.winnerIndex === 0) soundEngine.playVictory();
      else soundEngine.playCapture();
      setTimeout(() => setAppScreen('gameover'), 450);
    } else {
      soundEngine.playPieceHop(1.04);
    }

    setGameState(next);
    setMastermindDraft({ guess: [null, null, null, null], slot: 0 });
  }, [gameState, appScreen, mastermindDraft, isOnlineGame, mp]);

  // Offline AI Bot turn scheduler
  useEffect(() => {
    if (isOnlineGame || appScreen !== 'playing' || !gameState || gameState.phase === 'finished') return;
    const activeSeat = gameState.players[gameState.turnIndex];
    if (!activeSeat?.isAI) return;

    const timer = setTimeout(() => {
      if (gameState.gameType === 'ludo') {
        if (gameState.phase === 'roll') {
          soundEngine.playDiceRoll();
          setDiceRollSeq((s) => s + 1);
          setGameState(rollLudoDice(gameState));
        } else if (gameState.phase === 'move') {
          const pid = chooseLudoAIPawn(gameState);
          if (pid !== null) {
            const { state: next, captured } = moveLudoPawn(gameState, pid);
            if (captured) soundEngine.playCapture();
            else soundEngine.playPieceHop();
            setGameState(next);
            if (next.phase === 'finished') {
              soundEngine.playVictory();
              setTimeout(() => setAppScreen('gameover'), 450);
            }
          }
        }
      } else if (gameState.gameType === 'snakes') {
        soundEngine.playDiceRoll();
        setDiceRollSeq((s) => s + 1);
        const next = rollSnakesDice(gameState);
        if (next.lastJump?.type === 'ladder') soundEngine.playLadder();
        else if (next.lastJump?.type === 'snake') soundEngine.playSnake();
        else soundEngine.playPieceHop();
        setGameState(next);
        if (next.phase === 'finished') {
          soundEngine.playVictory();
          setTimeout(() => setAppScreen('gameover'), 450);
        }
      } else if (gameState.gameType === 'backgammon') {
        if (gameState.phase === 'roll') {
          soundEngine.playDiceRoll();
          setDiceRollSeq((s) => s + 1);
          setGameState(rollBackgammonDice(gameState));
        } else if (gameState.phase === 'move') {
          const move = chooseBackgammonAIMove(gameState);
          if (move) {
            const { state: next, isHit } = applyBackgammonMove(gameState, move.from, move.to);
            if (isHit) soundEngine.playCapture();
            else soundEngine.playPieceHop();
            setGameState(next);
            if (next.phase === 'finished') {
              soundEngine.playVictory();
              setTimeout(() => setAppScreen('gameover'), 450);
            }
          }
        }
      } else if (gameState.gameType === 'chess') {
        const move = chooseChessAIMove(gameState);
        if (move) {
          const { state: next, captured } = applyChessMove(gameState, move.fromRow, move.fromCol, move.toRow, move.toCol);
          if (captured) soundEngine.playCapture();
          else soundEngine.playPieceHop();
          setGameState(next);
          if (next.phase === 'finished') {
            soundEngine.playVictory();
            setTimeout(() => setAppScreen('gameover'), 450);
          }
        }
      } else if (gameState.gameType === 'othello') {
        const move = chooseOthelloAIMove(gameState);
        if (move) {
          const { state: next } = applyOthelloMove(gameState, move[0], move[1]);
          soundEngine.playPieceHop(1.05);
          setGameState(next);
          if (next.phase === 'finished') {
            soundEngine.playVictory();
            setTimeout(() => setAppScreen('gameover'), 450);
          }
        }
      } else if (gameState.gameType === 'connect4') {
        const col = chooseConnect4AICol(gameState);
        if (col !== null) {
          const next = dropConnect4Token(gameState, col);
          soundEngine.playPieceHop(0.92);
          setGameState(next);
          if (next.phase === 'finished') {
            soundEngine.playVictory();
            setTimeout(() => setAppScreen('gameover'), 450);
          }
        }
      } else if (gameState.gameType === 'checkers') {
        const move = chooseCheckersAIMove(gameState);
        if (move) {
          const { state: next, captured } = applyCheckersMove(
            gameState,
            move.fromRow,
            move.fromCol,
            move.toRow,
            move.toCol
          );
          if (captured) soundEngine.playCapture();
          else soundEngine.playPieceHop(1.02);
          setGameState(next);
          if (next.phase === 'finished') {
            soundEngine.playVictory();
            setTimeout(() => setAppScreen('gameover'), 450);
          }
        }
      } else if (gameState.gameType === 'morris') {
        const move = chooseMorrisAIAction(gameState);
        if (move) {
          const prevSub = gameState.subPhase;
          const next = applyMorrisAction(gameState, move.to, move.from);
          if (prevSub === 'remove') soundEngine.playCapture();
          else soundEngine.playPieceHop(1.05);
          setGameState(next);
          if (next.phase === 'finished') {
            soundEngine.playVictory();
            setTimeout(() => setAppScreen('gameover'), 450);
          }
        }
      } else if (gameState.gameType === 'mancala') {
        const pit = chooseMancalaAIPit(gameState);
        if (pit !== null) {
          const next = sowMancalaPit(gameState, pit);
          soundEngine.playPieceHop(1.1);
          setGameState(next);
          if (next.phase === 'finished') {
            soundEngine.playVictory();
            setTimeout(() => setAppScreen('gameover'), 450);
          }
        }
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [gameState, appScreen, isOnlineGame]);

  // Global keyboard shortcuts (Title start, Space roll dice, Esc pause, M mute)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'm' || e.key === 'M') {
        setMuted((prev) => {
          const next = !prev;
          soundEngine.setMuted(next);
          return next;
        });
        return;
      }

      if (guideOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setGuideOpen(false);
        }
        return;
      }

      if (appScreen === 'title' && !lobbyOpen && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        if (selectedMode === 'online') {
          setLobbyOpen(true);
        } else {
          startOfflineGame();
        }
        return;
      }

      if (appScreen === 'playing') {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          setAppScreen('paused');
        } else if (e.key === ' ') {
          e.preventDefault();
          handleRollDice();
        }
      } else if (appScreen === 'paused' && (e.key === 'Escape' || e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setAppScreen('playing');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [guideOpen, appScreen, lobbyOpen, selectedMode, startOfflineGame, handleRollDice]);

  const handleToggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  };

  const handleCycleCamera = () => {
    setCameraPreset((prev) => (prev === 'iso' ? 'top' : prev === 'top' ? 'side' : 'iso'));
  };

  const previewState = gameState ?? createInitialGameState(selectedGame, 'ai', playerCount);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#161210]">
      {/* Persistent 3D WebGL Canvas */}
      <ThreeTabletopCanvas
        activeGameType={previewState.gameType}
        gameState={previewState}
        appScreen={lobbyOpen ? 'lobby' : appScreen}
        selectedBgPoint={selectedBgPoint}
        selectedGridCell={selectedGridCell}
        selectedMorrisNode={selectedMorrisNode}
        draftMastermindGuess={mastermindDraft.guess}
        selectedMastermindSlot={mastermindDraft.slot}
        cameraPreset={cameraPreset}
        diceRollSeq={diceRollSeq}
        onSelectLudoPawn={handleSelectLudoPawn}
        onSelectBgPoint={handleSelectBgPoint}
        onSelectGridCell={handleSelectGridCell}
        onSelectConnect4Col={handleSelectConnect4Col}
        onSelectMorrisNode={handleSelectMorrisNode}
        onSelectMancalaPit={handleSelectMancalaPit}
        onSelectMastermindSlot={handleSelectMastermindSlot}
      />

      {/* Title Screen */}
      {appScreen === 'title' && !lobbyOpen && (
        <TitleScreen
          selectedGame={selectedGame}
          selectedMode={selectedMode}
          playerCount={playerCount}
          isPWAInstallable={isInstallable}
          onSelectGame={setSelectedGame}
          onSelectMode={setSelectedMode}
          onSelectPlayerCount={setPlayerCount}
          onStartLocalOrAI={() => startOfflineGame(selectedGame, selectedMode === 'online' ? 'ai' : selectedMode, playerCount)}
          onOpenOnlineLobby={() => setLobbyOpen(true)}
          onOpenGuide={() => {
            setGuideGame(selectedGame);
            setGuideOpen(true);
          }}
          onInstallPWA={install}
        />
      )}

      {/* Playing HUD */}
      {appScreen === 'playing' && gameState && (
        <GameHud
          gameState={gameState}
          isOnline={isOnlineGame}
          mySeatIndex={mp.mySeatIndex}
          roomCode={mp.activeRoom?.code ?? null}
          muted={muted}
          cameraPreset={cameraPreset}
          selectedBgPoint={selectedBgPoint}
          selectedGridCell={selectedGridCell}
          selectedMorrisNode={selectedMorrisNode}
          draftMastermindGuess={mastermindDraft.guess}
          selectedMastermindSlot={mastermindDraft.slot}
          onRollDice={handleRollDice}
          onSelectLudoPawn={handleSelectLudoPawn}
          onClearBgSelection={() => setSelectedBgPoint(null)}
          onClearGridSelection={() => setSelectedGridCell(null)}
          onClearMorrisSelection={() => setSelectedMorrisNode(null)}
          onSelectConnect4Col={handleSelectConnect4Col}
          onSelectMancalaPit={handleSelectMancalaPit}
          onSelectMastermindSlot={handleSelectMastermindSlot}
          onPickMastermindColor={handlePickMastermindColor}
          onClearMastermindDraft={handleClearMastermindDraft}
          onSubmitMastermind={handleSubmitMastermind}
          onCycleCamera={handleCycleCamera}
          onToggleMute={handleToggleMute}
          onOpenGuide={() => {
            setGuideGame(gameState.gameType);
            setGuideOpen(true);
          }}
          onOpenPause={() => setAppScreen('paused')}
        />
      )}

      {/* Pause / GameOver Modal */}
      {(appScreen === 'paused' || appScreen === 'gameover') && gameState && (
        <StatusModal
          mode={appScreen}
          gameState={gameState}
          isOnline={isOnlineGame}
          onResume={() => setAppScreen('playing')}
          onRestart={() => startOfflineGame(gameState.gameType)}
          onSwitchGame={(gt) => startOfflineGame(gt)}
          onOpenGuide={() => {
            setGuideGame(gameState.gameType);
            setGuideOpen(true);
          }}
          onReturnToTitle={() => {
            if (isOnlineGame) {
              mp.leaveRoom();
              setIsOnlineGame(false);
            }
            setGameState(null);
            setAppScreen('title');
          }}
        />
      )}

      {/* Online Multiplayer Lobby */}
      <MultiplayerLobbyModal
        isOpen={lobbyOpen}
        connected={mp.connected}
        rooms={mp.rooms}
        activeRoom={mp.activeRoom}
        myPlayerId={mp.playerId}
        errorMessage={mp.errorMessage}
        defaultGame={selectedGame}
        onClose={() => setLobbyOpen(false)}
        onRefresh={mp.refreshRooms}
        onCreateRoom={mp.createRoom}
        onJoinRoom={mp.joinRoom}
        onLeaveRoom={mp.leaveRoom}
        onStartRoom={mp.startRoom}
      />

      {/* Interactive Game Guide / Tutorial Modal */}
      <GameGuideModal
        isOpen={guideOpen}
        initialGame={guideGame}
        canQuickStart={appScreen === 'title'}
        onClose={() => setGuideOpen(false)}
        onStartGame={(gt) => {
          setGuideOpen(false);
          startOfflineGame(gt, selectedMode === 'online' ? 'ai' : selectedMode, playerCount);
        }}
      />
    </main>
  );
}
