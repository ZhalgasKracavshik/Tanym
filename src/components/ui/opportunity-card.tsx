'use client';

/**
 * Карточка возможности.
 *
 * Собрана по той же схеме, что и карточка события в афише (EventCard), и
 * это не косметика. Два раздела продукта показывают один и тот же по сути
 * объект — то, на что можно записаться, — и раньше они выглядели как две
 * разные системы: там шапка фиксированной высоты, здесь пропорция 16:10;
 * там заголовок в 18 пунктов, здесь в 24; там поля в 20 пикселей, здесь
 * поля внутри полей. На телефоне разница переставала быть вопросом вкуса:
 * заголовок в 24 пункта на карточке шириной в экран занимал три строки и
 * выдавливал описание, а карточка становилась вдвое выше соседней.
 *
 * Что осталось от прежней версии: обложка через обычный img, а не
 * next/image. Обложки лежат в бакете Supabase, домены для next/image в
 * next.config.ts не настроены, и на таком URL он падает в рантайме.
 *
 * Отличие от афиши ровно одно и вынужденное: вся карточка обёрнута в
 * ссылку на странице возможностей, поэтому переход внизу — это span с
 * видом кнопки, а не сама кнопка. Ссылка внутри ссылки — недопустимая
 * разметка, и браузер разбирает её непредсказуемо.
 */

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
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
  /** Короткая строка под заголовком: цена, формат, места. */
  meta?: string;
  writer?: string;
  writerRole?: string;
  /** Подпись над именем автора. Приходит переведённой со страницы. */
  writerLabel?: string;
  /** Плашка в правом верхнем углу шапки: проверено школой или нет. */
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
  writerLabel,
  badge,
  clampLines = 3,
  action,
}: OpportunityCardProps) {
  const reduce = useReducedMotion();

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      // Подъём на пружине — как в афише: карточка отзывается как предмет.
      whileHover={reduce ? undefined : { y: -4, transition: { type: 'spring', stiffness: 300, damping: 22 } }}
      className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-ink-200 bg-white shadow-[var(--shadow-rest)] transition-shadow duration-300 hover:shadow-[var(--shadow-float)]"
    >
      {/* --- Шапка --- */}
      <div className={`relative h-48 shrink-0 overflow-hidden ${cover ? 'bg-ink-900' : fallbackClassName}`}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- внешний бакет, домен для next/image не настроен
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          /*
            Без фотографии — название вида крупно, а не иконка на пустой
            плашке: иконка в прямоугольнике сообщает «здесь должна была
            быть картинка», слово читается как оформление. Ровно та же
            логика, что и в афише.
          */
          <div className="flex h-full items-end p-5">
            <span className="text-2xl font-semibold leading-tight text-white/90">{tag}</span>
          </div>
        )}

        {/* Затемнение снизу — иначе светлые плашки теряются на светлом снимке */}
        {cover && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-900/45 via-transparent to-ink-900/25"
          />
        )}

        {/*
          Плашки лежат в одном переносящемся ряду, а не двумя группами по
          углам. Причина та же, что разобрана в афише: плашка не сжимается
          ниже своей min-content ширины и при нехватке места наезжает на
          соседнюю. flex-wrap переносит лишнее вниз, ml-auto держит правую
          плашку прижатой к краю в обычном случае.
        */}
        <div className="absolute inset-x-3 top-3 flex flex-wrap items-start gap-2">
          {tag && (
            <span className="flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-pill)] bg-white/85 px-2.5 py-1 text-xs font-bold text-ink-800 backdrop-blur-sm">
              {tagIcon && <Icon name={tagIcon} size={13} />}
              {tag}
            </span>
          )}
          {badge && <span className="ml-auto shrink-0">{badge}</span>}
        </div>
      </div>

      {/* --- Содержание --- */}
      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-lg font-bold leading-snug text-ink-900">{headline}</h2>

        {meta && <p className="mt-1.5 text-sm text-ink-400">{meta}</p>}

        {/*
          mb-4 у описания, а не mt у подвала: подвал прижат книзу через
          mt-auto, и у самой высокой карточки в ряду это «авто» равно нулю —
          линия подвала прилипла бы к последней строке текста.
        */}
        <p
          className="mt-3 mb-4 text-sm leading-relaxed text-ink-600"
          style={
            clampLines > 0
              ? {
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: clampLines,
                  overflow: 'hidden',
                }
              : undefined
          }
        >
          {excerpt}
        </p>

        {/* --- Низ: кто ведёт и переход --- */}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-ink-200 pt-4">
          {writer && (
            <div className="min-w-0">
              {writerLabel && <p className="text-xs text-ink-400">{writerLabel}</p>}
              <p className="truncate font-semibold text-ink-900">{writer}</p>
              {writerRole && <p className="truncate text-xs text-ink-400">{writerRole}</p>}
            </div>
          )}

          {action && (
            <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-control)] bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors duration-200 group-hover:bg-brand-700">
              {action}
              <Icon
                name="arrow-right"
                size={15}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </span>
          )}
        </div>
      </div>
    </motion.article>
  );
}
