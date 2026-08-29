'use client';

/**
 * Ответ наставника: разметка вместо сплошного текста и регулировка кегля.
 *
 * Было: один <p> с whitespace-pre-line. Модель отвечает заголовками,
 * списками и шагами решения, но вся эта разметка выводилась сырым текстом —
 * звёздочки, решётки и дефисы прямо в абзаце. Отсюда ощущение «сплошной
 * документации»: у ответа не было ни ритма, ни уровней, ни возможности
 * зацепиться взглядом за нужный шаг.
 *
 * Размер шрифта отдан читателю и запоминается. Ответ наставника читают в
 * двух разных режимах — бегло с телефона и вдумчиво с разбором на большом
 * экране, — и один кегль не годится обоим.
 */

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { parseAiText } from '@/lib/aiText';
import type { Block, Inline } from '@/lib/aiText';
import { Icon } from './Icon';

export type AiTextScale = 's' | 'm' | 'l';

const STORAGE_KEY = 'tanym.aiTextScale';

const SCALE_CLASS: Record<AiTextScale, { body: string; h2: string; h3: string; code: string }> = {
  s: { body: 'text-[13px] leading-[1.65]', h2: 'text-[15px]', h3: 'text-[14px]', code: 'text-[12px]' },
  m: { body: 'text-[15px] leading-[1.7]', h2: 'text-[17px]', h3: 'text-[16px]', code: 'text-[13px]' },
  l: { body: 'text-[17px] leading-[1.75]', h2: 'text-[20px]', h3: 'text-[18px]', code: 'text-[15px]' },
};

const SCALE_LABEL: Record<AiTextScale, string> = { s: 'Мелкий', m: 'Обычный', l: 'Крупный' };

/*
  Подписчики на смену размера.

  Ответов на странице много, каждый рисует свой блок. Без общей рассылки
  переключатель поменял бы кегль только у того ответа, рядом с которым его
  нажали, а остальные остались бы прежними — настройка выглядела бы
  сломанной. localStorage здесь только хранилище, а рассылка — способ
  уведомить уже смонтированные блоки.
*/
const listeners = new Set<(scale: AiTextScale) => void>();

function readScale(): AiTextScale {
  if (typeof window === 'undefined') return 'm';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === 's' || saved === 'm' || saved === 'l' ? saved : 'm';
  } catch {
    return 'm';
  }
}

/*
  Кэш снимка. useSyncExternalStore спрашивает значение часто, и лазить в
  localStorage на каждый вызов незачем: хранилище меняем только мы сами.
*/
let currentScale: AiTextScale | null = null;

function getSnapshot(): AiTextScale {
  if (currentScale === null) currentScale = readScale();
  return currentScale;
}

/*
  На сервере localStorage нет, и снимок обязан быть детерминированным —
  иначе серверная и клиентская разметка разойдутся. Реальное значение
  приедет сразу после гидратации.
*/
function getServerSnapshot(): AiTextScale {
  return 'm';
}

function subscribe(notify: () => void): () => void {
  const wrapped = () => notify();
  listeners.add(wrapped);
  return () => {
    listeners.delete(wrapped);
  };
}

function writeScale(scale: AiTextScale) {
  currentScale = scale;
  try {
    window.localStorage.setItem(STORAGE_KEY, scale);
  } catch {
    // Приватный режим или запрет на хранилище: настройка не переживёт
    // перезагрузку, но в текущей сессии обязана работать.
  }
  listeners.forEach((notify) => notify(scale));
}

/**
 * Внешнее хранилище вместо состояния с эффектом.
 *
 * Значение живёт вне React (localStorage плюс рассылка подписчикам), и
 * useSyncExternalStore — ровно тот инструмент, что для этого предназначен:
 * он сам разводит серверный и клиентский снимок, поэтому не нужен ни
 * эффект, ни лишний кадр с чужим кеглем после гидратации.
 */
export function useAiTextScale(): [AiTextScale, (scale: AiTextScale) => void] {
  const scale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const update = useCallback((next: AiTextScale) => writeScale(next), []);
  return [scale, update];
}

