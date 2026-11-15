import React, { useEffect, useState } from 'react';
import { Copy, Check, Globe, Plus, RefreshCw, Users, X, Play } from 'lucide-react';
import type { GameType, RoomSummary } from '../game/types.ts';

interface MultiplayerLobbyModalProps {
  isOpen: boolean;
  connected: boolean;
  rooms: RoomSummary[];
  activeRoom: RoomSummary | null;
  myPlayerId: string;
  errorMessage: string | null;
  defaultGame: GameType;
  onClose: () => void;
  onRefresh: () => void;
  onCreateRoom: (gameType: GameType, maxPlayers: number, playerName: string) => void;
  onJoinRoom: (code: string, playerName: string) => void;
  onLeaveRoom: () => void;
  onStartRoom: (fillWithAI: boolean) => void;
}

const GAME_LABELS: Record<GameType, string> = {
  ludo: 'منچ سه‌بعدی',
  snakes: 'مار و پله سه‌بعدی',
  backgammon: 'تخته نرد سه‌بعدی',
  chess: 'شطرنج سه‌بعدی',
  othello: 'اتللو سه‌بعدی',
  connect4: '۴ در ردیف سه‌بعدی',
  checkers: 'چکرز سه‌بعدی',
  morris: 'دوز ۹ تایی سه‌بعدی',
  mancala: 'منقله سه‌بعدی',
  mastermind: 'فکروبکر سه‌بعدی',
};

const TWO_PLAYER_ONLY = (g: GameType) =>
  g === 'backgammon' ||
  g === 'chess' ||
  g === 'othello' ||
  g === 'connect4' ||
  g === 'checkers' ||
  g === 'morris' ||
  g === 'mancala' ||
  g === 'mastermind';

