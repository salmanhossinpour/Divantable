import React, { useEffect, useState } from 'react';
import { BookOpen, Play, Trophy, Sparkles, X } from 'lucide-react';
import type { GameType } from '../game/types.ts';

interface GameGuideModalProps {
  isOpen: boolean;
  initialGame: GameType;
  canQuickStart: boolean;
  onClose: () => void;
  onStartGame: (game: GameType) => void;
}

interface GameGuideEntry {
  id: GameType;
  shortTitle: string;
  title: string;
  players: string;
  winCondition: string;
  steps: string[];
  controls: string;
}

const GAME_GUIDES: Record<GameType, GameGuideEntry> = {
  ludo: {
    id: 'ludo',
    shortTitle: 'منچ',
    title: 'منچ سه‌بعدی',
    players: '۲ تا ۴ نفره · با ربات / محلی / آنلاین',
    winCondition: 'اولین بازیکنی که هر ۴ مهره خود را دور کامل بگرداند و دقیقاً به خانه مرکزی برساند برنده است.',
    steps: [
      'برای خارج کردن مهره از حیاط و ورود به مسیر اصلی، باید تاس عدد ۶ بیاورد.',
      'آوردن ۶ یک نوبت جایزه می‌دهد؛ اما سه ۶ پشت‌سرهم نوبت را می‌سوزاند.',
      'اگر روی خانه معمولی (غیر ستاره‌دار) فرود بیایید و مهره حریف آنجا باشد، مهره او زده می‌شود و یک تاس جایزه می‌گیرید.',
      'خانه‌های ستاره‌دار امن هستند و هیچ مهره‌ای در آن‌ها زده نمی‌شود.',
    ],
    controls: 'کلید Space یا دکمه «ریختن تاس» را بزنید، سپس روی مهره روشن‌شده کلیک یا لمس کنید.',
  },
  snakes: {
    id: 'snakes',
    shortTitle: 'مار و پله',
    title: 'مار و پله سه‌بعدی',
    players: '۲ تا ۴ نفره · با ربات / محلی / آنلاین',
    winCondition: 'اولین نفری که دقیقاً روی خانه ۱۰۰ فرود بیاید برنده بازی است.',
    steps: [
      'به نوبت تاس بریزید؛ مهره به‌صورت خودکار به‌اندازه عدد تاس روی مسیر زیگزاگی حرکت می‌کند.',
      'فرود آمدن پای نردبان، مهره شما را مستقیم به خانه‌های بالاتر می‌برد.',
      'فرود آمدن روی سر مار، مهره را به دم مار در ردیف‌های پایین‌تر سر می‌دهد.',
      'اگر عدد تاس از خانه ۱۰۰ بیشتر شود، مهره در جای فعلی باقی می‌ماند تا عدد دقیق بیاید.',
    ],
    controls: 'با زدن Space یا دکمه «ریختن تاس» تاس بیندازید؛ حرکت و صعود خودکار انجام می‌شود.',
  },
  backgammon: {
    id: 'backgammon',
    shortTitle: 'تخته نرد',
    title: 'تخته نرد سه‌بعدی',
    players: '۲ نفره · با ربات / محلی / آنلاین',
    winCondition: 'تمام ۱۵ مهره خود را به خانه خودی بیاورید و پیش از حریف از صفحه خارج کنید.',
    steps: [
      'جفت (دو عدد برابر) به شما ۴ حرکت با همان عدد می‌دهد.',
      'فرود روی یک مهره تکی حریف (تک) آن را می‌زند و به بار وسط صفحه می‌فرستد.',
      'تا زمانی که مهره‌ای روی بار وسط دارید، ابتدا باید آن را وارد زمین حریف کنید.',
      'خانه‌ای که ۲ یا بیشتر مهره حریف رویش باشد بسته است و نمی‌توانید آنجا بنشینید.',
    ],
    controls: 'پس از ریختن تاس، روی ستون طلایی کلیک کنید و سپس خانه مقصد سبز یا سینی کناری (برای خروج) را بزنید.',
  },
  chess: {
    id: 'chess',
    shortTitle: 'شطرنج',
    title: 'شطرنج سه‌بعدی',
    players: '۲ نفره · با ربات / محلی / آنلاین',
    winCondition: 'شاه حریف را کیش و مات کنید تا هیچ حرکت قانونی برای نجات نداشته باشد.',
    steps: [
      'مهره‌های عاجی (سفید) بازی را آغاز می‌کنند و هدف محافظت از شاه و تهدید شاه حریف است.',
      'قوانین کامل فیده شامل قلعه کوچک و بزرگ، زدن آن‌پاسان و ترفیع پیاده به وزیر در عرض هشتم اجرا می‌شوند.',
      'در حالت کیش، تنها حرکت‌هایی مجاز هستند که خطر را از شاه رفع کنند.',
    ],
    controls: 'روی مهره خود بزنید تا خانه‌های مجاز (سبز برای حرکت، قرمز برای زدن) روشن شوند، سپس مقصد را انتخاب کنید.',
  },
  othello: {
    id: 'othello',
    shortTitle: 'اتللو',
    title: 'اتللو سه‌بعدی',
    players: '۲ نفره · با ربات / محلی / آنلاین',
    winCondition: 'در پایان بازی (پُر شدن صفحه یا نبود حرکت)، بازیکنی که مهره‌های هم‌رنگ بیشتری داشته باشد برنده است.',
    steps: [
      'هر مهره‌ای که می‌گذارید باید یک یا چند مهره حریف را به‌صورت افقی، عمودی یا مورب بین دو مهره خودتان محاصره کند.',
      'تمام مهره‌های محاصره‌شده حریف برگردانده شده و به رنگ شما درمی‌آیند.',
      'اگر حرکتی وجود نداشته باشد نوبت به‌صورت خودکار به حریف واگذار می‌شود؛ خانه‌های گوشه ارزشمندترین نقاط هستند.',
    ],
    controls: 'یکی از خانه‌های سبزِ مشخص‌شده روی صفحه را لمس یا کلیک کنید.',
  },
  connect4: {
    id: 'connect4',
    shortTitle: '۴ در ردیف',
    title: '۴ در ردیف سه‌بعدی',
    players: '۲ نفره · با ربات / محلی / آنلاین',
    winCondition: '۴ مهره هم‌رنگ خود را به‌صورت افقی، عمودی یا مورب پشت‌سرهم قرار دهید.',
    steps: [
      'بازیکنان به نوبت یک سکه از بالای یکی از ۷ ستون رها می‌کنند.',
      'مهره بر اثر جاذبه تا پایین‌ترین جای خالی آن ستون پایین می‌افتد.',
      'هم‌زمان به دنبال ساخت خط ۴تایی و بستن مسیر ۳تایی حریف باشید.',
    ],
    controls: 'مستقیماً روی ستون موردنظر در قاب سه‌بعدی کلیک کنید یا از دکمه‌های ۱ تا ۷ پایین صفحه استفاده کنید.',
  },
  checkers: {
    id: 'checkers',
    shortTitle: 'چکرز',
    title: 'چکرز سه‌بعدی',
    players: '۲ نفره · با ربات / محلی / آنلاین',
    winCondition: 'تمام مهره‌های حریف را بزنید یا راه تمام حرکات او را ببندید.',
    steps: [
      'مهره‌های معمولی فقط یک خانه به سمت جلو و روی خانه‌های تیره مورب حرکت می‌کنند.',
      'اگر امکان پرش روی مهره حریف وجود داشته باشد، زدن مهره اجباری است.',
      'در صورت ادامه مسیر پرش، پرش زنجیره‌ای در همان نوبت ادامه می‌یابد.',
      'رسیدن به آخرین ردیف حریف مهره را «شاه تاج‌دار» می‌کند که به جلو و عقب هم حرکت و پرش دارد.',
    ],
    controls: 'روی مهره طلایی بزنید، سپس خانه مقصد سبز یا خانه پرش قرمز را انتخاب کنید.',
  },
  morris: {
    id: 'morris',
    shortTitle: 'دوز ۹ تایی',
    title: 'دوز ۹ تایی سه‌بعدی',
    players: '۲ نفره · با ربات / محلی / آنلاین',
    winCondition: 'تعداد مهره‌های حریف را به کمتر از ۳ برسانید یا تمام راه‌های حرکتش را ببندید.',
    steps: [
      'مرحله ۱ (چیدن): بازیکنان به نوبت ۹ مهره خود را روی ۲۴ تقاطع می‌گذارند.',
      'ساختن ردیف ۳تایی (دوز/میل) اجازه می‌دهد یکی از مهره‌های حریف را حذف کنید (اولویت با مهره‌های خارج از دوز است).',
      'مرحله ۲ (حرکت): مهره‌ها را روی خطوط به نقاط مجاور خالی جابه‌جا کنید.',
      'مرحله ۳ (پرواز): وقتی ۳ مهره برایتان بماند، می‌توانید به هر نقطه خالی روی صفحه بپرید.',
    ],
    controls: 'در مرحله چیدن نقطه سبز، برای حذف مهره قرمز حریف و در حرکت ابتدا مهره خود و سپس مقصد سبز را لمس کنید.',
  },
  mancala: {
    id: 'mancala',
    shortTitle: 'منقله',
    title: 'منقله سه‌بعدی',
    players: '۲ نفره · با ربات / محلی / آنلاین',
    winCondition: 'وقتی ۶ چاله یک طرف خالی شود، بازیکن مقابل سنگ‌های سمت خود را جمع می‌کند و بیشترین موجودی انبار برنده است.',
    steps: [
      'یکی از ۶ چاله پُر سمت خود را انتخاب کنید؛ تمام سنگ‌های آن پادساعت‌گرد در چاله‌های بعدی کاشته می‌شوند (انبار حریف رد می‌شود).',
      'اگر آخرین سنگ داخل «انبار خودتان» بیفتد، یک نوبت اضافه می‌گیرید.',
      'اگر آخرین سنگ در یک چاله خالیِ سمت خودتان بیفتد و چاله روبه‌رویی حریف سنگ داشته باشد، هر دو به انبار شما منتقل می‌شوند.',
    ],
    controls: 'مستقیم روی یکی از چاله‌های روشن‌شده در صفحه سه‌بعدی یا دکمه‌های عددی پایین صفحه بزنید.',
  },
  mastermind: {
    id: 'mastermind',
    shortTitle: 'فکروبکر',
    title: 'فکروبکر سه‌بعدی',
    players: '۲ نفره · با ربات / محلی / آنلاین',
    winCondition: 'رمز مخفی ۴ رنگی را در حداکثر ۱۰ تلاش کشف کنید (در حالت دونفره طراح رمز با ناکامی حریف برنده می‌شود).',
    steps: [
      'از بین ۶ رنگ، یک ترکیب ۴تایی برای ردیف فعال بچینید (تکرار رنگ مجاز است).',
      'پس از ثبت حدس، پین‌های راهنما در سمت راست ظاهر می‌شوند: پین سیاه یعنی هم رنگ و هم جایگاه دقیقاً درست است.',
      'پین سفید یعنی رنگ در رمز وجود دارد ولی جایگاهش اشتباه است.',
      'در حالت دونفره محلی یا آنلاین، ابتدا بازیکن دوم کد مخفی را پشت سپر چوبی تعیین می‌کند.',
    ],
    controls: 'رنگ‌ها را از نوار پایین انتخاب کنید یا برای تغییر یک خانه خاص روی جایگاه ۱ تا ۴ (در نوار یا صفحه ۳بعدی) بزنید و «ثبت حدس» را بزنید.',
  },
};

