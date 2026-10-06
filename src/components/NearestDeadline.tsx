'use client';

/**
 * «Ближайший дедлайн» — главный блок пилота. Стоит наверху афиши и в кабинете.
 *
 * Ученик из области проигрывает олимпиаду не в задачах, а в том, что узнаёт
 * о ней после закрытия регистрации. Поэтому самое крупное здесь — число
 * оставшихся дней, а рядом одно понятное действие.
 *
 * Чей дедлайн. Если ученик сохранял события («Мои события»), берётся
 * ближайший среди них: это то, куда он сам собрался. Иначе — ближайший по
 * всей афише, чтобы блок не пустовал у новичка.
 *
 * Раскладка по Z: слева крупное число, справа название и срок, ниже
 * действие. Главная кнопка говорит, что произойдёт («Перейти к регистрации»
 * — откроется сайт организатора), а не абстрактное «Подробнее».
 */

import Link from 'next/link';
import { EVENT_TYPES, daysLeftUntil, formatEventDate, pickNearestDeadline } from '@/lib/events';
import type { SchoolEvent } from '@/lib/events';
import type { Dict, Language } from '@/lib/i18n';
import { normalizeSocialUrl } from '@/lib/social';
import { Button, ButtonLink } from './ui';
import { Icon } from './Icon';

function daysWordRu(n: number): string {
  const lastTwo = n % 100;
  const last = n % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return 'дней';
  if (last === 1) return 'день';
  if (last >= 2 && last <= 4) return 'дня';
  return 'дней';
}

const TEXT: Dict<{
  nearest: string;
  nearestSaved: string;
  daysWord: (n: number) => string;
  lastDay: string;
  registerBy: string;
  goRegister: string;
  details: string;
  save: string;
  saved: string;
}> = {
  ru: {
    nearest: 'Ближайший дедлайн',
    nearestSaved: 'Ближайший дедлайн в ваших событиях',
    daysWord: daysWordRu,
    lastDay: 'Сегодня последний день',
    registerBy: 'Регистрация до',
    goRegister: 'Перейти к регистрации',
    details: 'Открыть событие',
    save: 'Сохранить в мои события',
    saved: 'В ваших событиях',
  },
  kk: {
    nearest: 'Жақын мерзім',
    nearestSaved: 'Сіздің іс-шараларыңыздағы жақын мерзім',
    daysWord: () => 'күн',
    lastDay: 'Бүгін соңғы күн',
    registerBy: 'Тіркелу мерзімі',
    goRegister: 'Тіркелуге өту',
    details: 'Іс-шараны ашу',
    save: 'Менің іс-шараларыма сақтау',
    saved: 'Сіздің іс-шараларыңызда',
  },
  en: {
    nearest: 'Closest deadline',
    nearestSaved: 'Closest deadline in your events',
    daysWord: (n) => (n === 1 ? 'day' : 'days'),
    lastDay: 'Today is the last day',
    registerBy: 'Register by',
    goRegister: 'Go to registration',
    details: 'Open event',
    save: 'Save to my events',
    saved: 'In your events',
  },
};

export function NearestDeadline({
  events,
  savedIds,
  onToggleSave,
  language,
  className = '',
}: {
  events: SchoolEvent[];
  savedIds: Set<string> | null;
  onToggleSave: (eventId: string) => void;
  language: Language;
  className?: string;
}) {
  const t = TEXT[language];
  const picked = pickNearestDeadline(events, savedIds);
  if (!picked) return null;

  const { event, fromSaved } = picked;
  const days = daysLeftUntil(event.registrationDeadline);
  const meta = EVENT_TYPES.find((type) => type.id === event.type);
  // Ссылку организатора проверяем в момент показа: она уходит прямо в href.
  const registrationUrl = event.registrationUrl ? normalizeSocialUrl(event.registrationUrl) : null;
  const isSaved = savedIds?.has(event.id) ?? false;

  return (
    <section
      aria-label={fromSaved ? t.nearestSaved : t.nearest}
      className={`grid gap-x-10 gap-y-5 border-y border-ink-200 py-6 sm:grid-cols-[auto_1fr] sm:items-end ${className}`}
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
          {fromSaved ? t.nearestSaved : t.nearest}
        </p>
        <p className="mt-2 flex items-baseline gap-2 text-5xl font-medium tabular-nums text-ink-900 sm:text-6xl">
          {days}
          <span className="text-base font-medium text-ink-400">{t.daysWord(days)}</span>
        </p>
      </div>

      <div className="min-w-0">
        {meta && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-500">
            <Icon name={meta.icon} size={13} />
            {meta.title[language]}
          </p>
        )}
        <Link
          href={`/events/${event.id}`}
          className="mt-1 block break-words font-semibold text-ink-900 outline-none hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {event.title}
        </Link>
        <p className="mt-1 text-sm tabular-nums text-ink-500">
          {t.registerBy} {formatEventDate(event.registrationDeadline, language)}
        </p>
        {days === 0 && <p className="mt-1 text-sm font-semibold text-danger-600">{t.lastDay}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        {registrationUrl ? (
          <ButtonLink href={registrationUrl} external className="group/cta">
            {t.goRegister}
            <Icon
              name="arrow-right"
              size={16}
              className="transition-transform duration-300 group-hover/cta:translate-x-1"
            />
          </ButtonLink>
        ) : (
          <ButtonLink href={`/events/${event.id}`} className="group/cta">
            {t.details}
            <Icon
              name="arrow-right"
              size={16}
              className="transition-transform duration-300 group-hover/cta:translate-x-1"
            />
          </ButtonLink>
        )}

        {savedIds &&
          (isSaved ? (
            <span className="flex items-center gap-2 text-sm font-semibold text-success-700">
              <Icon name="check" size={16} />
              {t.saved}
            </span>
          ) : (
            <Button variant="secondary" onClick={() => onToggleSave(event.id)}>
              <Icon name="star" size={16} />
              {t.save}
            </Button>
          ))}
      </div>
    </section>
  );
}
