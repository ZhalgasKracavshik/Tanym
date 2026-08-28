'use client';

/**
 * Пилюля, переезжающая под активный пункт навигации.
 *
 * Положение нельзя задать в CSS: пункты меню разной длины, и единственный
 * способ узнать, куда ехать, — замерить сам активный элемент. Поэтому JS
 * пишет transform/width/height, а переход между значениями делает CSS.
 *
 * Работает и по горизонтали, и по вертикали: переносится transform по обеим
 * осям, поэтому один хук закрывает и нижнюю панель, и колонку сайдбара.
 *
 * Активный элемент ищется по data-pill-active="true", а не по индексу:
 * состав пунктов зависит от роли, и индексы разъезжались бы с разметкой.
 */

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

/* На сервере useLayoutEffect ругается в консоль — там всё равно нечего мерить. */
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function useSlidingPill<T extends HTMLElement>(activeKey: string | null) {
  const containerRef = useRef<T | null>(null);
  const pillRef = useRef<HTMLSpanElement | null>(null);
  const placedOnce = useRef(false);

  const place = useCallback((animate: boolean) => {
    const container = containerRef.current;
    const pill = pillRef.current;
    if (!container || !pill) return;

    const active = container.querySelector<HTMLElement>('[data-pill-active="true"]');
    if (!active) {
      // Нет активного пункта (например, открыт раздел не из меню) — прячем,
      // иначе пилюля осталась бы висеть под случайным местом.
      pill.style.opacity = '0';
      return;
    }

    const containerBox = container.getBoundingClientRect();
    const activeBox = active.getBoundingClientRect();
    const x = activeBox.left - containerBox.left + container.scrollLeft;
    const y = activeBox.top - containerBox.top + container.scrollTop;

    /*
      Первую установку и пересчёт по ресайзу делаем без перехода: иначе
      пилюля на загрузке приезжала бы из левого верхнего угла, а при
      изменении ширины окна — плыла бы вслед за версткой.
    */
    if (!animate) pill.style.transition = 'none';

    pill.style.opacity = '1';
    pill.style.width = `${activeBox.width}px`;
    pill.style.height = `${activeBox.height}px`;
    pill.style.transform = `translate(${x}px, ${y}px)`;

    if (!animate) {
      // Принудительный reflow: без него снятие transition и новые значения
      // попадут в один кадр, и браузер всё равно проиграет анимацию.
      void pill.offsetWidth;
      pill.style.transition = '';
    }
  }, []);

  useIsomorphicLayoutEffect(() => {
    place(placedOnce.current);
    placedOnce.current = true;
  }, [activeKey, place]);

  useEffect(() => {
    const onResize = () => place(false);
    window.addEventListener('resize', onResize);

    /*
      Шрифты догружаются после первого кадра и меняют ширину пунктов —
      без пересчёта пилюля осталась бы по старым размерам.
    */
    let cancelled = false;
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => {
        if (!cancelled) place(false);
      });
    }

    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
    };
  }, [place]);

  return { containerRef, pillRef };
}
