'use client';

/**
 * Точечный индикатор загрузки 4×4.
 *
 * Вариант анимации — это таблица задержек, а не отдельный набор кадров:
 * все точки крутят один и тот же цикл подсветки, разъезжаясь во времени.
 * Поэтому здесь только раздача --d, а сама анимация живёт в globals.css.
 */

import type { CSSProperties } from 'react';

export type MatrixVariant = 'scan' | 'twinkle' | 'orbit' | 'pulse';

const CYCLE = 1200;

/** Позиции углов: у скруглённых вариантов они не рисуются. */
const CORNERS = [0, 3, 12, 15];

/** Порядок мерцания — намеренно «случайный», но фиксированный. */
const TWINKLE_ORDER = [7, 2, 11, 5, 14, 9, 0, 12, 3, 15, 6, 10, 13, 1, 8, 4];

/** Кольцо вокруг центра: центральные четыре точки стоят ровно. */
const ORBIT_RING = [1, 2, 7, 11, 14, 13, 8, 4];

/** Внутренний квадрат загорается первым, остальные — следом. */
const PULSE_INNER = [5, 6, 9, 10];

function delayFor(variant: MatrixVariant, index: number): number {
  if (variant === 'scan') {
    // Волна слева направо: задержка зависит только от колонки.
    return (index % 4) * (CYCLE / 10);
  }
  if (variant === 'twinkle') {
    const position = TWINKLE_ORDER.indexOf(index);
    return (position < 0 ? 0 : position) * (CYCLE / 16);
  }
  if (variant === 'orbit') {
    const position = ORBIT_RING.indexOf(index);
    return position < 0 ? 0 : position * (CYCLE / 8);
  }
  return PULSE_INNER.includes(index) ? 0 : CYCLE * 0.16;
}

export function MatrixLoader({
  variant = 'scan',
  rounded = false,
  className = '',
  label = 'Загрузка',
}: {
  variant?: MatrixVariant;
  /** Скруглённый силуэт: углы сетки не рисуются. */
  rounded?: boolean;
  className?: string;
  label?: string;
}) {
  return (
    <div className={`t-matrix ${className}`} role="status" aria-label={label}>
      {Array.from({ length: 16 }, (_, index) => {
        const gap = rounded && CORNERS.includes(index);
        return (
          <i
            key={index}
            className={gap ? 'is-gap' : undefined}
            style={{ '--d': delayFor(variant, index) } as CSSProperties}
          />
        );
      })}
    </div>
  );
}