function renderInline(spans: Inline[], keyPrefix: string, codeClass: string) {
  return spans.map((span, index) => {
    const key = keyPrefix + '-' + index;
    if (span.kind === 'bold') {
      return (
        <strong key={key} className="font-bold text-ink-900">
          {span.text}
        </strong>
      );
    }
    if (span.kind === 'italic') {
      return (
        <em key={key} className="italic">
          {span.text}
        </em>
      );
    }
    if (span.kind === 'code') {
      return (
        <code
          key={key}
          className={
            'rounded-md border border-ink-200 bg-ink-50 px-1.5 py-0.5 font-mono text-brand-700 ' + codeClass
          }
        >
          {span.text}
        </code>
      );
    }
    return <span key={key}>{span.text}</span>;
  });
}

function renderBlock(block: Block, index: number, scale: AiTextScale) {
  const s = SCALE_CLASS[scale];
  const key = 'b' + index;

  if (block.kind === 'heading') {
    return block.level === 2 ? (
      <h3 key={key} className={'mt-4 mb-1.5 font-bold text-ink-900 first:mt-0 ' + s.h2}>
        {renderInline(block.spans, key, s.code)}
      </h3>
    ) : (
      <h4 key={key} className={'mt-3 mb-1 font-bold text-ink-800 first:mt-0 ' + s.h3}>
        {renderInline(block.spans, key, s.code)}
      </h4>
    );
  }

  if (block.kind === 'bullets') {
    return (
      <ul key={key} className="my-2 space-y-1.5 pl-1">
        {block.items.map((item, i) => (
          <li key={key + '-' + i} className="flex gap-2.5">
            <span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
            <span className="min-w-0 flex-1">{renderInline(item, key + '-' + i, s.code)}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (block.kind === 'numbers') {
    return (
      <ol key={key} className="my-2 space-y-1.5">
        {block.items.map((item, i) => (
          <li key={key + '-' + i} className="flex gap-2.5">
            <span
              aria-hidden
              className="mt-[0.1em] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold tabular-nums text-brand-700"
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">{renderInline(item, key + '-' + i, s.code)}</span>
          </li>
        ))}
      </ol>
    );
  }

  if (block.kind === 'quote') {
    return (
      <blockquote
        key={key}
        className="my-2.5 border-l-[3px] border-brand-300 bg-brand-50/50 py-1.5 pl-3 pr-2 text-ink-600"
      >
        {renderInline(block.spans, key, s.code)}
      </blockquote>
    );
  }

  if (block.kind === 'code') {
    return (
      <pre
        key={key}
        className={
          'my-2.5 overflow-x-auto rounded-xl border border-ink-200 bg-ink-50 p-3 font-mono text-ink-800 ' + s.code
        }
      >
        <code>{block.text}</code>
      </pre>
    );
  }

  return (
    <p key={key} className="my-2 first:mt-0 last:mb-0">
      {renderInline(block.spans, key, s.code)}
    </p>
  );
}

/** Переключатель кегля. Отдельно от ответа: он один на весь диалог. */
export function AiTextScaleControl({
  scale,
  onChange,
  className = '',
}: {
  scale: AiTextScale;
  onChange: (scale: AiTextScale) => void;
  className?: string;
}) {
  return (
    <div
      className={
        'inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-ink-200 bg-white p-1 ' + className
      }
      role="group"
      aria-label="Размер текста ответа"
    >
      <span className="pl-1.5 pr-0.5 text-ink-400" aria-hidden>
        <Icon name="book" size={14} />
      </span>
      {(['s', 'm', 'l'] as AiTextScale[]).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={scale === option}
          aria-label={SCALE_LABEL[option]}
          title={SCALE_LABEL[option]}
          className={
            'rounded-[var(--radius-pill)] px-2 py-0.5 font-bold transition-colors ' +
            (option === 's' ? 'text-[11px] ' : option === 'm' ? 'text-[13px] ' : 'text-[15px] ') +
            (scale === option ? 'bg-brand-500 text-white' : 'text-ink-400 hover:bg-ink-50 hover:text-ink-700')
          }
        >
          А
        </button>
      ))}
    </div>
  );
}

export function AiAnswer({ text, scale }: { text: string; scale: AiTextScale }) {
  // Разбор кэшируем: ответы длинные, а перерисовок при смене кегля много.
  const blocks = useMemo(() => parseAiText(text), [text]);
  return (
    <div className={SCALE_CLASS[scale].body + ' text-ink-700'}>
      {blocks.map((block, index) => renderBlock(block, index, scale))}
    </div>
  );
}
