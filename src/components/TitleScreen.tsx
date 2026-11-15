import React from 'react';
import { BookOpen, Download, Globe, Play, Users, Bot } from 'lucide-react';
import type { GameType, PlayMode } from '../game/types.ts';

interface TitleScreenProps {
  selectedGame: GameType;
  selectedMode: PlayMode;
  playerCount: number;
  isPWAInstallable: boolean;
  onSelectGame: (game: GameType) => void;
  onSelectMode: (mode: PlayMode) => void;
  onSelectPlayerCount: (count: number) => void;
  onStartLocalOrAI: () => void;
  onOpenOnlineLobby: () => void;
  onOpenGuide: () => void;
  onInstallPWA: () => void;
}

const GAME_OPTIONS: { id: GameType; title: string; subtitle: string }[] = [
  { id: 'ludo', title: 'منچ سه‌بعدی', subtitle: '۲ تا ۴ نفره' },
  { id: 'snakes', title: 'مار و پله', subtitle: 'تخته ۱۰۰ خانه' },
  { id: 'backgammon', title: 'تخته نرد', subtitle: '۲ نفره اصیل' },
  { id: 'chess', title: 'شطرنج ۳بعدی', subtitle: 'استراتژیک' },
  { id: 'othello', title: 'اتللو ۳بعدی', subtitle: 'مهره برگردان' },
  { id: 'connect4', title: '۴ در ردیف', subtitle: 'مهره ستونی' },
  { id: 'checkers', title: 'چکرز ۳بعدی', subtitle: 'پرش و شاه' },
  { id: 'morris', title: 'دوز ۹ تایی', subtitle: '۳ ردیف و حذف' },
  { id: 'mancala', title: 'منقله ۳بعدی', subtitle: 'سنگ و انبار' },
  { id: 'mastermind', title: 'فکروبکر ۳بعدی', subtitle: 'حدس رمز ۴ رنگی' },
];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedGame,
  selectedMode,
  playerCount,
  isPWAInstallable,
  onSelectGame,
  onSelectMode,
  onSelectPlayerCount,
  onStartLocalOrAI,
  onOpenOnlineLobby,
  onOpenGuide,
  onInstallPWA,
}) => {
  const supportsMultiCount = selectedGame === 'ludo' || selectedGame === 'snakes';
  const effectivePlayers = supportsMultiCount ? playerCount : 2;

  const handlePrimaryClick = () => {
    if (selectedMode === 'online') {
      onOpenOnlineLobby();
    } else {
      onStartLocalOrAI();
    }
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 sm:p-8">
      {/* Asymmetric panel positioned on calm side so center 3D board remains visible */}
      <div className="flex-1 flex items-center justify-center lg:justify-start">
        <div
          className="pointer-events-auto w-full max-w-[440px] max-h-[89vh] overflow-y-auto rounded-2xl bg-[#181310]/94 border border-[#d4a84f]/30 shadow-2xl p-4 sm:p-5 flex flex-col gap-3.5"
          style={{ boxShadow: '0 24px 60px rgba(0,0,0,0.65)' }}
        >
          {/* Bespoke inline SVG emblem + Title lockup */}
          <div className="flex items-center gap-3.5 border-b border-[#d4a84f]/20 pb-3">
            <svg
              viewBox="0 0 64 64"
              className="w-11 h-11 shrink-0"
              aria-hidden="true"
            >
              <polygon
                points="32,4 58,19 58,45 32,60 6,45 6,19"
                fill="#241c17"
                stroke="#d4a84f"
                strokeWidth="2.5"
              />
              <polygon
                points="32,12 50,22.5 50,41.5 32,52 14,41.5 14,22.5"
                fill="none"
                stroke="#d4a84f"
                strokeOpacity="0.45"
                strokeWidth="1.2"
              />
              <circle cx="32" cy="32" r="9" fill="#d4a84f" />
              <circle cx="32" cy="32" r="4" fill="#181310" />
            </svg>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#f8f1e4]">
                دیوان تخته و مهره
              </h1>
              <p className="text-xs text-[#c7b8a3] mt-0.5 truncate">
                مجموعه ۱۰ بازی رومیزی سه‌بعدی آنلاین و آفلاین
              </p>
            </div>
          </div>

          {/* Game Type Selector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[#d4a84f]">انتخاب بازی</span>
            <div className="grid grid-cols-2 gap-1.5">
              {GAME_OPTIONS.map((g) => {
                const active = selectedGame === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => onSelectGame(g.id)}
                    className={`min-h-[42px] px-2.5 py-1.5 rounded-xl text-right flex flex-col justify-center border transition-colors ${
                      active
                        ? 'bg-[#2e231a] border-[#d4a84f] text-[#fff8ec]'
                        : 'bg-[#201914] border-white/10 text-[#cfc2b0] hover:border-[#d4a84f]/50'
                    }`}
                  >
                    <span className="font-bold text-xs whitespace-nowrap">{g.title}</span>
                    <span className="text-[10px] text-[#b5a48e] whitespace-nowrap">{g.subtitle}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode & Player Count */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold text-[#d4a84f]">حالت بازی</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onSelectMode('ai')}
                className={`min-h-[44px] px-2 py-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors ${
                  selectedMode === 'ai'
                    ? 'bg-[#d4a84f] text-[#181310] border-[#d4a84f]'
                    : 'bg-[#201914] text-[#d9cebf] border-white/10 hover:border-[#d4a84f]/50'
                }`}
              >
                <Bot className="w-4 h-4" />
                <span className="whitespace-nowrap">با ربات</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectMode('local')}
                className={`min-h-[44px] px-2 py-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors ${
                  selectedMode === 'local'
                    ? 'bg-[#d4a84f] text-[#181310] border-[#d4a84f]'
                    : 'bg-[#201914] text-[#d9cebf] border-white/10 hover:border-[#d4a84f]/50'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="whitespace-nowrap">محلی</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectMode('online')}
                className={`min-h-[44px] px-2 py-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors ${
                  selectedMode === 'online'
                    ? 'bg-[#d4a84f] text-[#181310] border-[#d4a84f]'
                    : 'bg-[#201914] text-[#d9cebf] border-white/10 hover:border-[#d4a84f]/50'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span className="whitespace-nowrap">آنلاین</span>
              </button>
            </div>

            {supportsMultiCount && selectedMode !== 'online' && (
              <div className="flex items-center justify-between bg-[#201914] border border-white/10 rounded-xl px-3 py-2">
                <span className="text-xs font-semibold text-[#cbbca8]">تعداد بازیکنان</span>
                <div className="flex items-center gap-1.5">
                  {[2, 3, 4].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => onSelectPlayerCount(cnt)}
                      className={`min-w-[40px] min-h-[36px] rounded-lg text-xs font-bold tabular-nums transition-colors ${
                        effectivePlayers === cnt
                          ? 'bg-[#d4a84f] text-[#181310]'
                          : 'bg-[#2c221b] text-[#d9cebf] hover:bg-[#3a2d24]'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Primary Start CTA */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              data-start="true"
              onClick={handlePrimaryClick}
              className="w-full min-h-[50px] rounded-xl bg-[#d4a84f] hover:bg-[#e1b862] active:scale-[0.99] text-[#181310] font-black text-base flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              {selectedMode === 'online' ? <Globe className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
              <span>{selectedMode === 'online' ? 'ورود به لابی آنلاین' : 'شروع بازی'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenGuide}
              className="w-full min-h-[42px] rounded-xl bg-[#241c17] hover:bg-[#2f251e] border border-[#d4a84f]/35 text-[#f2dfba] font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <BookOpen className="w-4 h-4 text-[#d4a84f]" />
              <span>آموزش و قوانین بازی‌ها</span>
            </button>

            {isPWAInstallable && (
              <button
                type="button"
                onClick={onInstallPWA}
                className="w-full min-h-[42px] rounded-xl bg-[#241c17] hover:bg-[#2f251e] border border-[#d4a84f]/40 text-[#f2dfba] font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>نصب نسخه اپلیکیشن (اندروید / دسکتاپ)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Single flat control hint line */}
      <div className="text-center text-xs text-[#cbbca8]/90 tracking-wide">
        لمس یا کلیک روی مهره برای حرکت · چرخش دوربین با کشیدن صفحه · Space ریختن تاس · Esc توقف
      </div>
    </div>
  );
};
