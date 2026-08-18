'use client';

/**
 * Афиша: олимпиады, конкурсы, школьные события и вебинары.
 *
 * Главное на этом экране — не список, а срок. Ученик из области чаще всего
 * проигрывает не в знаниях, а в том, что узнал об олимпиаде после закрытия
 * регистрации. Поэтому дедлайн вынесен в самое заметное место карточки,
 * а события с закрывающейся регистрацией поднимаются наверх.
 */

import { useState } from 'react';
import { EVENTS } from '@/data/events';
import { EVENT_TYPES, daysLeftUntil, eventStatus, formatEventDate } from '@/lib/events';
import type { EventStatus, EventType, SchoolEvent } from '@/lib/events';
import type { Dict } from '@/lib/i18n';
import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';
import { Badge, Button, Card, EmptyState } from '@/components/ui';

const TEXT: Dict<{
  title: string;
  subtitle: string;
  all: string;
  myEvents: string;
  register: string;
  registered: string;
  cancel: string;
  confirmCancel: (title: string) => string;
  deadline: string;
  daysLeft: (n: number) => string;
  lastDay: string;
  closed: string;
  past: string;
  online: string;
  free: string;
  paid: string;
  grades: (list: string) => string;
  prize: string;
  empty: string;
  emptyMine: string;
  statusOpen: string;
  statusClosing: string;
}> = {
  ru: {
    title: 'Афиша',
    subtitle: 'Олимпиады, конкурсы и события. Главное: не пропустить срок регистрации.',
    all: 'Все',
    myEvents: 'Мои записи',
    register: 'Записаться',
    registered: 'Вы записаны',
    cancel: 'Отменить запись',
    confirmCancel: (title) => `Отменить запись на «${title}»?`,
    deadline: 'Регистрация до',
    daysLeft: (n) => (n === 1 ? 'остался 1 день' : n < 5 ? `осталось ${n} дня` : `осталось ${n} дней`),
    lastDay: 'сегодня последний день',
    closed: 'Регистрация закрыта',
    past: 'Уже прошло',
    online: 'Онлайн',
    free: 'Бесплатно',
    paid: 'Платное участие',
    grades: (list) => `${list} класс`,
    prize: 'Что даёт',
    empty: 'В этой категории пока нет событий.',
    emptyMine: 'Вы пока никуда не записались. Загляните в другие категории.',
    statusOpen: 'Регистрация открыта',
    statusClosing: 'Регистрация закрывается',
  },
  kk: {
    title: 'Афиша',
    subtitle: 'Олимпиадалар, байқаулар және іс-шаралар. Ең бастысы: тіркелу мерзімін өткізіп алмау.',
    all: 'Барлығы',
    myEvents: 'Менің жазылымдарым',
    register: 'Тіркелу',
    registered: 'Сіз тіркелдіңіз',
    cancel: 'Тіркеуді болдырмау',
    confirmCancel: (title) => `«${title}» іс-шарасына тіркеу болдырылсын ба?`,
    deadline: 'Тіркелу мерзімі',
    daysLeft: (n) => `${n} күн қалды`,
    lastDay: 'бүгін соңғы күн',
    closed: 'Тіркелу жабық',
    past: 'Өтіп кетті',
    online: 'Онлайн',
    free: 'Тегін',
    paid: 'Ақылы қатысу',
    grades: (list) => `${list} сынып`,
    prize: 'Не береді',
    empty: 'Бұл санатта әзірге іс-шара жоқ.',
    emptyMine: 'Сіз әзірге ешқайда тіркелген жоқсыз. Басқа санаттарды қараңыз.',
    statusOpen: 'Тіркелу ашық',
    statusClosing: 'Тіркелу жабылып жатыр',
  },
  en: {
    title: 'Events',
    subtitle: 'Olympiads, contests and events. The point is not to miss the registration deadline.',
    all: 'All',
    myEvents: 'My registrations',
    register: 'Register',
    registered: 'You are registered',
    cancel: 'Cancel registration',
    confirmCancel: (title) => `Cancel your registration for “${title}”?`,
    deadline: 'Register by',
    daysLeft: (n) => (n === 1 ? '1 day left' : `${n} days left`),
    lastDay: 'today is the last day',
    closed: 'Registration closed',
    past: 'Already held',
    online: 'Online',
    free: 'Free',
    paid: 'Paid entry',
    grades: (list) => `grades ${list}`,
    prize: 'What you get',
    empty: 'No events in this category yet.',
    emptyMine: 'You have not registered for anything yet. Take a look at the other categories.',
    statusOpen: 'Registration open',
    statusClosing: 'Registration closing',
  },
};

/** Цвет плашки статуса. Держим рядом со статусом, чтобы не разъезжались. */
const STATUS_TONE: Record<EventStatus, 'success' | 'accent' | 'neutral'> = {
  open: 'success',
  'closing-soon': 'accent',
  closed: 'neutral',
  past: 'neutral',
};