export const MultiplayerLobbyModal: React.FC<MultiplayerLobbyModalProps> = ({
  isOpen,
  connected,
  rooms,
  activeRoom,
  myPlayerId,
  errorMessage,
  defaultGame,
  onClose,
  onRefresh,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onStartRoom,
}) => {
  const [playerName, setPlayerName] = useState('بازیکن');
  const [gameType, setGameType] = useState<GameType>(defaultGame);
  const [maxPlayers, setMaxPlayers] = useState(TWO_PLAYER_ONLY(defaultGame) ? 2 : 4);
  const [joinCode, setJoinCode] = useState('');
  const [fillWithAI, setFillWithAI] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setGameType(defaultGame);
    if (TWO_PLAYER_ONLY(defaultGame)) setMaxPlayers(2);
  }, [defaultGame]);

  useEffect(() => {
    if (isOpen) {
      onRefresh();
    }
  }, [isOpen, onRefresh]);

  if (!isOpen) return null;

  const isHost = activeRoom ? activeRoom.players[0]?.id === myPlayerId : false;

  const handleCopyCode = () => {
    if (!activeRoom) return;
    navigator.clipboard?.writeText(activeRoom.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[#1a1411] border border-[#d4a84f]/40 shadow-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-[#d4a84f]" />
            <h2 className="text-lg font-black text-[#f8f1e4]">لابی بازی آنلاین چندنفره</h2>
          </div>
          <button
            type="button"
            aria-label="بستن لابی"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-xl bg-[#271e19] hover:bg-[#352922] text-[#e8dccb] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between text-xs text-[#cbbca8]">
          <span>وضعیت سرور: {connected ? 'متصل به سرور آنلاین' : 'در حال اتصال...'}</span>
          <button
            type="button"
            onClick={onRefresh}
            className="min-h-[36px] px-2.5 rounded-lg bg-[#271e19] hover:bg-[#332720] text-[#e6d7c3] flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>به‌روزرسانی</span>
          </button>
        </div>

        {errorMessage && (
          <div className="rounded-xl bg-[#4c1e1a] border border-[#c94a3c] px-3.5 py-2.5 text-xs font-semibold text-[#ffd7d2]">
            {errorMessage}
          </div>
        )}

        {activeRoom ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl bg-[#241c17] border border-[#d4a84f]/35 p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-[#bfa98e]">{GAME_LABELS[activeRoom.gameType]}</div>
                <div className="text-xl font-black font-mono-num tracking-widest text-[#f6d07a] mt-0.5">
                  {activeRoom.code}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="min-h-[44px] px-3.5 rounded-xl bg-[#32261e] hover:bg-[#413227] text-[#f5efe6] text-xs font-bold flex items-center gap-2"
              >
                {copied ? <Check className="w-4 h-4 text-[#63e28a]" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'کپی شد' : 'کپی کد اتاق'}</span>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-xs font-bold text-[#d4a84f] flex items-center justify-between">
                <span>بازیکنان حاضر در اتاق</span>
                <span className="font-mono-num">
                  {activeRoom.players.length} / {activeRoom.maxPlayers}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {activeRoom.players.map((p, idx) => (
                  <div
                    key={p.id}
                    className="rounded-xl bg-[#221b16] border border-white/10 px-3.5 py-2.5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono-num text-[#bfa98e]">#{idx + 1}</span>
                      <span className="text-sm font-bold text-[#f5efe6]">{p.name}</span>
                    </div>
                    <span className="text-xs text-[#b5a48e]">
                      {p.connected ? 'آماده' : 'قطع موقت'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {isHost ? (
              <div className="flex flex-col gap-3">
                {activeRoom.players.length < activeRoom.maxPlayers && (
                  <label className="flex items-center justify-between rounded-xl bg-[#221b16] border border-white/10 px-3.5 py-2.5 cursor-pointer">
                    <span className="text-xs font-semibold text-[#e6d7c3]">
                      تکمیل صندلی‌های خالی با ربات هوشمند
                    </span>
                    <input
                      type="checkbox"
                      checked={fillWithAI}
                      onChange={(e) => setFillWithAI(e.target.checked)}
                      className="w-5 h-5 accent-[#d4a84f]"
                    />
                  </label>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onStartRoom(fillWithAI)}
                    className="flex-1 min-h-[48px] rounded-xl bg-[#d4a84f] hover:bg-[#e1b862] text-[#181310] font-black text-sm flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>شروع مسابقه آنلاین</span>
                  </button>
                  <button
                    type="button"
                    onClick={onLeaveRoom}
                    className="min-h-[48px] px-4 rounded-xl bg-[#2a201a] hover:bg-[#3a2c24] text-[#e6d7c3] text-xs font-bold"
                  >
                    خروج
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-[#cbbca8]">منتظر شروع بازی توسط میزبان...</p>
                <button
                  type="button"
                  onClick={onLeaveRoom}
                  className="min-h-[44px] px-4 rounded-xl bg-[#2a201a] hover:bg-[#3a2c24] text-[#e6d7c3] text-xs font-bold"
                >
                  ترک اتاق
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="online-player-name" className="text-xs font-bold text-[#d4a84f]">
                نام شما در بازی
              </label>
              <input
                id="online-player-name"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                className="min-h-[44px] rounded-xl bg-[#241c17] border border-white/15 px-3.5 text-sm text-[#f8f1e4] focus:outline-none focus:border-[#d4a84f]"
                placeholder="نام خود را وارد کنید"
              />
            </div>

            {/* Create Room */}
            <div className="rounded-xl bg-[#211a15] border border-white/10 p-3.5 flex flex-col gap-3">
              <div className="text-xs font-bold text-[#f3e3c3] flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[#d4a84f]" />
                <span>ساخت اتاق جدید</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['ludo', 'snakes', 'backgammon', 'chess', 'othello', 'connect4', 'checkers', 'morris', 'mancala', 'mastermind'] as GameType[]).map((gt) => (
                  <button
                    key={gt}
                    type="button"
                    onClick={() => {
                      setGameType(gt);
                      if (TWO_PLAYER_ONLY(gt)) setMaxPlayers(2);
                    }}
                    className={`min-h-[40px] px-2 rounded-lg text-xs font-bold border transition-colors ${
                      gameType === gt
                        ? 'bg-[#d4a84f] text-[#181310] border-[#d4a84f]'
                        : 'bg-[#2a211b] text-[#d9cebf] border-white/10'
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

              {!TWO_PLAYER_ONLY(gameType) && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#cbbca8]">ظرفیت اتاق</span>
                  <div className="flex gap-1.5">
                    {[2, 3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setMaxPlayers(n)}
                        className={`min-w-[38px] min-h-[36px] rounded-lg font-bold tabular-nums ${
                          maxPlayers === n ? 'bg-[#d4a84f] text-[#181310]' : 'bg-[#2a211b] text-[#e6d7c3]'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => onCreateRoom(gameType, TWO_PLAYER_ONLY(gameType) ? 2 : maxPlayers, playerName)}
                className="min-h-[46px] w-full rounded-xl bg-[#d4a84f] hover:bg-[#e1b862] text-[#181310] font-black text-sm"
              >
                ساخت اتاق و دریافت کد
              </button>
            </div>

            {/* Join by Code */}
            <div className="rounded-xl bg-[#211a15] border border-white/10 p-3.5 flex flex-col gap-2.5">
              <label htmlFor="join-room-code" className="text-xs font-bold text-[#f3e3c3]">
                ورود با کد اتاق
              </label>
              <div className="flex gap-2">
                <input
                  id="join-room-code"
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="مثلاً K7M2P"
                  className="flex-1 min-h-[44px] rounded-xl bg-[#181310] border border-white/15 px-3 text-sm font-mono-num uppercase tracking-widest text-[#f8f1e4] focus:outline-none focus:border-[#d4a84f]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (joinCode.trim().length >= 4) {
                      onJoinRoom(joinCode.trim(), playerName);
                    }
                  }}
                  className="min-h-[44px] px-4 rounded-xl bg-[#2d7a4f] hover:bg-[#35915e] text-white font-bold text-sm"
                >
                  ورود
                </button>
              </div>
            </div>

            {/* Public Rooms */}
            <div className="flex flex-col gap-2">
              <div className="text-xs font-bold text-[#d4a84f] flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>اتاق‌های آماده پیوستن</span>
              </div>
              {rooms.length === 0 ? (
                <div className="rounded-xl bg-[#211a15] border border-white/5 p-3 text-xs text-[#9c8c79] text-center">
                  در حال حاضر اتاق منتظری وجود ندارد. می‌توانید یک اتاق جدید بسازید.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {rooms.map((r) => (
                    <div
                      key={r.code}
                      className="rounded-xl bg-[#211a15] border border-white/10 px-3.5 py-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#f8f1e4] truncate">
                          {GAME_LABELS[r.gameType]} · میزبان: {r.hostName}
                        </div>
                        <div className="text-[11px] text-[#b5a48e] font-mono-num">
                          کد: {r.code} · {r.players.length}/{r.maxPlayers} بازیکن
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onJoinRoom(r.code, playerName)}
                        className="min-h-[40px] px-3.5 rounded-lg bg-[#d4a84f] hover:bg-[#e1b862] text-[#181310] text-xs font-black shrink-0"
                      >
                        پیوستن
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
