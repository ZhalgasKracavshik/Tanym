'use client';

/**
 * Лайк с заливкой сердца, пружинным «попом» и разлётом частиц.
 *
 * Сердце рисуется здесь, а не берётся из общего набора Icon: нужен доступ
 * к самому <path>, чтобы CSS плавно менял ему заливку с прозрачной на
 * сплошную. Общая иконка отдаёт готовую разметку, и переход заливки на ней
 * не описать.
 *
 * Частицы — восемь точек, разлетающихся по своим векторам. Векторы и время
 * считаются на каждое нажатие заново: одинаковый разлёт при каждом лайке
 * читается как заранее записанная анимация, а не как отклик на действие.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

const PARTICLE_COUNT = 8;
const BURST_MS = 600;

interface Particle {
  px: string;
  py: string;
  pdur: string;
  pdelay: string;
  psize: string;
  endScale: string;
}

/**
 * Точки расходятся веером вверх, а не ровным кругом.
 *
 * База — равные сектора: так они не собьются в кучу с одной стороны.
 * Дальше к каждому углу добавляется разброс, а сам веер смещён вверх,
 * потому что брызги от нажатия логично летят от пальца, а не под него.
 */
function makeParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const base = (index / PARTICLE_COUNT) * Math.PI * 2;
    const angle = base + (Math.random() - 0.5) * 0.6 - Math.PI / 2;
    const distance = 14 + Math.random() * 12;
    return {
      px: `${Math.cos(angle) * distance}px`,
      py: `${Math.sin(angle) * distance}px`,
      pdur: `${BURST_MS - 120 + Math.random() * 220}ms`,
      pdelay: `${Math.random() * 60}ms`,
      psize: (0.7 + Math.random() * 0.8).toFixed(2),
      endScale: (0.3 + Math.random() * 0.5).toFixed(2),
    };
  });
}

export function LikeButton({
  liked,
  count,
  onToggle,
}: {
  liked: boolean;
  count: number;
  onToggle: () => void;
}) {
  /*
    Номер вспышки, а не булев флаг. Он же служит ключом для точек, поэтому
    на каждый лайк React создаёт их заново — анимация у нового узла всегда
    проигрывается с начала.

    Первый подход перезапускал её снятием и возвратом класса через
    requestAnimationFrame, но кадры выдаются не всегда (свёрнутая или
    фоновая вкладка), и тогда вспышки не было вовсе. Пересоздание узлов от
    выдачи кадров не зависит.
  */
  const [burst, setBurst] = useState(0);
  const [particles, setParticles] = useState<Particle[]>(makeParticles);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleClick = useCallback(() => {
    /*
      Частицы только при постановке лайка. На снятии их разлёт означал бы
      «получилось!» в момент, когда человек, наоборот, отменил действие.
    */
    if (!liked) {
      setParticles(makeParticles());
      setBurst((value) => value + 1);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      // Класс снимаем после разлёта, чтобы он не висел на кнопке всё время.
      timeoutRef.current = window.setTimeout(() => setBurst(0), BURST_MS + 200);
    }
    onToggle();
  }, [liked, onToggle]);

  const bursting = burst > 0;

  return (
    <button
      onClick={handleClick}
      data-liked={liked ? 'true' : 'false'}
      aria-pressed={liked}
      aria-label={liked ? 'Убрать лайк' : 'Нравится'}
      className={`t-like ${bursting ? 'is-bursting' : ''} inline-flex items-center gap-1.5 rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold tabular-nums transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
        liked ? 'text-[var(--like-color)]' : 'text-ink-400 hover:bg-ink-50 hover:text-ink-600'
      }`}
    >
      <span className="t-like-icon">
        <svg
          className="t-like-heart"
          width={17}
          height={17}
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            d="M12 20.5S3.5 15 3.5 9.2A4.7 4.7 0 0 1 12 6.6a4.7 4.7 0 0 1 8.5 2.6C20.5 15 12 20.5 12 20.5Z"
            fill={liked ? 'currentColor' : 'transparent'}
            stroke="currentColor"
            strokeWidth={1.9}
            strokeLinejoin="round"
          />
        </svg>
      </span>

      {/* Точки лежат в центре кнопки и разлетаются от него.
          key по номеру вспышки пересоздаёт их на каждый лайк. */}
      <span key={burst} className="t-like-particles" aria-hidden>
        {particles.map((particle, index) => (
          <i
            key={index}
            style={
              {
                '--px': particle.px,
                '--py': particle.py,
                '--pdur': particle.pdur,
                '--pdelay': particle.pdelay,
                '--psize': particle.psize,
                '--p-end-scale': particle.endScale,
              } as CSSProperties
            }
          />
        ))}
      </span>

      {count > 0 && count}
    </button>
  );
}
