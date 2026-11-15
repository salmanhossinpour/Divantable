import React from 'react';
import { BookOpen, Home, Play, RotateCcw, Trophy } from 'lucide-react';
import type { GameType, UnifiedGameState } from '../game/types.ts';

interface StatusModalProps {
  mode: 'paused' | 'gameover';
  gameState: UnifiedGameState;
  isOnline: boolean;
  onResume: () => void;
  onRestart: () => void;
  onSwitchGame: (game: GameType) => void;
  onOpenGuide: () => void;
  onReturnToTitle: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  mode,
  gameState,
  isOnline,
  onResume,
  onRestart,
  onSwitchGame,
  onOpenGuide,
  onReturnToTitle,
}) => {
  const winnerSeat =
    gameState.winnerIndex !== null ? gameState.players[gameState.winnerIndex] : null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#1a1411] border border-[#d4a84f]/45 shadow-2xl p-6 flex flex-col gap-5">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          {mode === 'gameover' ? (
            <div className="w-11 h-11 rounded-xl bg-[#d4a84f]/20 border border-[#d4a84f]/50 flex items-center justify-center text-[#f6d07a]">
              <Trophy className="w-6 h-6" />
            </div>
          ) : null}
          <div>
            <h2 className="text-xl font-black text-[#f8f1e4]">
              {mode === 'gameover'
                ? winnerSeat
                  ? `برنده: ${winnerSeat.name}`
                  : 'پایان بازی'
                : 'توقف بازی'}
            </h2>
            <p className="text-xs text-[#cbbca8] mt-0.5">
              {mode === 'gameover'
                ? gameState.lastEvent
                : 'می‌توانید بازی را ادامه دهید یا بازی دیگری انتخاب کنید.'}
            </p>
          </div>
        </div>

        {/* Tabular stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#231b16] border border-white/10 p-3">
            <div className="text-[11px] text-[#a89680]">نوع بازی</div>
            <div className="text-sm font-bold text-[#f8f1e4] mt-0.5">
              {gameState.gameType === 'ludo'
                ? 'منچ سه‌بعدی'
                : gameState.gameType === 'snakes'
                ? 'مار و پله سه‌بعدی'
                : gameState.gameType === 'backgammon'
                ? 'تخته نرد سه‌بعدی'
                : gameState.gameType === 'chess'
                ? 'شطرنج سه‌بعدی'
                : gameState.gameType === 'othello'
                ? 'اتللو سه‌بعدی'
                : gameState.gameType === 'connect4'
                ? '۴ در ردیف سه‌بعدی'
                : gameState.gameType === 'checkers'
                ? 'چکرز سه‌بعدی'
                : gameState.gameType === 'morris'
                ? 'دوز ۹ تایی سه‌بعدی'
                : gameState.gameType === 'mancala'
                ? 'منقله سه‌بعدی'
                : 'فکروبکر سه‌بعدی'}
            </div>
          </div>
          <div className="rounded-xl bg-[#231b16] border border-white/10 p-3">
            <div className="text-[11px] text-[#a89680]">تعداد نوبت‌ها</div>
            <div className="text-sm font-black font-mono-num text-[#f6d07a] mt-0.5">
              {gameState.turnCount}
            </div>
          </div>
        </div>

        {mode === 'paused' && !isOnline && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-[#d4a84f]">تغییر سریع بازی</span>
            <div className="grid grid-cols-2 gap-1.5">
              {(['ludo', 'snakes', 'backgammon', 'chess', 'othello', 'connect4', 'checkers', 'morris', 'mancala', 'mastermind'] as GameType[]).map((gt) => (
                <button
                  key={gt}
                  type="button"
                  onClick={() => onSwitchGame(gt)}
                  className={`min-h-[40px] rounded-xl border text-xs font-bold ${
                    gameState.gameType === gt
                      ? 'bg-[#d4a84f] text-[#181310] border-[#d4a84f]'
                      : 'bg-[#251d17] text-[#e6d7c3] border-white/10 hover:border-[#d4a84f]/40'
                  }`}
                >
                  {gt === 'ludo'
                    ? 'منچ'
                    : gt === 'snakes'
                    ? 'مار و پله'
                    : gt === 'backgammon'
                    ? 'تخته نرد'
                    : gt === 'chess'
                    ? 'شطرنج'
                    : gt === 'othello'
                    ? 'اتللو'
                    : gt === 'connect4'
                    ? '۴ در ردیف'
                    : gt === 'checkers'
                    ? 'چکرز'
                    : gt === 'morris'
                    ? 'دوز ۹ تایی'
                    : gt === 'mancala'
                    ? 'منقله'
                    : 'فکروبکر'}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {mode === 'paused' ? (
            <button
              type="button"
              onClick={onResume}
              className="w-full min-h-[48px] rounded-xl bg-[#d4a84f] hover:bg-[#e1b862] text-[#181310] font-black text-sm flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>ادامه بازی</span>
            </button>
          ) : (
            !isOnline && (
              <button
                type="button"
                data-start="true"
                onClick={onRestart}
                className="w-full min-h-[48px] rounded-xl bg-[#d4a84f] hover:bg-[#e1b862] text-[#181310] font-black text-sm flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>بازی مجدد</span>
              </button>
            )
          )}

          {mode === 'paused' && !isOnline && (
            <button
              type="button"
              onClick={onRestart}
              className="w-full min-h-[44px] rounded-xl bg-[#271e19] hover:bg-[#332720] border border-white/10 text-[#f5efe6] font-bold text-sm flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>شروع از اول</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenGuide}
            className="w-full min-h-[44px] rounded-xl bg-[#241c17] hover:bg-[#31261f] border border-[#d4a84f]/30 text-[#f2dfba] font-bold text-sm flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4 text-[#d4a84f]" />
            <span>آموزش این بازی</span>
          </button>

          <button
            type="button"
            onClick={onReturnToTitle}
            className="w-full min-h-[44px] rounded-xl bg-[#221a15] hover:bg-[#2d221c] border border-white/10 text-[#cbbca8] font-bold text-sm flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>بازگشت به صفحه اصلی</span>
          </button>
        </div>
      </div>
    </div>
  );
};
