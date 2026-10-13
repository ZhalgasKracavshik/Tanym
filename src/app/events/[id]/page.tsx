'use client';

/**
 * Страница одного события афиши.
 *
 * Зачем она понадобилась. На карточке стояла кнопка «Записаться», а рядом с
 * ней — три строки описания. Человек соглашался участвовать, не зная ни
 * места, ни классов, ни того, что участие даёт: подробности прятались за
 * разворачивающимся блоком, куда почти никто не заглядывал. Решение и
 * основания для решения оказались на разных экранах.
 *
 * Теперь наоборот: в афише карточка только зовёт («Подробнее»), а запись
 * живёт здесь, под полным описанием, датами, местом и сроком. Это тот же
 * порядок, что и в любом списке-с-карточкой: список отвечает «что есть»,
 * страница — «стоит ли», и только она принимает действие.
 *
 * Автор публикации (и администратор) правит событие тут же, не уходя на
 * отдельный экран: правка — это продолжение чтения, а не отдельная задача.
 */

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { EVENT_TYPES, daysLeftUntil, deadlineIcs, eventStatus, formatEventDate } from '@/lib/events';
import type { EventStatus, EventType, SchoolEvent } from '@/lib/events';
import type { Dict } from '@/lib/i18n';
import type { Language } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { normalizeSocialUrl, shortenUrl } from '@/lib/social';
import { almatyDateIso } from '@/lib/date';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { useStore } from '@/components/StoreProvider';
import { EventEditForm } from '@/components/EventEditForm';
import { useSavedEvents, type SaveStatus } from '@/lib/supabase/events';
import type { EventEditInitial } from '@/components/EventEditForm';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import { Badge, Button, ButtonLink, EmptyState, Kicker, Skeleton } from '@/components/ui';
import { Reveal } from '@/components/motion';

/**
 * «день / дня / дней» по числу.
 *
 * Короткого правила «1 — день, 2–4 — дня, остальное — дней» мало: оно врёт
 * начиная с третьего десятка, а именно такие сроки здесь и бывают. Считать
 * надо по последним двум цифрам: 21 день, 22 дня, 25 дней, но 11 дней и
 * 12 дней — исключение, там всегда «дней».
 */
function daysWordRu(n: number): string {
  const lastTwo = n % 100;
  const last = n % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return 'дней';
  if (last === 1) return 'день';
  if (last >= 2 && last <= 4) return 'дня';
  return 'дней';
}

