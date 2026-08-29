'use client';

/**
 * Карточка возможности в стиле журнальной статьи.
 *
 * Собрана по присланному образцу ArticleCard (крупная обложка со
 * скруглением внутри карточки, метка-бейдж со временем/категорией в одну
 * строку, крупный заголовок, обрезанный по строкам текст и подпись-подвал
 * с автором), но на компонентах и токенах этого проекта.
 *
 * Почему не перенесён исходник дословно:
 *
 * 1. Он тянет shadcn (Card, Badge, cn) и вместе с ними
 *    class-variance-authority с tailwind-merge. В проекте уже есть своя
 *    система в src/components/ui/index.tsx на фирменных токенах. Две
 *    параллельные системы означали бы два разных вида у одной и той же
 *    карточки — в этом проекте расхождение такого рода уже приводило к
 *    багам.
 * 2. Он рендерит обложку через next/image с fill. Обложки лежат в бакете
 *    Supabase, а remotePatterns для него в next.config.ts не настроены —
 *    next/image на таком URL падает в рантайме. Весь остальной код проекта
 *    по этой же причине использует обычный img.
 * 3. Палитра образца (muted-foreground, card-foreground) в проекте не
 *    существует: цвета заданы шкалами ink/brand/accent.
 */

import type { ReactNode } from 'react';
import { Icon } from '../Icon';
import type { IconName } from '../Icon';

export interface OpportunityCardProps {
  headline: string;
  excerpt: string;
  cover?: string | null;
  /** Заглушка вместо фотографии: цвет плашки и иконка вида. */
  fallbackClassName?: string;
  fallbackIcon?: IconName;
  tag?: string;
  tagIcon?: IconName;
  /** Короткая строка справа от метки: цена, формат, места. */
  meta?: string;
  writer?: string;
  writerRole?: string;
  footerNote?: ReactNode;
  badge?: ReactNode;
  clampLines?: number;
  action?: string;
}

export function OpportunityCard({
  headline,
  excerpt,
  cover,
  fallbackClassName = 'bg-ink-500',
  fallbackIcon,
  tag,
  tagIcon,
  meta,
  writer,
  writerRole,
  footerNote,
  badge,
  clampLines = 2,
  action,
}: OpportunityCardProps) {
  const hasMeta = Boolean(tag || meta);

  return (
    <article className="flex h-full w-full flex-col gap-3 overflow-hidden rounded-3xl border border-ink-200 bg-white p-3 shadow-[var(--shadow-rest)] transition-shadow duration-300 group-hover:shadow-[var(--shadow-lift)]">
      {/*
        Обложка скруглена внутри карточки, а не обрезана её краем: между
        рамкой и снимком остаётся поле, и карточка читается как страница с
        иллюстрацией, а не как фотография с приклеенной подписью.
      */}
      <div
        className={`relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-2xl ${
          cover ? 'bg-ink-100' : fallbackClassName
        }`}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- внешний бакет, домен для next/image не настроен
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          fallbackIcon && (
            <Icon
              name={fallbackIcon}
              size={38}
              className="text-white/85 transition-transform duration-500 group-hover:scale-110"
            />
          )
        )}
        {badge && <span className="absolute right-3 top-3">{badge}</span>}
      </div>

      <div className="flex flex-1 flex-col px-3 pt-1">
        {hasMeta && (
          <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-500">
            {tag && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-3 py-1 text-sm font-semibold text-ink-600">
                {tagIcon && <Icon name={tagIcon} size={14} />}
                {tag}
              </span>
            )}
            {tag && meta && <span aria-hidden>•</span>}
            {meta && <span>{meta}</span>}
          </div>
        )}

        <h2 className="mb-2 text-2xl font-bold leading-tight text-ink-900">{headline}</h2>

        <p
          className="text-ink-600"
          style={
            clampLines > 0
              ? {
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: clampLines,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }
              : undefined
          }
        >
          {excerpt}
        </p>

        <div className="mt-auto pt-4">
          {(writer || footerNote) && (
            <div className="flex items-end justify-between gap-3 border-t border-ink-200 pt-3">
              {writer && (
                <div className="min-w-0">
                  <p className="text-sm text-ink-400">Кто ведёт</p>
                  <p className="truncate font-semibold text-ink-700">{writer}</p>
                  {writerRole && <p className="truncate text-xs text-ink-400">{writerRole}</p>}
                </div>
              )}
              {footerNote && <div className="shrink-0 text-right">{footerNote}</div>}
            </div>
          )}

          {action && (
            <span className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-brand-600">
              {action}
              <Icon
                name="arrowRight"
                size={15}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
