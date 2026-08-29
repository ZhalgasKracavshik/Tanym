'use client';

/**
 * Конфетти для завершённых сценариев регистрации.
 *
 * Отличия от исходного компонента и почему они нужны.
 *
 * Убран ConfettiButton: он тянул за собой shadcn-кнопку, а вместе с ней
 * class-variance-authority и radix-slot. В проекте своя система
 * компонентов на токенах (src/components/ui/index.tsx), и вторая
 * параллельная система означала бы две кнопки с разным поведением —
 * ровно тот вид расхождения, который в этом проекте уже приводил к
 * багам. Конфетти нужно запускать по событию, а не по клику, так что
 * кнопка здесь не нужна вовсе.
 *
 * Цвета — фирменные: у canvas-confetti по умолчанию радуга, которая
 * спорит с тёплой палитрой продукта.
 */

import confetti from 'canvas-confetti';
import type { Options as ConfettiOptions } from 'canvas-confetti';

/** Терракота, янтарь и зелень успеха — те же токены, что и в интерфейсе. */
const BRAND_COLORS = ['#d85f2e', '#e57545', '#ffa62b', '#ffd88e', '#12a05c'];

/**
 * Залп из двух точек по краям экрана.
 *
 * Одна точка по центру выглядит как всплывающее окно; два «салюта» с боков
 * читаются как поздравление и не перекрывают то, что человек должен
 * прочитать в середине.
 */
export function fireCelebration(): void {
  if (typeof window === 'undefined') return;

  // Уважаем системную настройку: для людей с чувствительностью к движению
  // внезапный полноэкранный залп — это не праздник.
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  const base: ConfettiOptions = {
    particleCount: 2,
    spread: 55,
    startVelocity: 55,
    colors: BRAND_COLORS,
    ticks: 200,
    // Ниже плашек интерфейса, но выше содержимого страницы.
    zIndex: 60,
    disableForReducedMotion: true,
  };

  const end = Date.now() + 1400;

  function frame() {
    if (Date.now() > end) return;
    confetti({ ...base, angle: 60, origin: { x: 0, y: 0.62 } });
    confetti({ ...base, angle: 120, origin: { x: 1, y: 0.62 } });
    requestAnimationFrame(frame);
  }

  frame();
}

/** Одиночный мягкий залп из центра — для шагов помельче. */
export function firePop(origin: { x: number; y: number } = { x: 0.5, y: 0.6 }): void {
  if (typeof window === 'undefined') return;
  confetti({
    particleCount: 70,
    spread: 70,
    startVelocity: 38,
    origin,
    colors: BRAND_COLORS,
    zIndex: 60,
    disableForReducedMotion: true,
  });
}
