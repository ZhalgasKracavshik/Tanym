'use client';

/**
 * Личный кабинет: что уже сделано, где пробелы и что делать дальше.
 *
 * Все цифры на этой странице берутся из движка персонализации, а не считаются
 * здесь заново. Страница только показывает — так исключается расхождение
 * между кабинетом, планом и панелью учителя.
 */

import { getSubject, getTopic } from '@/data';
import { daysUntil, rankTopics, summarize, weakestSkills } from '@/lib/personalization';
import { almatyDateIso, almatyYesterdayIso } from '@/lib/date';
import { daysLeftUntil } from '@/lib/events';
import { usePublishedEvents } from '@/lib/supabase/events';
import { useStore } from '@/components/StoreProvider';
import { useEffectiveProfile } from '@/lib/useEffectiveProfile';
import type { Dict } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import { ButtonLink, Card, EmptyState, Kicker, ProgressBar, SectionHeader, Skeleton } from '@/components/ui';
import { Reveal } from '@/components/motion';
import { ProgressRing } from '@/components/ProgressRing';
import { ActivityFeed } from '@/components/ActivityFeed';

/** Подписи кабинета на трёх языках. Ключи одинаковые — за этим следит TypeScript. */
const TEXT: Dict<{
  noProfileTitle: string;
  noProfileText: string;
  createProfile: string;
  greeting: (name: string) => string;
  gradeLabel: (grade: number) => string;
  daysLeft: (days: number) => string;
  daysLeftLabel: string;
  noDataTitle: string;
  noDataText: string;
  startDiagnostics: string;
  statTasks: string;
  statAccuracy: string;
  correctHint: (n: number) => string;
  statTopics: string;
  startedHint: (n: number) => string;
  statPoints: string;
  pointsHint: string;
  streakLabel: string;
  streakHint: (n: number) => string;
  topicsTitle: string;
  topicsDescription: string;
  topicsEmpty: string;
  solved: (n: number, total: number) => string;
  mastered: string;
  continue: string;
  weakTitle: string;
  nextTitle: string;
  eventTitle: string;
  eventIn: (n: number) => string;
  eventToday: string;
  allEvents: string;
  targetHintBefore: string;
  targetHintLink: string;
  targetHintAfter: string;
  todayKicker: string;
  todayStart: string;
  todayRing: string;
  todayDoneTitle: string;
  todayDoneText: string;
  feedTitle: string;
}> = {
  ru: {
    noProfileTitle: 'Профиль ещё не создан',
    noProfileText: 'Расскажите о себе: класс, предметы и цель. Кабинет сразу наполнится данными.',
    createProfile: 'Создать профиль',
    greeting: (name) => `Привет, ${name}`,
    gradeLabel: (grade) => `${grade} класс`,
    daysLeft: (days) => `до цели осталось ${days} дн.`,
    daysLeftLabel: 'дней до цели',
    noDataTitle: 'Пока нет данных о прогрессе',
    noDataText: 'Пройди диагностику: она займёт 7 минут и покажет, с чего начать.',
    startDiagnostics: 'Пройти диагностику',
    statTasks: 'Решено заданий',
    statAccuracy: 'Точность',
    correctHint: (n) => `верно ${n}`,
    statTopics: 'Освоено тем',
    startedHint: (n) => `начато ${n}`,
    statPoints: 'Очки',
    pointsHint: 'за сложность заданий',
    streakLabel: 'Серия',
    streakHint: (n) => (n === 1 ? 'день подряд' : n > 1 && n < 5 ? 'дня подряд' : 'дней подряд'),
    topicsTitle: 'Прогресс по темам',
    topicsDescription: 'Темы, которые ты уже начал решать',
    topicsEmpty: 'Ты ещё не начал ни одной темы. Загляни в план.',
    solved: (n, total) => `решено ${n} из ${total}`,
    mastered: 'Освоено',
    continue: 'Продолжить',
    weakTitle: 'Слабые места',
    nextTitle: 'Продолжить обучение',
    eventTitle: 'Ближайшее событие',
    eventIn: (n) => (n === 1 ? 'через 1 день' : n < 5 ? `через ${n} дня` : `через ${n} дней`),
    eventToday: 'сегодня',
    allEvents: 'Вся афиша',
    targetHintBefore: 'Укажи дату экзамена в ',
    targetHintLink: 'профиле',
    targetHintAfter: ', и появится обратный отсчёт с подсказкой по темпу.',
    todayKicker: 'Сегодняшняя задача',
    todayStart: 'Начать',
    todayRing: 'освоено',
    todayDoneTitle: 'На сегодня всё',
    todayDoneText: 'Выбери предмет в плане — и здесь появится задача на завтра.',
    feedTitle: 'Что происходит',
  },
  kk: {
    noProfileTitle: 'Профиль әлі құрылмаған',
    noProfileText: 'Өзің туралы айтып бер: сынып, пәндер және мақсат. Сонда кабинет деректерге толады.',
    createProfile: 'Профиль құру',
    greeting: (name) => `Сәлем, ${name}`,
    gradeLabel: (grade) => `${grade}-сынып`,
    daysLeft: (days) => `мақсатқа ${days} күн қалды`,
    daysLeftLabel: 'мақсатқа дейін күн',
    noDataTitle: 'Әзірге прогресс туралы дерек жоқ',
    noDataText: 'Диагностикадан өт: ол 7 минут алады және неден бастау керегін көрсетеді.',
    startDiagnostics: 'Диагностикадан өту',
    statTasks: 'Шығарылған тапсырма',
    statAccuracy: 'Дәлдік',
    correctHint: (n) => `дұрыс ${n}`,
    statTopics: 'Меңгерілген тақырып',
    startedHint: (n) => `басталғаны ${n}`,
    statPoints: 'Ұпай',
    pointsHint: 'тапсырма күрделілігі үшін',
    streakLabel: 'Серия',
    streakHint: () => 'күн қатарынан',
    topicsTitle: 'Тақырыптар бойынша прогресс',
    topicsDescription: 'Сен шығара бастаған тақырыптар',
    topicsEmpty: 'Сен әлі бірде-бір тақырыпты бастаған жоқсың. Жоспарға кіріп көр.',
    solved: (n, total) => `${total} ішінен ${n} шығарылды`,
    mastered: 'Меңгерілді',
    continue: 'Жалғастыру',
    weakTitle: 'Әлсіз тұстар',
    nextTitle: 'Оқуды жалғастыру',
    eventTitle: 'Жақын іс-шара',
    eventIn: (n) => `${n} күннен кейін`,
    eventToday: 'бүгін',
    allEvents: 'Барлық афиша',
    targetHintBefore: 'Емтихан күнін ',
    targetHintLink: 'профильде',
    targetHintAfter: ' көрсет, сонда кері санақ пен қарқын бойынша кеңес пайда болады.',
    todayKicker: 'Бүгінгі тапсырма',
    todayStart: 'Бастау',
    todayRing: 'меңгерілді',
    todayDoneTitle: 'Бүгінге болды',
    todayDoneText: 'Жоспардан пән таңда — сонда мұнда ертеңгі тапсырма шығады.',
    feedTitle: 'Не болып жатыр',
  },
  en: {
    noProfileTitle: 'No profile yet',
    noProfileText: 'Tell us about yourself: grade, subjects and goal. The dashboard will fill up right away.',
    createProfile: 'Create profile',
    greeting: (name) => `Hi, ${name}`,
    gradeLabel: (grade) => `Grade ${grade}`,
    daysLeft: (days) => `${days} days left until your goal`,
    daysLeftLabel: 'days to your goal',
    noDataTitle: 'No progress data yet',
    noDataText: 'Take the diagnostic: it takes 7 minutes and shows where to start.',
    startDiagnostics: 'Take the diagnostic',
    statTasks: 'Tasks solved',
    statAccuracy: 'Accuracy',
    correctHint: (n) => `${n} correct`,
    statTopics: 'Topics mastered',
    startedHint: (n) => `${n} started`,
    statPoints: 'Points',
    pointsHint: 'for task difficulty',
    streakLabel: 'Streak',
    streakHint: (n) => (n === 1 ? 'day in a row' : 'days in a row'),
    topicsTitle: 'Progress by topic',
    topicsDescription: 'Topics you have already started',
    topicsEmpty: 'You have not started any topic yet. Take a look at your plan.',
    solved: (n, total) => `${n} of ${total} solved`,
    mastered: 'Mastered',
    continue: 'Continue',
    weakTitle: 'Weak spots',
    nextTitle: 'Keep learning',
    eventTitle: 'Next event',
    eventIn: (n) => (n === 1 ? 'in 1 day' : `in ${n} days`),
    eventToday: 'today',
    allEvents: 'All events',
    targetHintBefore: 'Set your exam date in your ',
    targetHintLink: 'profile',
    targetHintAfter: ' and a countdown with pacing tips will appear.',
    todayKicker: "Today's task",
    todayStart: 'Start',
    todayRing: 'mastered',
    todayDoneTitle: "That's it for today",
    todayDoneText: 'Pick a subject in your plan and tomorrow’s task will appear here.',
    feedTitle: 'What’s happening',
  },
};

