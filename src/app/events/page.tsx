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
import { EVENT_TYPES, daysLeftUntil, eventStatus, formatEventDate } from '@/lib/events';
import { EventCard } from '@/components/EventCard';
import type { EventStatus, EventType, SchoolEvent } from '@/lib/events';
import type { Dict } from '@/lib/i18n';
import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';
import { EmptyState, Kicker } from '@/components/ui';
import { usePublishedEvents, useSavedEvents } from '@/lib/supabase/events';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { PublishAction } from '@/components/PublishAction';
import { NearestDeadline } from '@/components/NearestDeadline';

/**
 * «день / дня / дней» по числу.
 *
 * Короткого правила «1 — день, 2–4 — дня, остальное — дней» мало: оно врёт
 * начиная с третьего десятка, а до ближайшего дедлайна в афише спокойно
 * бывает 21 или 22 дня. Считать надо по последним двум цифрам, потому что
 * 11–14 — исключение: там всегда «дней».
 */
function daysWordRu(n: number): string {
  const lastTwo = n % 100;
  const last = n % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return 'дней';
  if (last === 1) return 'день';
  if (last >= 2 && last <= 4) return 'дня';
  return 'дней';
}

/*
  Словарь ровно под то, что показывает эта страница.

  Подписи записи («Записаться», «Вы записаны», «Отменить») отсюда ушли
  вместе с кнопкой: решение о записи принимают на странице события, где
  видно место, классы и что участие даёт, — и слова живут там же.
*/
const TEXT: Dict<{
  kicker: string;
  title: string;
  subtitle: string;
  all: string;
  myEvents: string;
  myGrade: (grade: number) => string;
  add: string;
  propose: string;
  deadline: string;
  daysLeft: (n: number) => string;
  lastDay: string;
  closed: string;
  past: string;
  online: string;
  free: string;
  paid: string;
  empty: string;
  emptyMine: string;
  emptyGrade: string;
  statusOpen: string;
  statusClosing: string;
  details: string;
  prevImage: string;
  nextImage: string;
}> = {
  ru: {
    kicker: 'Олимпиады и конкурсы',
    title: 'Афиша',
    subtitle: 'Олимпиады, конкурсы и события. Главное: не пропустить срок регистрации.',
    all: 'Все',
    myEvents: 'Мои события',
    myGrade: (grade) => `Для ${grade} класса`,
    add: 'Добавить событие',
    propose: 'Предложить событие',
    deadline: 'Регистрация до',
    // Глагол согласуется вместе с существительным: «остался 21 день», но
    // «осталось 22 дня». Отдельная ветка на единицу этого не покрывала.
    daysLeft: (n) => `${daysWordRu(n) === 'день' ? 'остался' : 'осталось'} ${n} ${daysWordRu(n)}`,
    lastDay: 'сегодня последний день',
    /*
      Подписи статуса короткие: это плашка в углу обложки шириной с ноготь,
      а не строка отчёта. «Регистрация открыта» занимала там половину шапки
      и упиралась в вид события. Полные формулировки остались на странице
      события, где для них есть место.
    */
    closed: 'Запись закрыта',
    past: 'Прошло',
    online: 'Онлайн',
    free: 'Бесплатно',
    paid: 'Платное участие',
    empty: 'В этой категории пока нет событий.',
    emptyMine: 'Здесь будут события, которые вы сохраните. Откройте событие и нажмите «Сохранить в мои события».',
    emptyGrade: 'Для вашего класса в этой категории пока ничего нет.',
    statusOpen: 'Идёт запись',
    statusClosing: 'Скоро закрытие',
    details: 'Подробнее',
    prevImage: 'Предыдущее фото',
    nextImage: 'Следующее фото',
  },
  kk: {
    kicker: 'Олимпиадалар мен байқаулар',
    title: 'Афиша',
    subtitle: 'Олимпиадалар, байқаулар және іс-шаралар. Ең бастысы: тіркелу мерзімін өткізіп алмау.',
    all: 'Барлығы',
    myEvents: 'Менің іс-шараларым',
    myGrade: (grade) => `${grade}-сыныпқа`,
    add: 'Іс-шара қосу',
    propose: 'Іс-шара ұсыну',
    deadline: 'Тіркелу мерзімі',
    daysLeft: (n) => `${n} күн қалды`,
    lastDay: 'бүгін соңғы күн',
    closed: 'Тіркеу жабық',
    past: 'Өтті',
    online: 'Онлайн',
    free: 'Тегін',
    paid: 'Ақылы қатысу',
    empty: 'Бұл санатта әзірге іс-шара жоқ.',
    emptyMine: 'Мұнда сіз сақтаған іс-шаралар болады. Іс-шараны ашып, «Менің іс-шараларыма сақтау» батырмасын басыңыз.',
    emptyGrade: 'Бұл санатта сіздің сыныпқа әзірге ештеңе жоқ.',
    statusOpen: 'Тіркеу ашық',
    statusClosing: 'Жабылады',
    details: 'Толығырақ',
    prevImage: 'Алдыңғы сурет',
    nextImage: 'Келесі сурет',
  },
  en: {
    kicker: 'Olympiads and contests',
    title: 'Events',
    subtitle: 'Olympiads, contests and events. The point is not to miss the registration deadline.',
    all: 'All',
    myEvents: 'My events',
    myGrade: (grade) => `For grade ${grade}`,
    add: 'Add event',
    propose: 'Suggest an event',
    deadline: 'Register by',
    daysLeft: (n) => (n === 1 ? '1 day left' : `${n} days left`),
    lastDay: 'today is the last day',
    closed: 'Sign-up closed',
    past: 'Past',
    online: 'Online',
    free: 'Free',
    paid: 'Paid entry',
    empty: 'No events in this category yet.',
    emptyMine: 'Events you save will appear here. Open an event and tap “Save to my events”.',
    emptyGrade: 'Nothing for your grade in this category yet.',
    statusOpen: 'Sign-up open',
    statusClosing: 'Closing soon',
    details: 'Details',
    prevImage: 'Previous image',
    nextImage: 'Next image',
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
  const { state } = useStore();
  const t = TEXT[state.language];
  const { profile } = useSchoolAuth();
  /*
    «Мои события» — из базы (event_saves), а не из localStorage: отметка
    переживает смену устройства, и ближайший дедлайн считается по ней.
  */
  const { ids: savedIds, toggle: toggleSaved } = useSavedEvents();
  const grade = profile?.role === 'student' ? profile.grade : null;

  const [filter, setFilter] = useState<EventType | 'all' | 'mine'>('all');
  const [gradeOnly, setGradeOnly] = useState(false);
  /*
    Сеттер убран: публикация ушла на отдельную страницу и возвращает сюда
    обычным переходом, а список перечитывается при монтировании. Значение
    остаётся как стабильный аргумент хука.
  */
  const [publishRefreshKey] = useState(0);
  const events = usePublishedEvents(publishRefreshKey);

  if (events === null) {
    return <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6" />;
  }

  const visible = events.filter((event) => {
    // Пустой список классов у события значит «для всех».
    if (gradeOnly && grade && event.grades.length > 0 && !event.grades.includes(grade as SchoolEvent['grades'][number])) {
      return false;
    }
    if (filter === 'all') return true;
    if (filter === 'mine') return savedIds?.has(event.id) ?? false;
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Kicker>{t.kicker}</Kicker>
          <h1 className="mt-2 text-3xl font-medium text-ink-900 sm:text-4xl">{t.title}</h1>
        </div>
        {/* Админ публикует сразу, учитель — предлагает: событие ждёт проверки. */}
        <PublishAction
          href="/events/new"
          label={profile?.role === 'teacher' ? t.propose : t.add}
          requireRole={['admin', 'teacher']}
        />
      </div>

      {/*
        Обратный отсчёт — первое, за что цепляется глаз: срок важнее
        заголовка и сетки. Считается по всей афише, а не по фильтру: срок не
        перестаёт гореть оттого, что ученик переключил вкладку. Если есть
        сохранённые события — по ним (см. NearestDeadline).
      */}
      <NearestDeadline
        events={events}
        savedIds={savedIds}
        onToggleSave={toggleSaved}
        language={state.language}
        className="mt-10"
      />

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
            {savedIds && savedIds.size > 0 && ` (${savedIds.size})`}
          </span>
        </button>
        {grade && (
          <button
            onClick={() => setGradeOnly((value) => !value)}
            aria-pressed={gradeOnly}
            className={chip(gradeOnly)}
          >
            <Icon name="users" size={16} />
            {t.myGrade(grade)}
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="mt-4">
          <EmptyState title={filter === 'mine' ? t.emptyMine : gradeOnly ? t.emptyGrade : t.empty} description="" />
        </div>
      ) : (
        <div className="mt-4 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/*
            auto-rows-fr держит все карточки одной высоты.

            Без него строки сетки считают высоту независимо друг от друга: в
            полной строке карточка тянется до самой высокой соседки, а в
            неполной последней — сжимается по своему содержимому. Замер на
            четырёх объявлениях: 501, 501, 501 и 479 — последняя ниже на 22
            пикселя просто потому, что осталась одна в строке.
          */}
          {sorted.map((event) => {
            const status = eventStatus(event);
            const meta = EVENT_TYPES.find((type) => type.id === event.type);

            return (
              <EventCard
                key={event.id}
                event={event}
                status={status}
                statusTone={STATUS_TONE[status]}
                statusLabel={statusLabel[status]}
                bannerClass={TYPE_BANNER[event.type]}
                typeIcon={meta?.icon}
                typeTitle={meta?.title[state.language]}
                daysLeft={daysLeftUntil(event.registrationDeadline)}
                deadlineLabel={formatEventDate(event.registrationDeadline, state.language)}
                t={t}
              />
            );
          })}
        </div>
      )}

    </div>
  );
}

function chip(active: boolean): string {
  return `inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 [@media(pointer:coarse)]:min-h-11 ${
    active
      ? 'border-brand-500 bg-brand-50 text-brand-700'
      : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]'
  }`;
}