const TEXT: Dict<{
  back: string;
  notFoundTitle: string;
  notFoundText: string;
  organizer: string;
  about: string;
  startsAt: string;
  place: string;
  online: string;
  offline: string;
  gradesLabel: string;
  grades: (list: string) => string;
  prize: string;
  free: string;
  paid: string;
  deadline: string;
  deadlineDate: string;
  daysWord: (n: number) => string;
  lastDay: string;
  closedNote: string;
  pastNote: string;
  /** Внешняя ссылка организатора — единственное, что теперь называется «Записаться». */
  register: string;
  /**
   * Личная пометка «собираюсь пойти», отдельная от register.
   *
   * Раньше оба смысла делила одна кнопка: локальный переключатель в
   * localStorage назывался «Записаться», хотя ни организатор, ни школа
   * о нажатии не узнавали. Разведены явно, чтобы кнопка с внешней ссылкой
   * не выглядела так же, как заметка для себя.
   */
  markGoing: string;
  going: string;
  unmark: string;
  guestSave: string;
  share: string;
  calendar: string;
  applied: string;
  markApplied: string;
  participated: string;
  markParticipated: string;
  verified: (date: string) => string;
  source: string;
  markVerified: string;
  shareText: (title: string, date: string) => string;
  confirmUnmark: (title: string) => string;
  edit: string;
  editTitle: string;
  statusOpen: string;
  statusClosing: string;
  statusClosed: string;
  statusPast: string;
  /** Заявка учителя, которую ещё не проверил админ. Видят только автор и админ. */
  pendingNote: string;
  rejectedNote: string;
  prevImage: string;
  nextImage: string;
  imageOf: (shown: number, total: number) => string;
  unknown: string;
}> = {
  ru: {
    back: 'Назад в афишу',
    notFoundTitle: 'Событие не найдено',
    notFoundText: 'Публикацию могли удалить, или ссылка устарела. В афише — всё, что идёт сейчас.',
    organizer: 'Организатор',
    about: 'О событии',
    startsAt: 'Дата проведения',
    place: 'Место',
    online: 'Онлайн',
    offline: 'Очно',
    gradesLabel: 'Классы',
    grades: (list) => `${list} класс`,
    prize: 'Что даёт участие',
    free: 'Бесплатно',
    paid: 'Платное участие',
    deadline: 'До конца регистрации',
    deadlineDate: 'Регистрация до',
    daysWord: daysWordRu,
    lastDay: 'Сегодня последний день',
    closedNote: 'Регистрация закрыта',
    pastNote: 'Событие уже прошло',
    register: 'Перейти к регистрации',
    markGoing: 'Сохранить в мои события',
    going: 'В ваших событиях',
    unmark: 'Убрать',
    guestSave: 'Войти и сохранить',
    share: 'Отправить в WhatsApp',
    calendar: 'В календарь',
    applied: 'Заявка подана',
    markApplied: 'Я подал заявку',
    participated: 'Вы участвовали',
    markParticipated: 'Я участвовал',
    verified: (date) => `Сроки сверены ${date}`,
    source: 'Источник',
    markVerified: 'Сверено сегодня',
    shareText: (title, date) => `${title} — регистрация до ${date}`,
    confirmUnmark: (title) => `Убрать «${title}» из ваших событий?`,
    edit: 'Редактировать',
    editTitle: 'Правка события',
    statusOpen: 'Регистрация открыта',
    statusClosing: 'Регистрация закрывается',
    statusClosed: 'Регистрация закрыта',
    statusPast: 'Уже прошло',
    pendingNote: 'На проверке: событие увидят все после одобрения администратором.',
    rejectedNote: 'Администратор отклонил это событие. Его видите только вы.',
    prevImage: 'Предыдущее фото',
    nextImage: 'Следующее фото',
    imageOf: (shown, total) => `${shown} из ${total}`,
    unknown: 'Не указано',
  },
  kk: {
    back: 'Афишаға оралу',
    notFoundTitle: 'Іс-шара табылмады',
    notFoundText: 'Жарияланым жойылған болуы мүмкін немесе сілтеме ескірген. Афишада — қазір жүргені.',
    organizer: 'Ұйымдастырушы',
    about: 'Іс-шара туралы',
    startsAt: 'Өткізілу күні',
    place: 'Орны',
    online: 'Онлайн',
    offline: 'Қатысып',
    gradesLabel: 'Сыныптар',
    grades: (list) => `${list} сынып`,
    prize: 'Не береді',
    free: 'Тегін',
    paid: 'Ақылы қатысу',
    deadline: 'Тіркелуге қалды',
    deadlineDate: 'Тіркелу мерзімі',
    daysWord: () => 'күн',
    lastDay: 'Бүгін соңғы күн',
    closedNote: 'Тіркелу жабық',
    pastNote: 'Іс-шара өтіп кетті',
    register: 'Тіркелуге өту',
    markGoing: 'Менің іс-шараларыма сақтау',
    going: 'Сіздің іс-шараларыңызда',
    unmark: 'Алып тастау',
    guestSave: 'Кіріп, сақтау',
    share: 'WhatsApp-қа жіберу',
    calendar: 'Күнтізбеге',
    applied: 'Өтінім берілді',
    markApplied: 'Өтінім бердім',
    participated: 'Сіз қатыстыңыз',
    markParticipated: 'Қатыстым',
    verified: (date) => `Мерзімдер ${date} тексерілді`,
    source: 'Дереккөз',
    markVerified: 'Бүгін тексерілді',
    shareText: (title, date) => `${title} — тіркелу ${date} дейін`,
    confirmUnmark: (title) => `«${title}» сіздің іс-шараларыңыздан алынсын ба?`,
    edit: 'Өңдеу',
    editTitle: 'Іс-шараны өңдеу',
    statusOpen: 'Тіркелу ашық',
    statusClosing: 'Тіркелу жабылып жатыр',
    statusClosed: 'Тіркелу жабық',
    statusPast: 'Өтіп кетті',
    pendingNote: 'Тексерілуде: әкімші мақұлдағаннан кейін іс-шараны бәрі көреді.',
    rejectedNote: 'Әкімші бұл іс-шараны қабылдамады. Оны тек сіз көресіз.',
    prevImage: 'Алдыңғы сурет',
    nextImage: 'Келесі сурет',
    imageOf: (shown, total) => `${total} суреттің ${shown}-і`,
    unknown: 'Көрсетілмеген',
  },
  en: {
    back: 'Back to events',
    notFoundTitle: 'Event not found',
    notFoundText: 'The post may have been removed, or the link is out of date. The events page has what is running now.',
    organizer: 'Organiser',
    about: 'About the event',
    startsAt: 'Event date',
    place: 'Place',
    online: 'Online',
    offline: 'In person',
    gradesLabel: 'Grades',
    grades: (list) => `grades ${list}`,
    prize: 'What you get',
    free: 'Free',
    paid: 'Paid entry',
    deadline: 'Left to register',
    deadlineDate: 'Register by',
    daysWord: (n) => (n === 1 ? 'day' : 'days'),
    lastDay: 'Today is the last day',
    closedNote: 'Registration closed',
    pastNote: 'The event is over',
    register: 'Go to registration',
    markGoing: 'Save to my events',
    going: 'In your events',
    unmark: 'Remove',
    guestSave: 'Log in to save',
    share: 'Share on WhatsApp',
    calendar: 'Add to calendar',
    applied: 'Application sent',
    markApplied: 'I applied',
    participated: 'You took part',
    markParticipated: 'I took part',
    verified: (date) => `Dates checked ${date}`,
    source: 'Source',
    markVerified: 'Checked today',
    shareText: (title, date) => `${title} — register by ${date}`,
    confirmUnmark: (title) => `Remove "${title}" from your events?`,
    edit: 'Edit',
    editTitle: 'Edit event',
    statusOpen: 'Registration open',
    statusClosing: 'Registration closing',
    statusClosed: 'Registration closed',
    statusPast: 'Already held',
    pendingNote: 'Under review: everyone will see this event once an admin approves it.',
    rejectedNote: 'An admin rejected this event. Only you can see it.',
    prevImage: 'Previous image',
    nextImage: 'Next image',
    imageOf: (shown, total) => `${shown} of ${total}`,
    unknown: 'Not specified',
  },
};

