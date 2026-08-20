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
import { Badge, Button, Card, EmptyState, Kicker } from '@/components/ui';

const TEXT: Dict<{
  kicker: string;
  title: string;
  subtitle: string;
  nearestDeadline: string;
  daysWord: (n: number) => string;
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
    kicker: 'Олимпиады и конкурсы',
    title: 'Афиша',
    subtitle: 'Олимпиады, конкурсы и события. Главное: не пропустить срок регистрации.',
    nearestDeadline: 'Ближайший дедлайн',
    daysWord: (n) => (n === 1 ? 'день' : n > 1 && n < 5 ? 'дня' : 'дней'),
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
    kicker: 'Олимпиадалар мен байқаулар',
    title: 'Афиша',
    subtitle: 'Олимпиадалар, байқаулар және іс-шаралар. Ең бастысы: тіркелу мерзімін өткізіп алмау.',
    nearestDeadline: 'Жақын мерзім',
    daysWord: () => 'күн қалды',
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
    kicker: 'Olympiads and contests',
    title: 'Events',
    subtitle: 'Olympiads, contests and events. The point is not to miss the registration deadline.',
    nearestDeadline: 'Closest deadline',
    daysWord: (n) => (n === 1 ? 'day left' : 'days left'),
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

/**
 * Цвет баннера карточки по виду события.
 * Настоящих фотографий у событий нет — вместо них цветная плашка с иконкой
 * вида события, тот же приём, что и заглушка без фото на карточке услуги.
 */
const TYPE_BANNER: Record<EventType, string> = {
  olympiad: 'bg-brand-500',
  contest: 'bg-accent-500',
  school: 'bg-success-600',
  course: 'bg-ink-700',
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

  /**
   * Событие, до закрытия регистрации которого осталось меньше всего времени.
   *
   * Считается по всей афише, а не по отфильтрованному списку: срок не перестаёт
   * гореть оттого, что ученик переключил вкладку категории.
   */
  const nearest = EVENTS.filter((event) => {
    const status = eventStatus(event);
    return status === 'open' || status === 'closing-soon';
  }).sort((a, b) => a.registrationDeadline.localeCompare(b.registrationDeadline))[0];
  const nearestDays = nearest ? daysLeftUntil(nearest.registrationDeadline) : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Kicker>{t.kicker}</Kicker>
      <h1 className="mt-2 text-3xl font-semibold text-ink-900 sm:text-4xl">{t.title}</h1>

      {/*
        Обратный отсчёт вынесен из списка наверх и набран крупнее всего на экране.

        Ученик проигрывает олимпиаду не в задачах, а в том, что узнаёт о ней после
        закрытия регистрации. Поэтому первое, за что цепляется глаз, это число
        оставшихся дней, а не заголовок страницы и не сетка карточек.
        Число лежит на голом фоне между волосяными линиями: ещё одна карточка
        здесь сравняла бы срок по весу с обычным событием.
      */}
      {nearest && (
        <div className="mt-10 flex flex-wrap items-end gap-x-10 gap-y-4 border-y border-ink-200 py-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.nearestDeadline}</p>
            <p className="mt-2 flex items-baseline gap-2 text-5xl font-semibold tabular-nums text-ink-900 sm:text-6xl">
              {nearestDays}
              <span className="text-base font-medium text-ink-400">{t.daysWord(nearestDays)}</span>
            </p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink-900">{nearest.title}</p>
            <p className="mt-2 text-sm tabular-nums text-ink-500">
              {t.deadline} {formatEventDate(nearest.registrationDeadline, state.language)}
            </p>
            {nearestDays === 0 && <p className="mt-2 text-sm font-semibold text-danger-600">{t.lastDay}</p>}
          </div>
        </div>
      )}

      {/* Вводный абзац: на голом фоне, отдельно от заголовка */}
      <p className="mt-4 max-w-2xl text-sm text-ink-500">{t.subtitle}</p>

      {/* Фильтры */}
      <div className="mt-10 flex flex-wrap gap-2">
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
        <div className="mt-4">
          <EmptyState title={filter === 'mine' ? t.emptyMine : t.empty} description="" />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((event) => {
            const status = eventStatus(event);
            const meta = EVENT_TYPES.find((type) => type.id === event.type);
            const registered = state.eventRegistrations.includes(event.id);
            const daysLeft = daysLeftUntil(event.registrationDeadline);
            const canRegister = status === 'open' || status === 'closing-soon';

            return (
              <Card
                key={event.id}
                className={`group flex flex-col overflow-hidden p-0 transition-all duration-300 hover:shadow-[var(--shadow-lift)] ${
                  status === 'past' ? 'opacity-60' : ''
                }`}
              >
                {/*
                  Настоящих фотографий у события нет, поэтому баннер — цветная
                  плашка с иконкой вида события, а не пустое место. Плашка
                  состояния регистрации лежит поверх, как цена на карточке услуги.
                */}
                <div className={`relative flex h-24 items-center justify-center ${TYPE_BANNER[event.type]}`}>
                  {meta && (
                    <Icon
                      name={meta.icon}
                      size={34}
                      className="text-white/85 transition-transform duration-500 group-hover:scale-110"
                    />
                  )}
                  <span className="absolute right-3 top-3">
                    <Badge tone={STATUS_TONE[status]}>{statusLabel[status]}</Badge>
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <Badge tone="brand" className="w-fit">
                    {meta && <Icon name={meta.icon} size={14} />}
                    {meta?.title[state.language]}
                  </Badge>

                  <h2 className="mt-3 line-clamp-2 text-lg font-bold text-ink-900">{event.title}</h2>
                  <p className="mt-2 text-sm text-ink-400">{event.organizer}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-ink-600">{event.description}</p>

                  <p className="mt-2 text-sm tabular-nums text-ink-500">
                    {[
                      event.online ? t.online : null,
                      event.free ? t.free : t.paid,
                      t.grades(event.grades.join(', ')),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>

                  {event.prize && (
                    <p className="mt-2 text-sm text-ink-600">
                      <span className="font-semibold text-ink-800">{t.prize}: </span>
                      {event.prize}
                    </p>
                  )}

                  {/* Сроки и действие прибиты к низу, чтобы карточки в ряду
                      выравнивались по нижнему краю независимо от длины текста */}
                  <div className="mt-auto pt-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-t border-ink-200 pt-4">
                      <div>
                        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-400">
                          <Icon name="calendar" size={14} />
                          {t.deadline}
                        </p>
                        <p className="mt-2 font-semibold tabular-nums text-ink-900">
                          {formatEventDate(event.registrationDeadline, state.language)}
                        </p>
                        {canRegister && (
                          <p
                            className={`mt-1 text-sm font-semibold ${
                              status === 'closing-soon' ? 'text-danger-600' : 'text-ink-500'
                            }`}
                          >
                            {daysLeft === 0 ? t.lastDay : t.daysLeft(daysLeft)}
                          </p>
                        )}
                      </div>
                      <p className="text-sm tabular-nums text-ink-500">{event.location}</p>
                    </div>

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
                  </div>
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