export default function EventsPage() {
  const { state, toggleEventRegistration } = useStore();
  const t = TEXT[state.language];

  const [filter, setFilter] = useState<EventType | 'all' | 'mine'>('all');

  const visible = EVENTS.filter((event) => {
    if (filter === 'all') return true;
    if (filter === 'mine') return state.eventRegistrations.includes(event.id);
    return event.type === filter;
  });

  /**
   * Порядок вывода: сначала то, куда ещё можно успеть, внутри — по близости
   * дедлайна. Прошедшие и закрытые уходят вниз: они полезны как справка,
   * но не должны занимать первый экран.
   */
  const sorted = [...visible].sort((a, b) => {
    const rank = (event: SchoolEvent) => {
      const status = eventStatus(event);
      if (status === 'closing-soon') return 0;
      if (status === 'open') return 1;
      if (status === 'closed') return 2;
      return 3;
    };
    const byRank = rank(a) - rank(b);
    return byRank !== 0 ? byRank : a.registrationDeadline.localeCompare(b.registrationDeadline);
  });

  const statusLabel: Record<EventStatus, string> = {
    open: t.statusOpen,
    'closing-soon': t.statusClosing,
    closed: t.closed,
    past: t.past,
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">{t.title}</h1>
      <p className="mt-2 text-ink-500">{t.subtitle}</p>

      {/* Фильтры */}
      <div className="mt-6 flex flex-wrap gap-2">
        <button onClick={() => setFilter('all')} className={chip(filter === 'all')}>
          {t.all}
        </button>
        {EVENT_TYPES.map((type) => (
          <button key={type.id} onClick={() => setFilter(type.id)} className={chip(filter === type.id)}>
            <Icon name={type.icon} size={16} />
            {type.title[state.language]}
          </button>
        ))}
        <button onClick={() => setFilter('mine')} className={chip(filter === 'mine')}>
          <Icon name="star" size={16} />
          <span className="tabular-nums">
            {t.myEvents}
            {state.eventRegistrations.length > 0 && ` (${state.eventRegistrations.length})`}
          </span>
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="mt-6">
          <EmptyState title={filter === 'mine' ? t.emptyMine : t.empty} description="" />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {sorted.map((event) => {
            const status = eventStatus(event);
            const meta = EVENT_TYPES.find((type) => type.id === event.type);
            const registered = state.eventRegistrations.includes(event.id);
            const daysLeft = daysLeftUntil(event.registrationDeadline);
            const canRegister = status === 'open' || status === 'closing-soon';

            return (
              <Card key={event.id} className={status === 'past' ? 'opacity-60' : ''}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand">
                    {meta && <Icon name={meta.icon} size={14} />}
                    {meta?.title[state.language]}
                  </Badge>
                  <Badge tone={STATUS_TONE[status]}>{statusLabel[status]}</Badge>
                  {event.online && <Badge>{t.online}</Badge>}
                  <Badge tone={event.free ? 'success' : 'neutral'}>{event.free ? t.free : t.paid}</Badge>
                </div>

                <h2 className="mt-3 text-lg font-bold text-ink-900">{event.title}</h2>
                <p className="mt-1 text-sm text-ink-400">{event.organizer}</p>
                <p className="mt-2 text-sm text-ink-600">{event.description}</p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-ink-50 px-4 py-3">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
                      <Icon name="calendar" size={14} />
                      {t.deadline}
                    </p>
                    <p className="mt-1 font-bold tabular-nums text-ink-900">
                      {formatEventDate(event.registrationDeadline, state.language)}
                    </p>
                    {/* Обратный отсчёт — то, ради чего вся страница */}
                    {canRegister && (
                      <p
                        className={`mt-0.5 text-sm font-semibold tabular-nums ${
                          status === 'closing-soon' ? 'text-danger-600' : 'text-ink-500'
                        }`}
                      >
                        {daysLeft === 0 ? t.lastDay : t.daysLeft(daysLeft)}
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl bg-ink-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide tabular-nums text-ink-400">
                      {formatEventDate(event.startsAt, state.language)}
                    </p>
                    <p className="mt-1 text-sm text-ink-700">{event.location}</p>
                    <p className="mt-0.5 text-xs tabular-nums text-ink-400">{t.grades(event.grades.join(', '))}</p>
                  </div>
                </div>

                {event.prize && (
                  <p className="mt-3 text-sm text-ink-600">
                    <span className="font-semibold text-ink-800">{t.prize}: </span>
                    {event.prize}
                  </p>
                )}

                <div className="mt-4">
                  {registered ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-2 font-semibold text-success-700">
                        <Icon name="check" size={18} />
                        {t.registered}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(t.confirmCancel(event.title))) toggleEventRegistration(event.id);
                        }}
                      >
                        {t.cancel}
                      </Button>
                    </div>
                  ) : (
                    canRegister && (
                      <Button onClick={() => toggleEventRegistration(event.id)}>{t.register}</Button>
                    )
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function chip(active: boolean): string {
  return `inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
    active
      ? 'border-brand-500 bg-brand-50 text-brand-700'
      : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]'
  }`;
}