const STATUS_TONE: Record<EventStatus, 'success' | 'accent' | 'neutral'> = {
  open: 'success',
  'closing-soon': 'accent',
  closed: 'neutral',
  past: 'neutral',
};

/*
  Тот же набор заливок, что и в афише: без фотографий шапка события должна
  выглядеть одинаково и в списке, и на странице, иначе переход читается как
  попадание в другой продукт.
*/
const TYPE_BANNER: Record<EventType, string> = {
  olympiad: 'bg-brand-500',
  contest: 'bg-accent-500',
  school: 'bg-success-600',
  course: 'bg-ink-700',
};

/**
 * Строка published_events.
 *
 * Разбирается здесь, а не общим хуком афиши: тому нужен список без автора,
 * а этой странице — ровно одна строка и обязательно с admin_id, по которому
 * решается, показывать ли правку. Пути обложек тоже нужны как пути: форма
 * правки кладёт их обратно в колонку, а публичная ссылка туда не годится.
 */
interface EventRow {
  id: string;
  admin_id: string | null;
  type: EventType;
  title: string;
  organizer: string;
  description: string;
  starts_at: string;
  registration_deadline: string;
  location: string;
  online: boolean;
  grades: number[];
  subject_id: string | null;
  prize: string | null;
  free: boolean;
  registration_url: string | null;
  cover_path: string | null;
  cover_paths: string[] | null;
  status: 'pending' | 'approved' | 'rejected';
  /** Появились миграцией pilot_event_sources_applications_reminders. */
  source_url?: string | null;
  verified_at?: string | null;
}

