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
import { EVENT_TYPES, daysLeftUntil, eventStatus, formatEventDate } from '@/lib/events';
import type { EventStatus, EventType, SchoolEvent } from '@/lib/events';
import type { Dict } from '@/lib/i18n';
import type { Language } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { useStore } from '@/components/StoreProvider';
import { EventEditForm } from '@/components/EventEditForm';
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
  register: string;
  registered: string;
  cancel: string;
  confirmCancel: (title: string) => string;
  edit: string;
  editTitle: string;
  statusOpen: string;
  statusClosing: string;
  statusClosed: string;
  statusPast: string;
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
    register: 'Записаться',
    registered: 'Вы записаны',
    cancel: 'Отменить запись',
    confirmCancel: (title) => `Отменить запись на «${title}»?`,
    edit: 'Редактировать',
    editTitle: 'Правка события',
    statusOpen: 'Регистрация открыта',
    statusClosing: 'Регистрация закрывается',
    statusClosed: 'Регистрация закрыта',
    statusPast: 'Уже прошло',
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
    register: 'Тіркелу',
    registered: 'Сіз тіркелдіңіз',
    cancel: 'Тіркеуді болдырмау',
    confirmCancel: (title) => `«${title}» іс-шарасына тіркеу болдырылсын ба?`,
    edit: 'Өңдеу',
    editTitle: 'Іс-шараны өңдеу',
    statusOpen: 'Тіркелу ашық',
    statusClosing: 'Тіркелу жабылып жатыр',
    statusClosed: 'Тіркелу жабық',
    statusPast: 'Өтіп кетті',
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
    register: 'Register',
    registered: 'You are registered',
    cancel: 'Cancel registration',
    confirmCancel: (title) => `Cancel your registration for “${title}”?`,
    edit: 'Edit',
    editTitle: 'Edit event',
    statusOpen: 'Registration open',
    statusClosing: 'Registration closing',
    statusClosed: 'Registration closed',
    statusPast: 'Already held',
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
  cover_path: string | null;
  cover_paths: string[] | null;
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
    coverUrls: coverPathsOf(row).map(
      (path) => supabase.storage.from('card-covers').getPublicUrl(path).data.publicUrl,
    ),
  };
}

export default function EventPage({ params }: PageProps<'/events/[id]'>) {
  const { id } = use(params);
  const { state, toggleEventRegistration } = useStore();
  const { profile } = useSchoolAuth();
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
          registered={state.eventRegistrations.includes(row.id)}
          onToggleRegistration={() => toggleEventRegistration(row.id)}
          /*
            Правка доступна автору публикации и администратору — ровно тем,
            кого пропускает политика UPDATE в базе. Показать кнопку шире
            политики значило бы обещать действие, которое закончится отказом.
          */
          canEdit={profile !== null && (profile.id === row.admin_id || profile.role === 'admin')}
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

function EventBody({
  row,
  t,
  language,
  registered,
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
      coverPaths: coverPathsOf(row),
    };

    return (
      <div className="mt-6">
        <Kicker>{t.editTitle}</Kicker>
        <h1 className="mt-2 mb-8 text-2xl font-semibold text-ink-900 sm:text-3xl">{event.title}</h1>
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
            <h1 className="mt-2 text-3xl font-semibold text-ink-900 sm:text-4xl">{event.title}</h1>
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
            <span className="text-3xl font-semibold leading-tight text-white/90 sm:text-4xl">
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
              <p className="mt-2 flex items-baseline gap-2 text-5xl font-semibold tabular-nums text-ink-900 sm:text-6xl">
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
              <p className="mt-2 text-3xl font-semibold tabular-nums text-ink-500 sm:text-4xl">
                {formatEventDate(event.registrationDeadline, language)}
              </p>
              <p className="mt-2 text-sm text-ink-400">{status === 'past' ? t.pastNote : t.closedNote}</p>
            </>
          )}
        </div>

        {/*
          Отменить запись можно и после закрытия регистрации: человек уже
          числится участником, и запереть его в этом списке было бы
          нечестно. Записаться заново — уже нет, срок есть срок.
        */}
        {registered ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 font-semibold text-success-700">
              <Icon name="check" size={18} />
              {t.registered}
            </span>
            <Button
              variant="ghost"
              onClick={() => {
                if (window.confirm(t.confirmCancel(event.title))) onToggleRegistration();
              }}
            >
              {t.cancel}
            </Button>
          </div>
        ) : (
          registrationRuns && (
            <Button onClick={onToggleRegistration} className="group/cta">
              {t.register}
              <Icon
                name="arrow-right"
                size={16}
                className="transition-transform duration-300 group-hover/cta:translate-x-1"
              />
            </Button>
          )
        )}
      </div>

      {event.description && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-ink-900">{t.about}</h2>
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
