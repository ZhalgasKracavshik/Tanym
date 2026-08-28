'use client';

/**
 * Галочка подтверждения с анимацией появления.
 *
 * Оболочка и ключевые кадры живут в globals.css (.t-success-check) —
 * здесь только разметка и переключение состояния. Отдельным компонентом,
 * потому что подтверждать приходится в разных местах: шаг онбординга,
 * сохранение профиля, завершение мастера.
 *
 * Длина линии задаётся здесь, а не берётся из CSS. В globals.css стоит
 * значение 20 «по умолчанию», а у этой галочки длина ≈23.4 (7.8 + 15.6 по
 * двум отрезкам). Если пунктир короче самой линии, её хвост не прячется:
 * до старта анимации из-под маски торчал бы кусок галочки. Ставим с
 * запасом и одним значением на оба свойства.
 *
 * Ключевые кадры перебивают инлайновый стиль: анимации в каскаде стоят
 * выше обычных объявлений, включая style-атрибут, — поэтому dashoffset
 * доезжает до нуля, а не залипает на стартовом значении.
 */
const CHECK_PATH_LENGTH = 26;

import { useEffect, useState } from 'react';

export function SuccessCheckMark({
  size = 48,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  /*
    Первый кадр всегда "out": анимация запускается сменой атрибута, а если
    сразу отрендерить "in", браузер покажет уже готовую галочку без движения.
  */
  const [state, setState] = useState<'out' | 'in'>('out');

  useEffect(() => {
    const frame = requestAnimationFrame(() => setState('in'));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <span className={`t-success-check ${className}`} data-state={state} aria-hidden>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M4 12.5L9.5 18L20 6.5"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: CHECK_PATH_LENGTH,
            strokeDashoffset: CHECK_PATH_LENGTH,
          }}
        />
      </svg>
    </span>
  );
}
