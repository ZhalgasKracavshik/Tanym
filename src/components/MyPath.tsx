'use client';

/**
 * «Мой путь» — домашний экран ученика на пилоте.
 *
 * Отвечает на один вопрос: «куда мне успеть?». Поэтому порядок такой:
 * ближайший дедлайн → мои события → что ещё подходит моему классу →
 * архив, чтобы было чем заняться между олимпиадами.
 *
 * Тон мягкий намеренно. Раньше домашний экран открывался тёмной панелью со
 * счётчиками («0 баллов», «0 дней подряд», «#7 место») — у новичка это
 * читается как отчёт о том, чего он ещё не сделал. Здесь нет ни одного
 * нуля: пустые блоки предлагают следующий шаг, а не фиксируют пустоту.
 */

import Link from 'next/link';
import { EVENT_TYPES, daysLeftUntil, eventStatus, formatEventDate } from '@/lib/events';
import type { SchoolEvent } from '@/lib/events';
import type { Dict, Language } from '@/lib/i18n';
import { INTERESTS } from '@/lib/profileFields';
import { avatarPhotoUrl } from '@/lib/supabase/avatarPhoto';
import { usePublishedEvents, useSavedEvents, type SaveStatus } from '@/lib/supabase/events';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { NearestDeadline } from './NearestDeadline';
import { useStore } from './StoreProvider';
import { ButtonLink, Skeleton } from './ui';

const TEXT: Dict<{
  hello: (name: string) => string;
  grade: (grade: number) => string;
  edit: string;
  myEvents: string;
  myEventsEmpty: string;
  openEvents: string;
  open: string;
  closed: string;
  past: string;
  registerBy: (date: string) => string;
  startsOn: (date: string) => string;
  daysLeft: (n: number) => string;
  lastDay: string;
  applied: string;
  participated: string;
  forYou: (grade: number | null) => string;
  forYouEmpty: string;
  allEvents: string;
  archiveTitle: string;
  archiveText: string;
  archiveCta: string;
  suggestTitle: string;
  suggestText: string;
  suggestCta: string;
}> = {
  ru: {
    hello: (name) => `Привет, ${name}`,
    grade: (grade) => `${grade} класс`,
    edit: 'Изменить',
    myEvents: 'Мои события',
    myEventsEmpty: 'Сохраняйте олимпиады и конкурсы из афиши — здесь будут их сроки, чтобы ничего не пропустить.',
    openEvents: 'Открыть афишу',
    open: 'Идёт регистрация',
    closed: 'Регистрация закрыта',
    past: 'Прошли',
    registerBy: (date) => `регистрация до ${date}`,
    startsOn: (date) => `проходит ${date}`,
    daysLeft: (n) => (n === 0 ? 'сегодня последний день' : `осталось ${n} дн.`),
    lastDay: 'сегодня последний день',
    applied: 'заявка подана',
    participated: 'участвовали',
    forYou: (grade) => (grade ? `Подходит для ${grade} класса` : 'Ещё в афише'),
    forYouEmpty: 'Пока всё подходящее уже у вас в списке.',
    allEvents: 'Вся афиша',
    archiveTitle: 'Архив заданий',
    archiveText: 'ЕНТ, олимпиады, SAT и IELTS — задания прошлых лет с разбором.',
    archiveCta: 'Потренироваться',
    suggestTitle: 'Знаете олимпиаду, которой нет в афише?',
    suggestText: 'Расскажите — после проверки её увидят все.',
    suggestCta: 'Предложить событие',
  },
  kk: {
    hello: (name) => `Сәлем, ${name}`,
    grade: (grade) => `${grade}-сынып`,
    edit: 'Өзгерту',
    myEvents: 'Менің іс-шараларым',
    myEventsEmpty: 'Афишадан олимпиадалар мен байқауларды сақтаңыз — мерзімдері осында болады.',
    openEvents: 'Афишаны ашу',
    open: 'Тіркеу жүріп жатыр',
    closed: 'Тіркеу жабық',
    past: 'Өтіп кетті',
    registerBy: (date) => `тіркелу ${date} дейін`,
    startsOn: (date) => `${date} өтеді`,
    daysLeft: (n) => (n === 0 ? 'бүгін соңғы күн' : `${n} күн қалды`),
    lastDay: 'бүгін соңғы күн',
    applied: 'өтінім берілді',
    participated: 'қатыстыңыз',
    forYou: (grade) => (grade ? `${grade}-сыныпқа сай` : 'Афишада тағы бар'),
    forYouEmpty: 'Сізге сайдың бәрі тізімде.',
    allEvents: 'Бүкіл афиша',
    archiveTitle: 'Тапсырмалар мұрағаты',
    archiveText: 'ҰБТ, олимпиадалар, SAT және IELTS — өткен жылдардың тапсырмалары талдауымен.',
    archiveCta: 'Жаттығу',
    suggestTitle: 'Афишада жоқ олимпиаданы білесіз бе?',
    suggestText: 'Айтыңыз — тексерілген соң оны бәрі көреді.',
    suggestCta: 'Іс-шара ұсыну',
  },
  en: {
    hello: (name) => `Hi, ${name}`,
    grade: (grade) => `Grade ${grade}`,
    edit: 'Edit',
    myEvents: 'My events',
    myEventsEmpty: 'Save olympiads and contests from the events page — their deadlines will show up here.',
    openEvents: 'Open events',
    open: 'Registration open',
    closed: 'Registration closed',
    past: 'Past',
    registerBy: (date) => `register by ${date}`,
    startsOn: (date) => `takes place ${date}`,
    daysLeft: (n) => (n === 0 ? 'last day today' : `${n} days left`),
    lastDay: 'last day today',
    applied: 'applied',
    participated: 'took part',
    forYou: (grade) => (grade ? `Fits grade ${grade}` : 'More events'),
    forYouEmpty: 'Everything that fits is already on your list.',
    allEvents: 'All events',
    archiveTitle: 'Task archive',
    archiveText: 'UNT, olympiads, SAT and IELTS — past tasks with solutions.',
    archiveCta: 'Practise',
    suggestTitle: 'Know an olympiad that is not listed?',
    suggestText: 'Tell us — once checked, everyone will see it.',
    suggestCta: 'Suggest an event',
  },
};

