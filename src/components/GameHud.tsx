import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Dices, HelpCircle, Pause, Volume2, VolumeX, Camera, RotateCcw } from 'lucide-react';
import type { CameraPreset } from './ThreeTabletopCanvas.tsx';
import type { PlayerColor, UnifiedGameState } from '../game/types.ts';

import { getAvailableConnect4Row } from '../game/connect4Engine.ts';
import { MASTERMIND_COLORS } from '../game/mastermindEngine.ts';

interface GameHudProps {
  gameState: UnifiedGameState;
  isOnline: boolean;
  mySeatIndex: number | null;
  roomCode: string | null;
  muted: boolean;
  cameraPreset: CameraPreset;
  selectedBgPoint: number | null;
  selectedGridCell: [number, number] | null;
  selectedMorrisNode: number | null;
  draftMastermindGuess: (number | null)[];
  selectedMastermindSlot: number;
  onRollDice: () => void;
  onSelectLudoPawn: (pawnId: number) => void;
  onClearBgSelection: () => void;
  onClearGridSelection: () => void;
  onClearMorrisSelection: () => void;
  onSelectConnect4Col: (col: number) => void;
  onSelectMancalaPit: (pitIndex: number) => void;
  onSelectMastermindSlot: (slotIndex: number) => void;
  onPickMastermindColor: (colorId: number) => void;
  onClearMastermindDraft: () => void;
  onSubmitMastermind: () => void;
  onCycleCamera: () => void;
  onToggleMute: () => void;
  onOpenGuide: () => void;
  onOpenPause: () => void;
}

const COLOR_HEX_CSS: Record<PlayerColor, string> = {
  red: '#c93b31',
  blue: '#266d94',
  yellow: '#dca028',
  green: '#2c7d50',
  ivory: '#f1e5cf',
  ebony: '#3a3029',
};

