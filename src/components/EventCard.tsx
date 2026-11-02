'use client';

/**
 * Карточка события в афише.
 *
 * Одна раскладка на всех экранах, только повёрнутая:
 * - телефон — строка: превью 96×96 слева, факты справа. В экран помещается
 *   3–4 события вместо полутора, а превью всё равно видно;
 * - от sm — колонка: превью 16:9 сверху, те же факты снизу.
 *
 * Превью — первое фото, которое прислал организатор. Листать его здесь не
 * нужно: галерея живёт на странице события. Без фото — плитка цвета вида
 * события с его значком: тот же размер и место, поэтому сетка не прыгает,
 * и олимпиаду от курса видно с первого взгляда, как на olimpiada.ru.
 *
 * Главный факт — срок регистрации (цвет — срочность). Вся карточка — одна
 * ссылка на событие (растянутая ссылка заголовка), а «Сохранить» — отдельная
 * кнопка поверх неё: сохранить можно, не открывая событие.
 */

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { EventStatus, SchoolEvent } from '@/lib/events';
import { Badge } from './ui';
import { Icon } from './Icon';
import type { IconName } from './Icon';

export interface EventCardText {
  /** «Регистрация до» — подпись к главному факту карточки. */
  deadline: string;
  daysLeft: (n: number) => string;
  lastDay: string;
  online: string;
  free: string;
  paid: string;
  save: string;
  saved: string;
  saveLogin: string;
  gradeShort: string;
}

export function EventCard({
  event,
  status,
  statusTone,
  statusLabel,
  bannerClass,
  typeIcon,
  typeTitle,
  daysLeft,
  deadlineLabel,
  saved,
  onToggleSave,
  t,
}: {
  event: SchoolEvent;
  status: EventStatus;
  statusTone: 'success' | 'accent' | 'neutral';
  statusLabel: string;
  bannerClass: string;
  typeIcon?: IconName;
  typeTitle?: string;
  daysLeft: number;
  deadlineLabel: string;
  /** null — гость или ещё грузим: вместо кнопки ссылка на вход. */
  saved: boolean | null;
  onToggleSave?: () => void;
  t: EventCardText;
}) {
  const reduce = useReducedMotion();
  const cover = event.coverUrls?.[0];
  const registrationRuns = status === 'open' || status === 'closing-soon';
  const grades = gradesLabel(event.grades, t.gradeShort);

  const deadlineTone = !registrationRuns
    ? 'text-ink-400'
    : daysLeft <= 3
      ? 'text-danger-600'
      : daysLeft <= 14
        ? 'text-accent-700'
        : 'text-ink-800';

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative flex min-w-0 gap-3.5 rounded-[var(--radius-card)] border border-ink-200 bg-white p-3 transition-[border-color,box-shadow] duration-200 hover:border-ink-300 hover:shadow-[var(--shadow-float)] sm:flex-col sm:gap-0 sm:overflow-hidden sm:p-0 ${
        status === 'past' ? 'opacity-60' : ''
      }`}
    >
      {/* --- Превью: фото организатора или плитка вида события --- */}
      <div
        className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-xl sm:aspect-[16/9] sm:h-auto sm:w-full sm:rounded-none ${
          cover ? 'bg-ink-100' : bannerClass
        }`}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- обложки из Supabase Storage, размеры задаёт контейнер
          <img
            src={cover}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div aria-hidden className="flex h-full w-full items-center justify-center text-white/90">
            {typeIcon && <Icon name={typeIcon} size={30} className="sm:hidden" />}
            {typeIcon && <Icon name={typeIcon} size={44} className="hidden sm:block" />}
          </div>
        )}
        {!registrationRuns && (
          <Badge tone={statusTone} className="absolute left-1.5 top-1.5 whitespace-nowrap sm:left-3 sm:top-3">
            {statusLabel}
          </Badge>
        )}
      </div>

      {/* --- Факты --- */}
      <div className="flex min-w-0 flex-1 flex-col sm:p-4">
        <p className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-500">
          {typeIcon && <Icon name={typeIcon} size={12} className="shrink-0" />}
          <span className="truncate">
            {typeTitle}
            {event.online ? ` · ${t.online}` : event.location ? ` · ${event.location}` : ''}
          </span>
        </p>

        <h2 className="mt-1 line-clamp-2 break-words text-[15px] font-semibold leading-snug tracking-[-0.01em] text-ink-900 sm:text-base">
          {/* Растянутая ссылка: нажатие по любой части карточки открывает событие. */}
          <Link
            href={`/events/${event.id}`}
            className="outline-none after:absolute after:inset-0 after:rounded-[var(--radius-card)] focus-visible:after:ring-2 focus-visible:after:ring-brand-500"
          >
            {event.title}
          </Link>
        </h2>
        {event.organizer && <p className="mt-0.5 truncate text-xs text-ink-500 sm:text-sm">{event.organizer}</p>}

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className={`text-[13px] font-semibold tabular-nums sm:text-sm ${deadlineTone}`}>
            {t.deadline} {deadlineLabel}
          </p>
          {registrationRuns && (
            <span
              className={`whitespace-nowrap rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                daysLeft <= 3 ? 'bg-danger-50 text-danger-700' : 'bg-ink-100 text-ink-600'
              }`}
            >
              {daysLeft === 0 ? t.lastDay : t.daysLeft(daysLeft)}
            </span>
          )}
        </div>

        {event.description && (
          <p className="mt-2 hidden break-words text-sm leading-relaxed text-ink-600 sm:line-clamp-2">
            {event.description}
          </p>
        )}

        {/* --- Низ: факты и «Сохранить» --- */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2.5 sm:pt-4">
          <div className="flex min-w-0 flex-wrap items-center gap-1 text-[11px] font-semibold text-ink-600">
            {grades && <span className="rounded-md border border-ink-200 px-1.5 py-0.5">{grades}</span>}
            <span
              className={`rounded-md border px-1.5 py-0.5 ${
                event.free ? 'border-success-200 bg-success-50 text-success-700' : 'border-ink-200'
              }`}
            >
              {event.free ? t.free : t.paid}
            </span>
          </div>

          {/* relative z-10 — поверх растянутой ссылки заголовка. */}
          {saved === null ? (
            <Link
              href={`/login?next=${encodeURIComponent('/events')}`}
              aria-label={t.saveLogin}
              title={t.saveLogin}
              className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-200 text-ink-500 transition-colors hover:border-ink-300 hover:text-ink-800"
            >
              <Icon name="star" size={16} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onToggleSave}
              aria-pressed={saved}
              aria-label={saved ? t.saved : t.save}
              title={saved ? t.saved : t.save}
              className={`relative z-10 flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition-colors ${
                saved
                  ? 'border-brand-200 bg-brand-50 text-brand-700'
                  : 'border-ink-200 text-ink-600 hover:border-ink-300 hover:text-ink-900'
              }`}
            >
              <Icon name="star" size={15} className={saved ? 'fill-current' : ''} />
              <span className="hidden sm:inline">{saved ? t.saved : t.save}</span>
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

/** «5–9 кл», «11 кл» или пусто, если классы не указаны (значит — для всех). */
function gradesLabel(grades: number[], suffix: string): string {
  const list = [...new Set(grades)].sort((a, b) => a - b);
  if (list.length === 0) return '';
  if (list.length === 1) return `${list[0]} ${suffix}`;
  const contiguous = list.every((grade, i) => i === 0 || grade === list[i - 1] + 1);
  return contiguous ? `${list[0]}–${list[list.length - 1]} ${suffix}` : `${list.join(', ')} ${suffix}`;
}