export function MyPath() {
  const { state } = useStore();
  const language = state.language;
  const t = TEXT[language];
  const { profile } = useSchoolAuth();
  const events = usePublishedEvents();
  const { ids: savedIds, statuses, toggle } = useSavedEvents();

  const firstName = (profile?.name ?? '').split(' ')[0] || '';
  const grade = profile?.role === 'student' ? profile.grade : null;
  const interestTitles = (profile?.interests ?? [])
    .map((id) => INTERESTS.find((item) => item.id === id)?.title)
    .filter(Boolean)
    .slice(0, 3);

  const saved = (events ?? []).filter((event) => savedIds?.has(event.id));
  const groups = {
    open: saved.filter((event) => ['open', 'closing-soon'].includes(eventStatus(event))),
    closed: saved.filter((event) => eventStatus(event) === 'closed'),
    past: saved.filter((event) => eventStatus(event) === 'past'),
  };

  const suggestions = (events ?? [])
    .filter((event) => !savedIds?.has(event.id))
    .filter((event) => ['open', 'closing-soon'].includes(eventStatus(event)))
    .filter((event) => !grade || event.grades.length === 0 || event.grades.includes(grade as SchoolEvent['grades'][number]))
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Приветствие: светлая тёплая карточка, без счётчиков. */}
      <section className="flex items-center gap-4 rounded-[var(--radius-card)] bg-brand-50 px-5 py-5 sm:px-6">
        <Avatar
          name={profile?.name ?? ''}
          colorId={profile?.avatar_color}
          photoUrl={avatarPhotoUrl(profile?.avatar_photo_path)}
          size={56}
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-medium leading-tight text-ink-900 sm:text-2xl">{t.hello(firstName)}</h1>
          <p className="mt-0.5 truncate text-sm text-ink-500">
            {[grade ? t.grade(grade) : null, ...interestTitles].filter(Boolean).join(' · ')}
          </p>
        </div>
        <Link
          href="/profile"
          aria-label={t.edit}
          className="shrink-0 rounded-[var(--radius-pill)] px-2 py-1.5 text-sm font-semibold text-brand-700 outline-none hover:bg-brand-100 focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {t.edit}
        </Link>
      </section>

      {events === null ? (
        <div className="mt-8 space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <>
          <NearestDeadline
            events={events}
            savedIds={savedIds}
            onToggleSave={toggle}
            language={language}
            className="mt-8"
          />

          <section className="mt-10">
            <h2 className="text-lg font-medium text-ink-900">{t.myEvents}</h2>
            {saved.length === 0 ? (
              <div className="mt-3 rounded-[var(--radius-card)] border border-dashed border-ink-200 px-5 py-6">
                <p className="text-sm text-ink-500">{t.myEventsEmpty}</p>
                <ButtonLink href="/events" variant="secondary" size="sm" className="mt-4">
                  {t.openEvents}
                </ButtonLink>
              </div>
            ) : (
              <div className="mt-3 space-y-5">
                <EventGroup title={t.open} events={groups.open} language={language} t={t} statuses={statuses} />
                <EventGroup title={t.closed} events={groups.closed} language={language} t={t} statuses={statuses} muted />
                <EventGroup title={t.past} events={groups.past} language={language} t={t} statuses={statuses} muted />
              </div>
            )}
          </section>

          <section className="mt-10">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-medium text-ink-900">{t.forYou(grade)}</h2>
              <Link href="/events" className="text-sm font-semibold text-brand-600 hover:underline">
                {t.allEvents}
              </Link>
            </div>
            {suggestions.length === 0 ? (
              <p className="mt-3 text-sm text-ink-500">{t.forYouEmpty}</p>
            ) : (
              <ul className="mt-3 divide-y divide-ink-100 rounded-[var(--radius-card)] border border-ink-200 bg-white">
                {suggestions.map((event) => (
                  <EventRow key={event.id} event={event} language={language} t={t} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <section className="mt-10 grid gap-3 sm:grid-cols-2">
        <Link
          href="/archive"
          className="group rounded-[var(--radius-card)] border border-ink-200 bg-white p-5 outline-none transition-shadow hover:shadow-[var(--shadow-lift)] focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Icon name="folder" size={20} />
          </span>
          <p className="mt-3 font-medium text-ink-900">{t.archiveTitle}</p>
          <p className="mt-1 text-sm text-ink-500">{t.archiveText}</p>
          <p className="mt-3 flex items-center gap-1 text-sm font-semibold text-brand-600">
            {t.archiveCta}
            <Icon name="arrow-right" size={14} className="transition-transform group-hover:translate-x-1" />
          </p>
        </Link>
        <Link
          href="/events/new"
          className="group rounded-[var(--radius-card)] border border-ink-200 bg-white p-5 outline-none transition-shadow hover:shadow-[var(--shadow-lift)] focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-50 text-accent-600">
            <Icon name="plus" size={20} />
          </span>
          <p className="mt-3 font-medium text-ink-900">{t.suggestTitle}</p>
          <p className="mt-1 text-sm text-ink-500">{t.suggestText}</p>
          <p className="mt-3 flex items-center gap-1 text-sm font-semibold text-brand-600">
            {t.suggestCta}
            <Icon name="arrow-right" size={14} className="transition-transform group-hover:translate-x-1" />
          </p>
        </Link>
      </section>
    </div>
  );
}

type PathText = (typeof TEXT)['ru'];

function EventGroup({
  title,
  events,
  language,
  t,
  statuses,
  muted = false,
}: {
  title: string;
  events: SchoolEvent[];
  language: Language;
  t: PathText;
  statuses: Map<string, SaveStatus> | null;
  muted?: boolean;
}) {
  if (events.length === 0) return null;
  return (
    <div className={muted ? 'opacity-70' : ''}>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{title}</p>
      <ul className="mt-2 divide-y divide-ink-100 rounded-[var(--radius-card)] border border-ink-200 bg-white">
        {events.map((event) => (
          <EventRow key={event.id} event={event} language={language} t={t} status={statuses?.get(event.id)} />
        ))}
      </ul>
    </div>
  );
}

function EventRow({
  event,
  language,
  t,
  status: saveStatus,
}: {
  event: SchoolEvent;
  language: Language;
  t: PathText;
  /** Статус из «Моих событий»; у подборки его нет. */
  status?: SaveStatus;
}) {
  const status = eventStatus(event);
  const meta = EVENT_TYPES.find((type) => type.id === event.type);
  const registrationRuns = status === 'open' || status === 'closing-soon';
  const days = daysLeftUntil(event.registrationDeadline);

  return (
    <li>
      <Link
        href={`/events/${event.id}`}
        className="flex items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-600">
          {meta && <Icon name={meta.icon} size={16} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink-900">{event.title}</span>
          <span className="block truncate text-xs text-ink-500">
            {registrationRuns
              ? t.registerBy(formatEventDate(event.registrationDeadline, language))
              : t.startsOn(formatEventDate(event.startsAt, language))}
          </span>
        </span>
        {saveStatus === 'applied' || saveStatus === 'participated' ? (
          <span className="shrink-0 rounded-[var(--radius-pill)] bg-success-50 px-2 py-0.5 text-xs font-semibold text-success-700">
            {saveStatus === 'applied' ? t.applied : t.participated}
          </span>
        ) : registrationRuns && (
          <span
            className={`shrink-0 text-xs font-semibold ${status === 'closing-soon' ? 'text-danger-600' : 'text-ink-500'}`}
          >
            {t.daysLeft(days)}
          </span>
        )}
      </Link>
    </li>
  );
}