/** Пути обложек по порядку. Легаси-колонка — запасной источник, как в афише. */
function coverPathsOf(row: EventRow): string[] {
  return row.cover_paths?.length ? row.cover_paths : ([row.cover_path].filter(Boolean) as string[]);
}

function rowToEvent(row: EventRow): SchoolEvent {
  const supabase = createClient();
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    organizer: row.organizer,
    description: row.description,
    startsAt: row.starts_at,
    registrationDeadline: row.registration_deadline,
    location: row.location,
    online: row.online,
    grades: row.grades as SchoolEvent['grades'],
    subjectId: row.subject_id ?? undefined,
    prize: row.prize ?? undefined,
    free: row.free,
    registrationUrl: row.registration_url,
    coverUrls: coverPathsOf(row).map(
      (path) => supabase.storage.from('card-covers').getPublicUrl(path).data.publicUrl,
    ),
  };
}

export default function EventPage({ params }: PageProps<'/events/[id]'>) {
  const { id } = use(params);
  const { state } = useStore();
  // Сохранение — в базе (event_saves), см. useSavedEvents.
  const { ids: savedIds, statuses, toggle: toggleSaved, setStatus } = useSavedEvents();
  const { profile, isSignedIn, loading: authLoading } = useSchoolAuth();
  const t = TEXT[state.language];

  /*
    Три состояния, а не два: undefined — ещё грузим, null — такой строки нет.
    Свести их к одному null означало бы показывать «событие не найдено»
    каждому, кто открыл страницу, — на те полсекунды, пока идёт запрос.
  */
  const [row, setRow] = useState<EventRow | null | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    createClient()
      .from('published_events')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setRow((data as EventRow | null) ?? null);
      });

    return () => {
      cancelled = true;
    };
  }, [id, refreshKey]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link
        href="/events"
        className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-ink-500 outline-none transition-colors duration-150 hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <Icon name="arrow-left" size={16} />
        {t.back}
      </Link>

      {row === undefined ? (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="aspect-[16/9] w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : row === null ? (
        <div className="mt-8">
          <EmptyState
            icon="calendar"
            title={t.notFoundTitle}
            description={t.notFoundText}
            action={
              <ButtonLink href="/events" variant="secondary">
                {t.back}
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <EventBody
          row={row}
          t={t}
          language={state.language}
          registered={savedIds?.has(row.id) ?? false}
          saveStatus={statuses?.get(row.id) ?? 'saved'}
          onSetStatus={(status) => setStatus(row.id, status)}
          isAdmin={profile?.role === 'admin'}
          onVerified={() => setRefreshKey((key) => key + 1)}
          canSave={savedIds !== null && row.status === 'approved'}
          guest={!authLoading && !isSignedIn}
          onToggleRegistration={() => toggleSaved(row.id)}
          /*
            Правка доступна администратору и автору, пока событие на проверке, —
            ровно тем, кого пропускает политика UPDATE в базе. Показать кнопку шире
            политики значило бы обещать действие, которое закончится отказом.
          */
          canEdit={
            profile !== null &&
            (profile.role === 'admin' || (profile.id === row.admin_id && row.status === 'pending'))
          }
          editing={editing}
          onEdit={() => setEditing(true)}
          onCancelEdit={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            setRefreshKey((key) => key + 1);
          }}
        />
      )}
    </div>
  );
}

type PageText = (typeof TEXT)['ru'];

/**
 * Адрес сайта для ссылки «Отправить в WhatsApp». Из окружения, а не из
 * window.location: href считается и на сервере, и разный адрес в двух
 * рендерах дал бы расхождение при гидратации.
 */
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tanym-alpha.vercel.app').replace(/\/+$/, '');

