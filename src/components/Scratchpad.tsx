'use client';

/**
 * Черновик — место, где можно расписать решение от руки.
 *
 * Зачем он в учебном продукте. Математику и физику не решают в голове:
 * человек чертит, переносит слагаемые, рисует треугольник. Без черновика
 * ученик либо идёт за тетрадью (и не возвращается), либо считает в уме и
 * ошибается там, где на бумаге не ошибся бы.
 *
 * Почему свёрнут по умолчанию. Нужен он не всем и не на каждом задании:
 * развёрнутое полотно на пол-экрана мешало бы тем, кто просто выбирает
 * вариант ответа.
 *
 * Почему штрихи хранятся списком точек, а не картинкой. Отмена по
 * снимкам полотна означала бы держать в памяти по изображению на каждый
 * штрих. Список точек занимает копейки, переживает изменение размера
 * окна (перерисовываем из него же) и делает отмену одной строкой.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from './StoreProvider';
import { Button } from './ui';
import { Icon } from './Icon';
import type { Language } from '@/lib/types';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  /** Ластик рисует тем же цветом, что и фон, а не «стирает» пиксели. */
  erase: boolean;
  width: number;
}

const TEXT: Record<Language, Record<string, string>> = {
  ru: {
    open: 'Черновик',
    hide: 'Свернуть черновик',
    pen: 'Ручка',
    eraser: 'Ластик',
    undo: 'Отменить',
    clear: 'Очистить',
    hint: 'Распишите решение — черновик никуда не отправляется.',
  },
  kk: {
    open: 'Жобалама',
    hide: 'Жобаламаны жию',
    pen: 'Қалам',
    eraser: 'Өшіргіш',
    undo: 'Болдырмау',
    clear: 'Тазарту',
    hint: 'Шешімді жазып көріңіз — жобалама еш жерге жіберілмейді.',
  },
  en: {
    open: 'Scratchpad',
    hide: 'Hide scratchpad',
    pen: 'Pen',
    eraser: 'Eraser',
    undo: 'Undo',
    clear: 'Clear',
    hint: 'Work the solution out here — nothing is sent anywhere.',
  },
};

const PEN_WIDTH = 2.5;
const ERASER_WIDTH = 18;
const INK = '#1c1917';
const PAPER = '#ffffff';

/*
  Сброс при переходе к новому заданию делается не здесь, а сменой key на
  вызывающей стороне: <Scratchpad key={task.id} />.

  Так задумано в самом React — новая личность компонента даёт новое
  состояние. Прежний вариант со сбросом через эффект работал, но вызывал
  лишний круг перерисовки: сначала кадр со старыми штрихами под новым
  условием, потом кадр с чистым листом.
*/
export function Scratchpad() {
  const { state } = useStore();
  const t = TEXT[state.language];

  const [open, setOpen] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef<Stroke | null>(null);


  /** Перерисовывает полотно целиком из списка штрихов. */
  const repaint = useCallback((all: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    /*
      Размер в пикселях устройства, а не в CSS-пикселях: без этого линия
      на экране с удвоенной плотностью выглядит размытой вдвое.
    */
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = PAPER;
    context.fillRect(0, 0, width, height);

    context.lineCap = 'round';
    context.lineJoin = 'round';

    for (const stroke of all) {
      if (stroke.points.length === 0) continue;
      context.strokeStyle = stroke.erase ? PAPER : INK;
      context.lineWidth = stroke.width;
      context.beginPath();
      context.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (const point of stroke.points.slice(1)) context.lineTo(point.x, point.y);
      /*
        Точка — тоже штрих. Без этой строки одиночное касание не
        оставляло бы следа, и человек решал бы, что перо не работает.
      */
      if (stroke.points.length === 1) context.lineTo(stroke.points[0].x + 0.1, stroke.points[0].y);
      context.stroke();
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    repaint(strokes);
  }, [open, strokes, repaint]);

  /*
    Размер полотна меняется вместе с окном, а содержимое при этом
    сбрасывается: canvas теряет картинку при смене width. Перерисовываем
    из списка штрихов — потому он и хранится списком.
  */
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => repaint(strokes));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [open, strokes, repaint]);

  function pointOf(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    // Захват указателя: иначе штрих обрывается, стоит увести палец за край.
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = {
      points: [pointOf(event)],
      erase: erasing,
      width: erasing ? ERASER_WIDTH : PEN_WIDTH,
    };
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    const stroke = drawing.current;
    if (!stroke) return;
    stroke.points.push(pointOf(event));
    // Рисуем сразу, не дожидаясь состояния: перерисовка всего полотна на
    // каждое движение пальца заметно тормозила бы на телефоне.
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    const from = stroke.points[stroke.points.length - 2];
    const to = stroke.points[stroke.points.length - 1];
    context.strokeStyle = stroke.erase ? PAPER : INK;
    context.lineWidth = stroke.width;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  }

  function end() {
    const stroke = drawing.current;
    drawing.current = null;
    if (stroke && stroke.points.length > 0) setStrokes((current) => [...current, stroke]);
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Icon name="pencil" size={15} />
        {t.open}
      </Button>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-ink-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={erasing ? 'secondary' : 'primary'}
          onClick={() => setErasing(false)}
          aria-pressed={!erasing}
        >
          <Icon name="pencil" size={14} />
          {t.pen}
        </Button>
        <Button
          size="sm"
          variant={erasing ? 'primary' : 'secondary'}
          onClick={() => setErasing(true)}
          aria-pressed={erasing}
        >
          {t.eraser}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setStrokes((current) => current.slice(0, -1))}
          disabled={strokes.length === 0}
        >
          {t.undo}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setStrokes([])} disabled={strokes.length === 0}>
          {t.clear}
        </Button>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setOpen(false)}>
          {t.hide}
        </Button>
      </div>

      {/*
        touch-none обязателен: без него касание полотна прокручивает
        страницу вместо того, чтобы рисовать, и на телефоне черновик
        просто не работает.
      */}
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className="mt-3 h-64 w-full touch-none rounded-[var(--radius-control)] border border-ink-200 bg-white sm:h-80"
      />

      <p className="mt-2 text-xs text-ink-400">{t.hint}</p>
    </div>
  );
}