/**
 * Второстепенная метрика в строке показателей.
 *
 * Отличается от главной только размером числа. Одинаковый кегль у всех цифр
 * означал бы, что все они одинаково важны, а это неправда: ученик судит о себе
 * по точности, остальное это подробности.
 */
function Metric({
  label,
  value,
  note,
  icon,
  accent = false,
}: {
  label: string;
  value: number;
  note?: string;
  icon?: IconName;
  accent?: boolean;
}) {
  return (
    <div className="lg:px-8">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-2xl font-semibold tabular-nums text-ink-900">
        {icon && <Icon name={icon} size={20} className={accent ? 'text-accent-500' : 'text-ink-300'} />}
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-ink-400">{note}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { state, hydrated } = useStore();
  const publishedEvents = usePublishedEvents();
  /*
    Не state.profile напрямую: локальная копия пуста в новом браузере, и
    вошедший ученик получал бы «профиль не создан» поверх заполненного
    профиля. Подробности — в useEffectiveProfile.
  */
  const profile = useEffectiveProfile();
  const t = TEXT[state.language];

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        {/* Иконка вынесена наружу: проп icon у EmptyState принимает строку,
            а рисованные иконки набора приходят готовым элементом. */}
        <div className="mb-3 flex justify-center text-ink-300">
          <Icon name="backpack" size={40} />
        </div>
        <EmptyState
          title={t.noProfileTitle}
          description={t.noProfileText}
          action={<ButtonLink href="/profile">{t.createProfile}</ButtonLink>}
        />
      </div>
    );
  }

  const stats = summarize(state);
  // Серия считается живой, только если занимались сегодня или вчера — иначе
  // показывали бы «5 дней подряд» тому, кто не заходил месяц.
  const lastActive = state.streak.lastActiveDate;
  const streakValue =
    lastActive === almatyDateIso() || lastActive === almatyYesterdayIso() ? state.streak.current : 0;
  // Ближайшее из тех событий, на которые ученик записался и которые ещё не прошли.
  const upcomingEvent = (publishedEvents ?? [])
    .filter((event) => state.eventRegistrations.includes(event.id) && daysLeftUntil(event.startsAt) >= 0)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  const daysLeft = daysUntil(profile.targetDate);
  const primarySubject = getSubject(profile.subjectIds[0]);
  const nextTopics = primarySubject ? rankTopics(primarySubject, state, state.customTopics).slice(0, 3) : [];

  // Темы, к которым ученик уже прикасался.
  const startedTopics = Object.values(state.topicProgress).filter((item) => item.attempts > 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/*
        Кабинет открывается иначе, чем остальные страницы, и это намеренно.

        Когда каждый экран начинается одинаковым заголовком с подзаголовком,
        интерфейс выглядит собранным по шаблону. Здесь ученик приходит смотреть
        на свои цифры, поэтому первым делом идёт обращение по имени, а класс
        и обратный отсчёт стоят рядом мелко, как подпись, а не как отдельная
        строка описания.
      */}
      {/*
        Приветствие лежит на тёмной панели с тёплым бликом, а не на белом фоне.
        Кабинет — единственный экран, куда ученик заходит каждый день, и он
        должен открываться как «твоё место», а не как очередная страница
        со списком. Обратный отсчёт до экзамена вынесен сюда же: это причина,
        по которой он вообще открывает приложение.
      */}
      <Reveal immediate>
        <div
          className="relative overflow-hidden rounded-[var(--radius-card)] p-8 text-white shadow-[var(--shadow-float)] sm:p-10"
          style={{ background: 'var(--gradient-ink)' }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
            style={{ background: 'var(--gradient-brand)' }}
          />
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-semibold sm:text-4xl">
                {t.greeting(profile.name.split(' ')[0])}
              </h1>
              <p className="mt-2 text-sm text-white/60">{t.gradeLabel(profile.grade)}</p>
            </div>

            {daysLeft !== null && daysLeft >= 0 && (
              <div className="rounded-[var(--radius-control)] border border-white/15 bg-white/10 px-5 py-3 backdrop-blur">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/50">
                  {t.daysLeftLabel}
                </p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">{daysLeft}</p>
              </div>
            )}
          </div>
        </div>
      </Reveal>

      {/*
        Задача дня стоит сразу под приветствием и в единственном числе.

        Ниже на странице есть и список начатых тем, и «продолжить обучение»
        с тремя вариантами — но выбор из списка это работа, которую ученик
        делает до того, как начал заниматься, и на которой чаще всего
        закрывает вкладку. Здесь выбор уже сделан движком персонализации:
        одна тема, одна кнопка. Списки остаются ниже для тех, кто хочет
        решить иначе.
      */}
      {nextTopics[0] && (
        <Reveal immediate>
          <Card className="mt-6 border-brand-200/80 bg-gradient-to-br from-brand-50/80 via-white to-white">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="min-w-[16rem] flex-1">
                <Kicker>{t.todayKicker}</Kicker>
                <h2 className="mt-2 text-2xl font-semibold text-ink-900">
                  {nextTopics[0].topic.title}
                </h2>
                <p className="mt-1 text-sm text-ink-500">{nextTopics[0].reasons[0]}</p>
                <div className="mt-5">
                  <ButtonLink href={`/learn/${nextTopics[0].topic.id}`}>{t.todayStart}</ButtonLink>
                </div>
              </div>

              {/* Кольцо показывает прогресс именно по этой теме, а не общий:
                  рядом с кнопкой «начать» общая цифра ничего не сообщает. */}
              <ProgressRing
                value={state.topicProgress[nextTopics[0].topic.id]?.mastery ?? 0}
                caption={t.todayRing}
              />
            </div>
          </Card>
        </Reveal>
      )}

      {stats.totalAttempts === 0 ? (
        <div className="mt-6">
          {/* Иконка вынесена наружу: проп icon у EmptyState принимает строку. */}
          <div className="mb-3 flex justify-center text-ink-300">
            <Icon name="rocket" size={40} />
          </div>
          <EmptyState
           
            title={t.noDataTitle}
            description={t.noDataText}
            action={
              primarySubject && (
                <ButtonLink href={`/diagnostics/${primarySubject.id}`}>{t.startDiagnostics}</ButtonLink>
              )
            }
          />
        </div>
      ) : (
        <>
          {/*
            Метрики лежат прямо на фоне, а не в пяти одинаковых карточках.

            Когда каждый блок на экране это карточка одного веса, у страницы нет
            главного элемента: глаз не знает, за что зацепиться, и весь экран
            читается как заготовка. Здесь цифры разделены тонкими линиями,
            точность вынесена крупнее остальных, потому что это единственная
            метрика, по которой ученик судит, движется он или нет.
          */}
          <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 border-y border-ink-200 py-6 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-ink-200">
            <div className="lg:pr-8">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.statAccuracy}</p>
              <p className="mt-1 text-4xl font-semibold tabular-nums text-ink-900">
                {Math.round(stats.accuracy * 100)}
                <span className="text-2xl text-ink-300">%</span>
              </p>
              <p className="mt-1 text-xs text-ink-400">{t.correctHint(stats.correctAttempts)}</p>
            </div>

            <Metric label={t.statTasks} value={stats.totalAttempts} />
            <Metric
              label={t.statTopics}
              value={stats.topicsMastered}
              note={t.startedHint(stats.topicsStarted)}
            />
            <Metric label={t.statPoints} value={stats.points} note={t.pointsHint} />
            <Metric
              label={t.streakLabel}
              value={streakValue}
              note={t.streakHint(streakValue)}
              icon="flame"
              accent={streakValue > 0}
            />
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionHeader title={t.topicsTitle} description={t.topicsDescription} />
              {startedTopics.length === 0 ? (
                <Card>
                  <p className="text-sm text-ink-500">{t.topicsEmpty}</p>
                </Card>
              ) : (
                <ul className="space-y-3">
                  {startedTopics.map((progress) => {
                    const topic = getTopic(progress.topicId, state.customTopics);
                    if (!topic) return null;
                    return (
                      <Card
                        as="li"
                        key={progress.topicId}
                        className="transition-all duration-150 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="font-bold text-ink-900">{topic.title}</h3>
                          <span className="text-sm tabular-nums text-ink-400">
                            {t.solved(progress.correct, topic.tasks.length)}
                          </span>
                        </div>
                        <ProgressBar className="mt-3" label={t.mastered} value={progress.mastery} />
                        <div className="mt-4">
                          <ButtonLink href={`/learn/${topic.id}`} size="sm" variant="secondary">
                            {t.continue}
                          </ButtonLink>
                        </div>
                      </Card>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="space-y-4">
              {/* Слабые места по всем предметам ученика */}
              <Card>
                <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900">
                  <Icon name="target" size={20} className="text-brand-500" />
                  {t.weakTitle}
                </h2>
                <div className="mt-4 space-y-5">
                  {profile.subjectIds.map((subjectId) => {
                    const subject = getSubject(subjectId);
                    if (!subject) return null;
                    const weak = weakestSkills(subject, state, 3);
                    if (weak.length === 0) return null;

                    return (
                      <div key={subjectId}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
                          {subject.title}
                        </p>
                        <div className="space-y-3">
                          {weak.map((item) => (
                            <ProgressBar key={item.skill.id} label={item.skill.title} value={item.mastery} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Что делать дальше */}
              <Card>
                <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900">
                  <Icon name="compass" size={20} className="text-brand-500" />
                  {t.nextTitle}
                </h2>
                <ul className="mt-3 space-y-2">
                  {nextTopics.map((item) => (
                    <li key={item.topic.id}>
                      <a
                        href={`/learn/${item.topic.id}`}
                        className="block rounded-xl border border-ink-200 p-3 transition-all duration-150 hover:border-brand-300 hover:bg-brand-50 hover:shadow-[var(--shadow-lift)] focus-visible:ring-2 focus-visible:ring-brand-500"
                      >
                        <span className="block text-sm font-semibold text-ink-800">{item.topic.title}</span>
                        <span className="mt-0.5 block text-xs text-ink-400">{item.reasons[0]}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </Card>

              {upcomingEvent && (
                <Card>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900">
                    <Icon name="calendar" size={20} className="text-brand-500" />
                    {t.eventTitle}
                  </h2>
                  <p className="mt-2 font-semibold text-ink-800">{upcomingEvent.title}</p>
                  <p className="mt-1 text-sm text-brand-600">
                    {daysLeftUntil(upcomingEvent.startsAt) === 0
                      ? t.eventToday
                      : t.eventIn(daysLeftUntil(upcomingEvent.startsAt))}
                  </p>
                  <a href="/events" className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:underline">
                    {t.allEvents}
                  </a>
                </Card>
              )}

              {!profile.targetDate && (
                <Card className="border-accent-200 bg-accent-50">
                  <p className="text-sm text-accent-700">
                    {t.targetHintBefore}
                    <a href="/profile" className="font-semibold underline">
                      {t.targetHintLink}
                    </a>
                    {t.targetHintAfter}
                  </p>
                </Card>
              )}
            </div>
          </div>
        </>
      )}

      {/*
        Лента вынесена из ветки «есть прогресс» и стоит в самом низу.

        Внутри ветки её не видел как раз тот, кому она нужнее всего:
        у новичка ноль решённых заданий, и весь блок с метриками не
        рендерится — а увидеть, что тут кто-то живёт и что-то публикует,
        важнее всего именно в первый день.
      */}
      <div className="mt-12 border-t border-ink-200 pt-8">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900">
          <Icon name="sparkles" size={20} className="text-brand-500" />
          {t.feedTitle}
        </h2>
        <div className="mt-4">
          <ActivityFeed limit={5} />
        </div>
      </div>
    </div>
  );
}