export const GameHud: React.FC<GameHudProps> = ({
  gameState,
  isOnline,
  mySeatIndex,
  roomCode,
  muted,
  cameraPreset,
  selectedBgPoint,
  selectedGridCell,
  selectedMorrisNode,
  draftMastermindGuess,
  selectedMastermindSlot,
  onRollDice,
  onSelectLudoPawn,
  onClearBgSelection,
  onClearGridSelection,
  onClearMorrisSelection,
  onSelectConnect4Col,
  onSelectMancalaPit,
  onSelectMastermindSlot,
  onPickMastermindColor,
  onClearMastermindDraft,
  onSubmitMastermind,
  onCycleCamera,
  onToggleMute,
  onOpenGuide,
  onOpenPause,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);

  const currentSeat = gameState.players[gameState.turnIndex];
  const isMyTurn = isOnline
    ? mySeatIndex === gameState.turnIndex && !currentSeat?.isAI
    : !currentSeat?.isAI;

  const hasDice =
    gameState.gameType === 'ludo' ||
    gameState.gameType === 'snakes' ||
    gameState.gameType === 'backgammon';

  const canRoll =
    hasDice &&
    isMyTurn &&
    gameState.phase === 'roll';

  const cameraLabel =
    cameraPreset === 'iso' ? 'ایزومتریک' : cameraPreset === 'top' ? 'بالا' : 'کنار';

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4">
      {/* Compact Top Perimeter Bar */}
      <div className="flex items-start justify-between gap-2 w-full">
        {/* Turn & Event Status Strip */}
        <div className="pointer-events-auto flex-1 min-w-0 sm:flex-initial sm:max-w-lg rounded-xl bg-[#181310]/92 border border-[#d4a84f]/30 px-2.5 py-2 sm:px-3 flex items-center gap-2 shadow-lg">
          <span
            className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full shrink-0 border border-white/40"
            style={{ backgroundColor: COLOR_HEX_CSS[currentSeat?.color ?? 'red'] }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#f8f1e4] truncate">
              <span className="truncate">{currentSeat?.name}</span>
              {isOnline && roomCode && (
                <span className="text-[11px] font-mono-num text-[#d4a84f] shrink-0">· {roomCode}</span>
              )}
              <span className="text-[11px] font-mono-num text-[#b5a48e] shrink-0">
                نوبت {gameState.turnCount}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-[#cbbca8] truncate">
              {gameState.lastEvent}
            </p>
          </div>
        </div>

        {/* Top-Right Utility Controls (tabIndex -1 so Space/Enter don't re-trigger buttons) */}
        <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            tabIndex={-1}
            aria-label="تغییر زاویه دوربین"
            onClick={(e) => {
              e.currentTarget.blur();
              onCycleCamera();
            }}
            className="min-w-[42px] min-h-[42px] sm:min-w-[44px] sm:min-h-[44px] px-2 sm:px-2.5 rounded-xl bg-[#181310]/92 hover:bg-[#261e18] border border-white/15 text-[#f0e4d2] flex items-center justify-center gap-1.5 text-xs font-bold"
          >
            <Camera className="w-4 h-4 text-[#d4a84f]" />
            <span className="hidden sm:inline">{cameraLabel}</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'فعال‌سازی صدا' : 'قطع صدا'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="min-w-[42px] min-h-[42px] sm:min-w-[44px] sm:min-h-[44px] rounded-xl bg-[#181310]/92 hover:bg-[#261e18] border border-white/15 text-[#f0e4d2] flex items-center justify-center"
          >
            {muted ? <VolumeX className="w-4 h-4 text-[#c94a3c]" /> : <Volume2 className="w-4 h-4 text-[#d4a84f]" />}
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="آموزش بازی"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenGuide();
            }}
            className="min-w-[42px] min-h-[42px] sm:min-w-[44px] sm:min-h-[44px] rounded-xl bg-[#181310]/92 hover:bg-[#261e18] border border-white/15 text-[#f0e4d2] flex items-center justify-center"
          >
            <HelpCircle className="w-4 h-4 text-[#d4a84f]" />
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="منو و توقف"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenPause();
            }}
            className="min-w-[42px] min-h-[42px] sm:min-w-[44px] sm:min-h-[44px] rounded-xl bg-[#181310]/92 hover:bg-[#261e18] border border-white/15 text-[#f0e4d2] flex items-center justify-center"
          >
            <Pause className="w-4 h-4 text-[#d4a84f]" />
          </button>
        </div>
      </div>

      {/* Collapsible Bottom Action Dock */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            setDockCollapsed((v) => !v);
          }}
          className="pointer-events-auto mb-1 px-3 py-1 rounded-t-xl bg-[#181310]/92 border border-b-0 border-[#d4a84f]/30 text-[11px] font-bold text-[#cbbca8] hover:text-[#f8f1e4] flex items-center gap-1"
        >
          {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{dockCollapsed ? 'نمایش کنترل‌ها' : 'جمع کردن'}</span>
        </button>

        {!dockCollapsed && (
          <div className="pointer-events-auto w-full max-w-[680px] rounded-2xl bg-[#181310]/94 border border-[#d4a84f]/35 px-3 py-2.5 sm:px-4 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 shadow-2xl">
            {/* Primary Dice Roll Button (shown only for dice games) */}
            {hasDice && (
              <button
                type="button"
                disabled={!canRoll}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onRollDice();
                }}
                className={`min-h-[46px] px-4 sm:px-5 rounded-xl font-black text-sm flex items-center gap-2 transition-all ${
                  canRoll
                    ? 'bg-[#d4a84f] hover:bg-[#e1b862] active:scale-[0.98] text-[#181310] shadow-md'
                    : 'bg-[#2a211b] text-[#8d7d6a] cursor-not-allowed'
                }`}
              >
                <Dices className="w-5 h-5" />
                <span>{canRoll ? 'ریختن تاس' : isMyTurn ? 'حرکت دهید' : 'نوبت حریف'}</span>
              </button>
            )}

            {/* Dice Readout & Game-Specific Quick Controls */}
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              {gameState.gameType === 'ludo' && (
                <>
                  {gameState.diceValue !== null && (
                    <div className="min-h-[40px] px-3 rounded-xl bg-[#251d17] border border-[#d4a84f]/35 flex items-center gap-2">
                      <span className="text-xs text-[#cbbca8]">تاس</span>
                      <span className="text-lg font-black font-mono-num text-[#f8f1e4]">
                        {gameState.diceValue}
                      </span>
                    </div>
                  )}
                  {gameState.phase === 'move' && isMyTurn && (
                    <div className="flex items-center gap-1.5">
                      {gameState.validPawnIds.map((pid) => (
                        <button
                          key={pid}
                          type="button"
                          onClick={() => onSelectLudoPawn(pid)}
                          className="min-w-[44px] min-h-[42px] px-2.5 rounded-xl bg-[#2d7a4f] hover:bg-[#36915e] text-white text-xs font-bold tabular-nums"
                        >
                          مهره {pid + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {gameState.gameType === 'snakes' && (
                <div className="flex items-center gap-2">
                  {gameState.diceValue !== null && (
                    <div className="min-h-[40px] px-3 rounded-xl bg-[#251d17] border border-[#d4a84f]/35 flex items-center gap-2">
                      <span className="text-xs text-[#cbbca8]">تاس</span>
                      <span className="text-lg font-black font-mono-num text-[#f8f1e4]">
                        {gameState.diceValue}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs font-mono-num text-[#d9cebf]">
                    {gameState.players.map((p, i) => (
                      <span key={p.id} className="flex items-center gap-1">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: COLOR_HEX_CSS[p.color] }}
                        />
                        {gameState.positions[i]}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {gameState.gameType === 'backgammon' && (
                <div className="flex items-center gap-2 flex-wrap">
                  {gameState.dice.length > 0 && (
                    <div className="min-h-[40px] px-3 rounded-xl bg-[#251d17] border border-[#d4a84f]/35 flex items-center gap-2 text-xs">
                      <span className="text-[#cbbca8]">تاس‌ها:</span>
                      <span className="font-black font-mono-num text-sm text-[#f6d07a]">
                        {gameState.dice.join(' · ')}
                      </span>
                      {gameState.remainingDice.length > 0 && (
                        <span className="text-[#9e8d77] font-mono-num">
                          (باقی: {gameState.remainingDice.join(',')})
                        </span>
                      )}
                    </div>
                  )}

                  <div className="text-xs font-mono-num text-[#cbbca8] hidden sm:flex items-center gap-2">
                    <span>خارج‌شده: عاجی {gameState.borneOff[0]}/15</span>
                    <span>·</span>
                    <span>آبنوس {gameState.borneOff[1]}/15</span>
                  </div>

                  {selectedBgPoint !== null && (
                    <button
                      type="button"
                      onClick={onClearBgSelection}
                      className="min-h-[40px] px-3 rounded-xl bg-[#2d231c] hover:bg-[#3c2f26] text-xs font-bold text-[#f3e3c3] flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>لغو انتخاب ({selectedBgPoint === 25 || selectedBgPoint === 0 ? 'وسط' : selectedBgPoint})</span>
                    </button>
                  )}
                </div>
              )}

              {gameState.gameType === 'chess' && (
                <div className="flex items-center justify-between w-full gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#f8f1e4]">
                    {gameState.inCheck && (
                      <span className="px-2.5 py-1 rounded-lg bg-[#9e2f24] text-[#ffd7d2]">کیش!</span>
                    )}
                    <span>
                      {isMyTurn
                        ? selectedGridCell
                          ? 'خانه مقصد را انتخاب کنید'
                          : 'روی مهره خود کلیک یا لمس کنید'
                        : 'در انتظار حرکت حریف...'}
                    </span>
                  </div>
                  {selectedGridCell && (
                    <button
                      type="button"
                      onClick={onClearGridSelection}
                      className="min-h-[40px] px-3 rounded-xl bg-[#2d231c] hover:bg-[#3c2f26] text-xs font-bold text-[#f3e3c3] flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>لغو انتخاب</span>
                    </button>
                  )}
                </div>
              )}

              {gameState.gameType === 'othello' && (
                <div className="flex items-center justify-between w-full gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-xs font-mono-num">
                    <span className="px-2.5 py-1.5 rounded-lg bg-[#251d17] border border-white/10 text-[#f1e5cf] font-bold">
                      عاجی: {gameState.scores[0]}
                    </span>
                    <span className="px-2.5 py-1.5 rounded-lg bg-[#251d17] border border-white/10 text-[#d4a84f] font-bold">
                      آبنوس: {gameState.scores[1]}
                    </span>
                  </div>
                  <span className="text-xs text-[#cbbca8]">
                    {isMyTurn ? 'یک خانه سبز مجاز را لمس کنید' : 'در انتظار حرکت حریف...'}
                  </span>
                </div>
              )}

              {gameState.gameType === 'connect4' && (
                <div className="flex items-center justify-between w-full gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[#cbbca8]">
                    {isMyTurn ? 'ستون پرتاب مهره:' : 'نوبت حریف...'}
                  </span>
                  <div className="flex items-center gap-1.5" dir="ltr">
                    {[0, 1, 2, 3, 4, 5, 6].map((col) => {
                      const canDrop = isMyTurn && gameState.phase === 'move' && getAvailableConnect4Row(gameState.board, col) !== -1;
                      return (
                        <button
                          key={col}
                          type="button"
                          disabled={!canDrop}
                          onClick={() => onSelectConnect4Col(col)}
                          className={`min-w-[38px] min-h-[42px] rounded-xl text-sm font-black font-mono-num transition-all ${
                            canDrop
                              ? 'bg-[#d4a84f] hover:bg-[#e1b862] active:scale-95 text-[#181310]'
                              : 'bg-[#2a211b] text-[#736555] cursor-not-allowed'
                          }`}
                        >
                          {col + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {gameState.gameType === 'checkers' && (
                <div className="flex items-center justify-between w-full gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#f8f1e4]">
                    {gameState.mustJumpFrom && (
                      <span className="px-2.5 py-1 rounded-lg bg-[#9e2f24] text-[#ffd7d2]">
                        پرش زنجیره‌ای اجباری!
                      </span>
                    )}
                    <span>
                      {isMyTurn
                        ? gameState.mustJumpFrom || selectedGridCell
                          ? 'خانه مورب مقصد را انتخاب کنید'
                          : 'روی مهره خود لمس یا کلیک کنید'
                        : 'در انتظار حرکت حریف...'}
                    </span>
                  </div>
                  {selectedGridCell && !gameState.mustJumpFrom && (
                    <button
                      type="button"
                      onClick={onClearGridSelection}
                      className="min-h-[40px] px-3 rounded-xl bg-[#2d231c] hover:bg-[#3c2f26] text-xs font-bold text-[#f3e3c3] flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>لغو انتخاب</span>
                    </button>
                  )}
                </div>
              )}

              {gameState.gameType === 'morris' && (
                <div className="flex items-center justify-between w-full gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-xs font-mono-num flex-wrap">
                    <span className="px-2.5 py-1.5 rounded-lg bg-[#251d17] border border-white/10 text-[#f1e5cf] font-bold">
                      عاجی: {gameState.counts[0]}
                      {gameState.toPlace[0] > 0 ? ` (+${gameState.toPlace[0]})` : ''}
                    </span>
                    <span className="px-2.5 py-1.5 rounded-lg bg-[#251d17] border border-white/10 text-[#d4a84f] font-bold">
                      آبنوس: {gameState.counts[1]}
                      {gameState.toPlace[1] > 0 ? ` (+${gameState.toPlace[1]})` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#cbbca8]">
                      {!isMyTurn
                        ? 'در انتظار حریف...'
                        : gameState.subPhase === 'remove'
                        ? 'یک مهره قرمز حریف را حذف کنید'
                        : gameState.subPhase === 'place'
                        ? 'یک نقطه سبز را لمس کنید'
                        : selectedMorrisNode !== null
                        ? 'مقصد سبز را انتخاب کنید'
                        : gameState.counts[gameState.turnIndex] <= 3
                        ? 'پرواز آزاد: مهره خود را انتخاب کنید'
                        : 'مهره خود را انتخاب و جابه‌جا کنید'}
                    </span>
                    {selectedMorrisNode !== null && (
                      <button
                        type="button"
                        onClick={onClearMorrisSelection}
                        className="min-h-[38px] px-2.5 rounded-xl bg-[#2d231c] hover:bg-[#3c2f26] text-xs font-bold text-[#f3e3c3] flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>لغو</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {gameState.gameType === 'mancala' && (
                <div className="flex items-center justify-between w-full gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-xs font-mono-num">
                    <span className="px-2.5 py-1.5 rounded-lg bg-[#251d17] border border-white/10 text-[#f1e5cf] font-bold">
                      انبار ۱: {gameState.pits[6]}
                    </span>
                    <span className="px-2.5 py-1.5 rounded-lg bg-[#251d17] border border-white/10 text-[#d4a84f] font-bold">
                      انبار ۲: {gameState.pits[13]}
                    </span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-end gap-1.5 w-full sm:w-auto" dir="ltr">
                    {(() => {
                      const activeSeat =
                        isOnline && mySeatIndex !== null
                          ? mySeatIndex
                          : gameState.players[gameState.turnIndex]?.isAI
                          ? 0
                          : gameState.turnIndex;
                      const startPit = activeSeat === 0 ? 0 : 7;
                      return [0, 1, 2, 3, 4, 5].map((offset) => {
                        const pitIdx = startPit + offset;
                        const count = gameState.pits[pitIdx];
                        const canSow =
                          isMyTurn &&
                          gameState.phase === 'move' &&
                          gameState.turnIndex === activeSeat &&
                          count > 0;
                        return (
                          <button
                            key={pitIdx}
                            type="button"
                            disabled={!canSow}
                            onClick={() => onSelectMancalaPit(pitIdx)}
                            className={`min-w-[40px] min-h-[42px] px-2 rounded-xl text-xs font-black font-mono-num transition-all ${
                              canSow
                                ? 'bg-[#d4a84f] hover:bg-[#e1b862] active:scale-95 text-[#181310]'
                                : 'bg-[#2a211b] text-[#736555] cursor-not-allowed'
                            }`}
                          >
                            {count}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {gameState.gameType === 'mastermind' && (
                <div className="flex flex-col gap-2 w-full">
                  {!isMyTurn ? (
                    <div className="flex items-center justify-between text-xs text-[#cbbca8]">
                      <span>
                        {gameState.subPhase === 'set_secret'
                          ? 'در انتظار تعیین رمز مخفی توسط طراح کد...'
                          : 'در انتظار حدس رمزگشا...'}
                      </span>
                      <span className="font-mono-num text-[#d4a84f]">
                        تلاش {gameState.attempts.length} / {gameState.maxAttempts}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5" dir="ltr">
                          {[0, 1, 2, 3].map((slot) => {
                            const cid = draftMastermindGuess[slot];
                            const colorInfo = cid !== null ? MASTERMIND_COLORS[cid] : null;
                            const isSel = selectedMastermindSlot === slot;
                            return (
                              <button
                                key={slot}
                                type="button"
                                aria-label={`جایگاه ${slot + 1}`}
                                onClick={() => onSelectMastermindSlot(slot)}
                                className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-mono-num transition-transform ${
                                  isSel ? 'border-[#47d1b6] scale-110' : 'border-[#d4a84f]/50'
                                }`}
                                style={{
                                  backgroundColor: colorInfo ? colorInfo.css : '#251d17',
                                }}
                              >
                                {!colorInfo && <span className="text-[#9e8d77]">{slot + 1}</span>}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono-num text-[#cbbca8] hidden sm:inline">
                            {gameState.subPhase === 'set_secret'
                              ? 'رمز مخفی'
                              : `تلاش ${gameState.attempts.length + 1}/${gameState.maxAttempts}`}
                          </span>
                          <button
                            type="button"
                            onClick={onClearMastermindDraft}
                            className="min-h-[38px] px-2.5 rounded-xl bg-[#2d231c] hover:bg-[#3c2f26] text-xs font-bold text-[#f3e3c3] flex items-center gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>پاک</span>
                          </button>
                          <button
                            type="button"
                            disabled={draftMastermindGuess.some((v) => v === null)}
                            onClick={onSubmitMastermind}
                            className={`min-h-[38px] px-3.5 rounded-xl text-xs font-black transition-all ${
                              draftMastermindGuess.every((v) => v !== null)
                                ? 'bg-[#d4a84f] hover:bg-[#e1b862] active:scale-95 text-[#181310]'
                                : 'bg-[#2a211b] text-[#736555] cursor-not-allowed'
                            }`}
                          >
                            {gameState.subPhase === 'set_secret' ? 'ثبت رمز مخفی' : 'ثبت حدس'}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-center sm:justify-between gap-2 pt-0.5 flex-wrap">
                        <span className="text-[11px] text-[#b5a48e] hidden sm:inline">
                          انتخاب رنگ:
                        </span>
                        <div className="flex items-center gap-2" dir="ltr">
                          {MASTERMIND_COLORS.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              aria-label={c.nameFa}
                              title={c.nameFa}
                              onClick={() => onPickMastermindColor(c.id)}
                              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-white/30 hover:border-white active:scale-90 transition-transform shadow-md"
                              style={{ backgroundColor: c.css }}
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