function EventBody({
  row,
  t,
  language,
  registered,
  saveStatus,
  onSetStatus,
  isAdmin,
  onVerified,
  canSave,
  guest,
  onToggleRegistration,
  canEdit,
  editing,
  onEdit,
  onCancelEdit,
  onSaved,
}: {
  row: EventRow;
  t: PageText;
  language: Language;
  registered: boolean;
  saveStatus: SaveStatus;
  onSetStatus: (status: SaveStatus) => void;
  isAdmin: boolean;
  onVerified: () => void;
  /** Сохранять можно только одобренное — так же решает политика event_saves. */
  canSave: boolean;
  /** Гость: сохранить нельзя, вместо кнопки — вход. */
  guest: boolean;
  onToggleRegistration: () => void;
  canEdit: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaved: () => void;
}) {
  const event = rowToEvent(row);
  const status = eventStatus(event);
  const daysLeft = daysLeftUntil(event.registrationDeadline);
  const registrationRuns = status === 'open' || status === 'closing-soon';
  /*
    Проверяется повторно здесь же, а не только при сохранении формы.
    Публикация события — прямая запись в Supabase с этой же страницы,
    без отдельного серверного роута, и колонка уходит прямиком в href —
    то есть это та же защита, что и у ссылок в профиле (parseSocialLinks):
    источником правды считается момент показа, а не момент записи.
  */
  const safeRegistrationUrl = event.registrationUrl ? normalizeSocialUrl(event.registrationUrl) : null;
  const safeSourceUrl = row.source_url ? normalizeSocialUrl(row.source_url) : null;
  const meta = EVENT_TYPES.find((type) => type.id === event.type);
  const images = event.coverUrls ?? [];
  /*
    Колонка grades может прийти пустой у записей, заведённых мимо формы, а
    страница читается по прямой ссылке — падать на одной старой строке
    нельзя.
  */
  const grades = row.grades ?? [];

  const statusLabel: Record<EventStatus, string> = {
    open: t.statusOpen,
    'closing-soon': t.statusClosing,
    closed: t.statusClosed,
    past: t.statusPast,
  };

  if (editing) {
    const initial: EventEditInitial = {
      type: event.type,
      title: event.title,
      organizer: event.organizer,
      description: event.description,
      startsAt: event.startsAt,
      deadline: event.registrationDeadline,
      location: event.location,
      online: event.online,
      grades,
      prize: event.prize ?? '',
      free: event.free,
      registrationUrl: row.registration_url ?? '',
      sourceUrl: row.source_url ?? '',
      coverPaths: coverPathsOf(row),
    };

    return (
      <div className="mt-6">
        <Kicker>{t.editTitle}</Kicker>
        <h1 className="mt-2 mb-8 text-2xl font-medium text-ink-900 sm:text-3xl">{event.title}</h1>
        <EventEditForm
          eventId={row.id}
          language={language}
          initial={initial}
          onSaved={onSaved}
          onCancel={onCancelEdit}
        />
      </div>
    );
  }

  return (
    <article>
      <Reveal immediate>
        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Kicker>{meta?.title[language]}</Kicker>
            <h1 className="mt-2 text-3xl font-medium text-ink-900 sm:text-4xl">{event.title}</h1>
            <p className="mt-2 text-sm text-ink-500">
              {t.organizer}: {event.organizer || t.unknown}
            </p>
          </div>

          {canEdit && (
            <Button variant="secondary" onClick={onEdit}>
              <Icon name="pencil" size={16} />
              {t.edit}
            </Button>
          )}
        </div>
      </Reveal>

      {row.status !== 'approved' && (
        <p
          role="status"
          className={`mt-6 rounded-[var(--radius-control)] border px-4 py-3 text-sm font-medium ${
            row.status === 'pending'
              ? 'border-accent-200 bg-accent-50 text-accent-700'
              : 'border-danger-200 bg-danger-50 text-danger-700'
          }`}
        >
          {row.status === 'pending' ? t.pendingNote : t.rejectedNote}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <Badge tone={STATUS_TONE[status]}>{statusLabel[status]}</Badge>
        <Badge tone="neutral">{event.online ? t.online : t.offline}</Badge>
        <Badge tone={event.free ? 'success' : 'brand'}>{event.free ? t.free : t.paid}</Badge>
      </div>

      <div className="mt-6">
        {images.length > 0 ? (
          <Gallery images={images} prevLabel={t.prevImage} nextLabel={t.nextImage} countLabel={t.imageOf} />
        ) : (
          /*
            Тот же приём, что и на карточке: вместо выдуманной иллюстрации —
            крупная типографика на плотной заливке. Придуманная картинка на
            странице события врала бы сильнее, чем в ленте: сюда приходят
            смотреть, как всё выглядит на самом деле.
          */
          <div
            className={`flex aspect-[16/9] items-end rounded-[var(--radius-card)] p-6 sm:p-8 ${TYPE_BANNER[event.type]}`}
          >
            <span className="text-3xl font-medium leading-tight text-white/90 sm:text-4xl">
              {meta?.title[language]}
            </span>
          </div>
        )}
      </div>

      {/*
        Срок и действие стоят вместе и выше описания.

        Ученик из области проигрывает олимпиаду не в задачах, а в том, что
        узнаёт о ней после закрытия регистрации. Поэтому число оставшихся
        дней набрано крупнее всего на странице, а кнопка записи — прямо
        рядом с ним, а не в конце длинного текста.
      */}
      <div className="mt-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-5 border-y border-ink-200 py-6">
        {/*
          Пока срок идёт, крупно набрано число дней, а дата стоит подписью.
          Когда срок вышел, считать нечего — крупной становится сама дата, а
          снизу муторным шрифтом объяснение, почему нет кнопки.

          Раньше здесь в обоих случаях печаталась строка «Регистрация до
          <дата>» под заголовком «Регистрация до», а на месте числа стояло
          «Регистрация закрыта» — то же слово в слово, что и на плашке выше.
          Один и тот же факт трижды.
        */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
            {registrationRuns ? t.deadline : t.deadlineDate}
          </p>

          {registrationRuns ? (
            <>
              <p className="mt-2 flex items-baseline gap-2 text-5xl font-medium tabular-nums text-ink-900 sm:text-6xl">
                {daysLeft}
                <span className="text-base font-medium text-ink-400">{t.daysWord(daysLeft)}</span>
              </p>
              <p className="mt-2 text-sm tabular-nums text-ink-500">
                {t.deadlineDate} {formatEventDate(event.registrationDeadline, language)}
              </p>
              {daysLeft === 0 && <p className="mt-2 text-sm font-semibold text-danger-600">{t.lastDay}</p>}
            </>
          ) : (
            <>
              <p className="mt-2 text-3xl font-medium tabular-nums text-ink-500 sm:text-4xl">
                {formatEventDate(event.registrationDeadline, language)}
              </p>
              <p className="mt-2 text-sm text-ink-400">{status === 'past' ? t.pastNote : t.closedNote}</p>
            </>
          )}
        </div>

        {/*
          Две разные кнопки для двух разных вещей — раньше на их месте
          стояла одна, и это и было нечестно.

          «Записаться» — настоящая внешняя ссылка. Её даёт организатор при
          публикации, ведёт на его форму или в его чат, и открывается в
          новой вкладке. Нет ссылки — нет и кнопки: обещать действие,
          которого нет, хуже, чем не предлагать никакого.

          Отметка «иду» — то, что раньше называлось «Записаться», хотя
          менялась только строка в браузере: ни организатор, ни школа об
          этом не узнавали. Смысл остаётся полезным — по нему строится
          фильтр «Мои записи» в афише и виджет «ближайшее событие» в
          кабинете, — просто назван так, как есть: личная заметка, а не
          запись куда-либо.
        */}
        <div className="flex flex-wrap items-center gap-3">
          {registrationRuns && safeRegistrationUrl && (
            <ButtonLink href={safeRegistrationUrl} external className="group/cta">
              {t.register}
              <Icon
                name="link"
                size={16}
                className="transition-transform duration-300 group-hover/cta:translate-x-1"
              />
            </ButtonLink>
          )}

          {registered ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-success-700">
                <Icon name="check" size={16} />
                {saveStatus === 'participated' ? t.participated : saveStatus === 'applied' ? t.applied : t.going}
              </span>
              {/*
                Статус — шаг к портфолио: сохранил → подал → участвовал.
                «Подал» имеет смысл, пока идёт регистрация, «участвовал» —
                когда заявка подана (docs/achievements-and-progress.md).
              */}
              {saveStatus === 'saved' && registrationRuns && (
                <Button variant="secondary" size="sm" onClick={() => onSetStatus('applied')}>
                  {t.markApplied}
                </Button>
              )}
              {saveStatus === 'applied' && (
                <Button variant="secondary" size="sm" onClick={() => onSetStatus('participated')}>
                  {t.markParticipated}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm(t.confirmUnmark(event.title))) onToggleRegistration();
                }}
              >
                {t.unmark}
              </Button>
            </div>
          ) : (
            registrationRuns &&
            guest ? (
              <ButtonLink href="/register" variant="secondary" size="sm">
                <Icon name="star" size={14} />
                {t.guestSave}
              </ButtonLink>
            ) : registrationRuns &&
            canSave && (
              <Button variant="secondary" size="sm" onClick={onToggleRegistration}>
                <Icon name="star" size={14} />
                {t.markGoing}
              </Button>
            )
          )}

          {/*
            Ссылку на олимпиаду пересылают в чат класса — так афиша и
            расходится. wa.me открывает WhatsApp с готовым текстом.
          */}
          <ButtonLink
            href={`https://wa.me/?text=${encodeURIComponent(
              `${t.shareText(event.title, formatEventDate(event.registrationDeadline, language))}\n${SITE_URL}/events/${event.id}`,
            )}`}
            external
            variant="ghost"
            size="sm"
          >
            <Icon name="link" size={14} />
            {t.share}
          </ButtonLink>

          {/* Дедлайн в календарь телефона — напоминание без нашей почты. */}
          {registrationRuns && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const blob = new Blob([deadlineIcs(event, `${SITE_URL}/events/${event.id}`)], {
                  type: 'text/calendar;charset=utf-8',
                });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'tanym-deadline.ics';
                link.click();
                setTimeout(() => URL.revokeObjectURL(link.href), 1000);
              }}
            >
              <Icon name="calendar" size={14} />
              {t.calendar}
            </Button>
          )}
        </div>
      </div>

      {event.description && (
        <section className="mt-8">
          <h2 className="text-lg font-medium text-ink-900">{t.about}</h2>
          {/* whitespace-pre-line: абзацы организатора остаются абзацами, а не
              сливаются в один кирпич текста. Обрезки здесь нет намеренно —
              страница затем и нужна, чтобы описание было целиком. */}
          <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-700">
            {event.description}
          </p>
        </section>
      )}

      <dl className="mt-8 grid gap-x-8 gap-y-5 border-t border-ink-200 pt-6 sm:grid-cols-2">
        <Fact icon="calendar" label={t.startsAt} value={formatEventDate(event.startsAt, language)} />
        <Fact
          icon="pin"
          label={t.place}
          value={event.online ? t.online : event.location || t.unknown}
        />
        {grades.length > 0 && (
          <Fact icon="users" label={t.gradesLabel} value={t.grades(grades.join(', '))} />
        )}
        {/*
          Цены в списке нет намеренно: она уже стоит плашкой под заголовком,
          рядом со статусом и форматом. Повторить её здесь значило бы
          заставить читать одно и то же дважды.
        */}
        {event.prize && <Fact icon="trophy" label={t.prize} value={event.prize} />}
      </dl>

      {/*
        Откуда сведения и когда их сверяли. Просроченная афиша опаснее
        пустой: ученик должен видеть, что сроки кто-то проверял, и иметь
        возможность открыть первоисточник сам.
      */}
      {(row.verified_at || safeSourceUrl || isAdmin) && (
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ink-200 pt-4 text-xs text-ink-500">
          {row.verified_at && (
            <span className="flex items-center gap-1.5">
              <Icon name="check" size={13} className="text-success-600" />
              {t.verified(formatEventDate(row.verified_at.slice(0, 10), language))}
            </span>
          )}
          {safeSourceUrl && (
            <a
              href={safeSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-600 hover:underline"
            >
              {t.source}: {shortenUrl(safeSourceUrl)}
            </a>
          )}
          {isAdmin && <MarkVerifiedButton eventId={row.id} label={t.markVerified} onDone={onVerified} />}
        </div>
      )}
    </article>
  );
}

