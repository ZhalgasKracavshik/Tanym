'use client';

/**
 * Кольцо прогресса — как на фитнес-браслете.
 *
 * Полоса показывает «сколько сделано из целого», и это верно, но плоско:
 * пять полос подряд читаются как таблица. Кольцо замкнуто, у него виден
 * незакрытый участок, и незакрытое кольцо просит, чтобы его закрыли —
 * та же причина, по которой в браслетах прижилась именно эта форма.
 *
 * Поэтому кольцо здесь — не замена ProgressBar везде, а форма для одной-двух
 * главных цифр экрана. Списки тем остаются на полосах: там важно сравнивать
 * строки между собой, а сравнивать десять колец глазом тяжело.
 */

import { useReducedMotion } from 'framer-motion';

export function ProgressRing({
  value,
  size = 132,
  thickness = 10,
  label,
  caption,
  tone = 'brand',
}: {
  /** Доля от 0 до 1. */
  value: number;
  size?: number;
  thickness?: number;
  /** Крупная надпись в центре. По умолчанию — проценты. */
  label?: string;
  /** Мелкая подпись под ней. */
  caption?: string;
  tone?: 'brand' | 'success' | 'accent';
}) {
  const reduce = useReducedMotion();
  const clamped = Math.min(1, Math.max(0, value));
  const percent = Math.round(clamped * 100);

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  /*
    Эффект «цели-градиента»: даже при нулевом прогрессе рисуем короткую
    дугу. Совсем пустое кольцо сообщает «ты ещё не начинал» — а начатое,
    пусть на волос, продолжают охотнее, чем начинают с чистого листа.
    Цифра в центре при этом остаётся честной: показываем настоящие 0%,
    подкрашена только дуга, а не значение.
  */
  const drawn = Math.max(clamped, 0.035);

  const stroke =
    tone === 'success' ? 'var(--color-success-500)' : tone === 'accent' ? 'var(--color-accent-400)' : 'var(--color-brand-500)';

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={caption ?? 'Прогресс'}
    >
      {/* -90° — чтобы дуга начиналась сверху, а не справа. */}
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-ink-100)"
          strokeWidth={thickness}
        />
        {/*
          Обычный circle с CSS-переходом, а не motion.circle.

          Framer записывал strokeDashoffset в атрибут и на этом
          останавливался: дуга навсегда замирала в начальном положении,
          то есть кольцо оставалось пустым при любом прогрессе. Переход
          средствами CSS делает то же самое, не зависит от того, как
          библиотека обходится с атрибутами SVG, и не требует лишнего
          состояния «уже смонтировано» — а значит и лишнего рендера.
        */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={thickness}
          strokeLinecap="round"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: circumference * (1 - drawn),
            transition: reduce ? undefined : 'stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-semibold tabular-nums leading-none text-ink-900">
          {label ?? `${percent}%`}
        </span>
        {caption && <span className="mt-1 px-2 text-[11px] font-medium text-ink-400">{caption}</span>}
      </div>
    </div>
  );
}