const GUIDE_ORDER: GameType[] = [
  'ludo',
  'snakes',
  'backgammon',
  'chess',
  'othello',
  'connect4',
  'checkers',
  'morris',
  'mancala',
  'mastermind',
];

export const GameGuideModal: React.FC<GameGuideModalProps> = ({
  isOpen,
  initialGame,
  canQuickStart,
  onClose,
  onStartGame,
}) => {
  const [activeGame, setActiveGame] = useState<GameType>(initialGame);

  useEffect(() => {
    if (isOpen) {
      setActiveGame(initialGame);
    }
  }, [isOpen, initialGame]);

  if (!isOpen) return null;

  const guide = GAME_GUIDES[activeGame];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 p-3 sm:p-5">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl bg-[#1a1411] border border-[#d4a84f]/45 shadow-2xl p-3.5 sm:p-6 flex flex-col gap-3 sm:gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5 sm:pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#d4a84f]" />
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#f8f1e4]">
                آموزش و قوانین بازی‌ها
              </h2>
              <p className="text-[11px] text-[#b5a48e]">راهنمای کامل تمام ۱۰ بازی سه‌بعدی</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="بستن آموزش"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] sm:min-w-[42px] sm:min-h-[42px] rounded-xl bg-[#271e19] hover:bg-[#352922] text-[#e8dccb] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable selector + guide body */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 sm:gap-4 pl-0.5">
          {/* 10-game 2x5 / 5x2 Selector Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 shrink-0">
            {GUIDE_ORDER.map((gt) => {
              const entry = GAME_GUIDES[gt];
              const selected = activeGame === gt;
              return (
                <button
                  key={gt}
                  type="button"
                  onClick={() => setActiveGame(gt)}
                  className={`min-h-[34px] sm:min-h-[38px] px-2 rounded-xl border text-xs font-bold transition-colors whitespace-nowrap ${
                    selected
                      ? 'bg-[#d4a84f] text-[#181310] border-[#d4a84f]'
                      : 'bg-[#241c17] text-[#d9cebf] border-white/10 hover:border-[#d4a84f]/50'
                  }`}
                >
                  {entry.shortTitle}
                </button>
              );
            })}
          </div>

          {/* Selected Game Guide Body */}
          <div className="rounded-xl bg-[#221a15] border border-white/10 p-3 sm:p-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 pb-2">
              <h3 className="text-base sm:text-lg font-black text-[#f6d07a]">{guide.title}</h3>
              <span className="text-[11px] text-[#cbbca8]">{guide.players}</span>
            </div>

            <div className="rounded-xl bg-[#1a1411] border border-[#d4a84f]/25 px-3 py-2 sm:px-3.5 sm:py-2.5 flex items-start gap-2.5">
              <Trophy className="w-4 h-4 text-[#d4a84f] shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed text-[#f5efe6]">
                <span className="font-bold text-[#d4a84f]">هدف بازی: </span>
                {guide.winCondition}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 sm:gap-2">
              <span className="text-xs font-bold text-[#d4a84f]">قوانین و مراحل بازی</span>
              <ol className="flex flex-col gap-1.5 sm:gap-2">
                {guide.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs leading-relaxed text-[#e6d7c3]">
                    <span className="w-5 h-5 rounded-md bg-[#2f251e] border border-[#d4a84f]/30 text-[#f6d07a] font-mono-num text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-xl bg-[#2b221b] border border-white/10 px-3 py-2 sm:px-3.5 sm:py-2.5 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#47d1b6] shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed text-[#dfd3c3]">
                <span className="font-bold text-[#47d1b6]">نحوه کنترل: </span>
                {guide.controls}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          {canQuickStart && (
            <button
              type="button"
              onClick={() => onStartGame(activeGame)}
              className="flex-1 min-h-[44px] sm:min-h-[46px] rounded-xl bg-[#d4a84f] hover:bg-[#e1b862] text-[#181310] font-black text-sm flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>شروع {guide.title}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className={`${canQuickStart ? 'px-5' : 'w-full'} min-h-[44px] sm:min-h-[46px] rounded-xl bg-[#271e19] hover:bg-[#352922] border border-white/10 text-[#f5efe6] font-bold text-sm`}
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