function Fact({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 text-ink-300">
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</dt>
        <dd className="mt-1 text-[15px] font-medium text-ink-800">{value}</dd>
      </div>
    </div>
  );
}

/*
  Направление приходит в variants через `custom` — как и в карточке афиши:
  кадр уезжает в ту сторону, откуда пришёл следующий, иначе листание назад
  выглядит как листание вперёд.
*/
const SLIDE = {
  enter: (direction: number) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction < 0 ? '100%' : '-100%', opacity: 0 }),
};

/**
 * Галерея события.
 *
 * Отличается от карусели на карточке двумя вещами, и обе умышленные:
 * кадр крупный (16:9 во всю колонку, а не полоска в 192 пикселя) и стрелки
 * видны всегда, а не по наведению. В ленте картинка — приманка, здесь она
 * и есть содержимое: прятать управление тем, ради чего страницу открыли,
 * незачем.
 */
function Gallery({
  images,
  prevLabel,
  nextLabel,
  countLabel,
}: {
  images: string[];
  prevLabel: string;
  nextLabel: string;
  countLabel: (shown: number, total: number) => string;
}) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  /*
    Номер кадра приводится к списку на каждом рендере, а не хранится
    выверенным. После правки события страница перечитывает строку, а
    галерея остаётся той же и со своим состоянием: если автор убрал
    последние обложки, сохранённый номер указывал бы за конец массива —
    в src уходил бы undefined, и на месте картинки оставалась бы дыра.
  */
  const shown = Math.min(index, images.length - 1);

  function move(step: number) {
    setDirection(step);
    setIndex((current) => (Math.min(current, images.length - 1) + step + images.length) % images.length);
  }

  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-card)] bg-ink-900">
      <AnimatePresence initial={false} custom={direction}>
        <motion.img
          key={shown}
          src={images[shown]}
          alt=""
          custom={direction}
          variants={SLIDE}
          initial={reduce ? false : 'enter'}
          animate="center"
          exit={reduce ? { opacity: 0 } : 'exit'}
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </AnimatePresence>

      {images.length > 1 && (
        <>
          <GalleryButton side="left" label={prevLabel} onClick={() => move(-1)} />
          <GalleryButton side="right" label={nextLabel} onClick={() => move(1)} />

          <span className="absolute right-3 top-3 rounded-[var(--radius-pill)] bg-ink-900/55 px-2.5 py-1 text-xs font-semibold tabular-nums text-white backdrop-blur-sm">
            {countLabel(shown + 1, images.length)}
          </span>

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {images.map((image, dot) => (
              <button
                key={image}
                onClick={() => {
                  setDirection(dot > shown ? 1 : -1);
                  setIndex(dot);
                }}
                aria-label={`${dot + 1}`}
                aria-current={dot === shown}
                className={`h-2 rounded-full transition-all duration-300 ${
                  dot === shown ? 'w-6 bg-white' : 'w-2 bg-white/55 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function GalleryButton({
  side,
  label,
  onClick,
}: {
  side: 'left' | 'right';
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-ink-900/50 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-ink-900/75 focus-visible:ring-2 focus-visible:ring-white ${
        side === 'left' ? 'left-3' : 'right-3'
      }`}
    >
      <Icon name={side === 'left' ? 'chevron-left' : 'chevron-right'} size={18} />
    </button>
  );
}

/**
 * «Сверено сегодня» — админ подтверждает, что сроки совпадают с
 * первоисточником. Ставить дату может только админ (триггер в базе).
 */
function MarkVerifiedButton({ eventId, label, onDone }: { eventId: string; label: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await createClient().from('published_events').update({ verified_at: almatyDateIso() }).eq('id', eventId);
        setBusy(false);
        onDone();
      }}
      className="rounded-[var(--radius-pill)] border border-ink-200 px-2.5 py-1 font-semibold text-ink-600 hover:border-brand-300 hover:text-brand-600 disabled:opacity-50"
    >
      {label}
    </button>
  );
}
