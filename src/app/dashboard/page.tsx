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
import { useStore } from '@/components/StoreProvider';
import type { Dict } from '@/lib/i18n';
import { ButtonLink, Card, EmptyState, ProgressBar, SectionHeader, Skeleton, Stat } from '@/components/ui';

/** Подписи кабинета на трёх языках. Ключи одинаковые — за этим следит TypeScript. */
const TEXT: Dict<{
  noProfileTitle: string;
  noProfileText: string;
  createProfile: string;
  greeting: (name: string) => string;
  gradeLabel: (grade: number) => string;
  daysLeft: (days: number) => string;
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
  topicsTitle: string;
  topicsDescription: string;
  topicsEmpty: string;
  solved: (n: number, total: number) => string;
  mastered: string;
  continue: string;
  weakTitle: string;
  nextTitle: string;
  targetHintBefore: string;
  targetHintLink: string;
  targetHintAfter: string;
}> = {
  ru: {
    noProfileTitle: 'Профиль ещё не создан',
    noProfileText: 'Расскажите о себе — класс, предметы и цель, — и кабинет наполнится данными.',
    createProfile: 'Создать профиль',
    greeting: (name) => `Привет, ${name}`,
    gradeLabel: (grade) => `${grade} класс`,
    daysLeft: (days) => `до цели осталось ${days} дн.`,
    noDataTitle: 'Пока нет данных о прогрессе',
    noDataText: 'Пройди диагностику — она займёт 7 минут и покажет, с чего начать.',
    startDiagnostics: 'Пройти диагностику',
    statTasks: 'Решено заданий',
    statAccuracy: 'Точность',
    correctHint: (n) => `верно ${n}`,
    statTopics: 'Освоено тем',
    startedHint: (n) => `начато ${n}`,
    statPoints: 'Очки',
    pointsHint: 'за сложность заданий',
    topicsTitle: 'Прогресс по темам',
    topicsDescription: 'Темы, которые ты уже начал решать',
    topicsEmpty: 'Ты ещё не начал ни одной темы. Загляни в план.',
    solved: (n, total) => `решено ${n} из ${total}`,
    mastered: 'Освоено',
    continue: 'Продолжить',
    weakTitle: 'Слабые места',
    nextTitle: 'Продолжить обучение',
    targetHintBefore: 'Укажи дату экзамена в ',
    targetHintLink: 'профиле',
    targetHintAfter: ', и появится обратный отсчёт с подсказкой по темпу.',
  },
  kk: {
    noProfileTitle: 'Профиль әлі құрылмаған',
    noProfileText: 'Өзің туралы айтып бер — сынып, пәндер және мақсат, — сонда кабинет деректерге толады.',
    createProfile: 'Профиль құру',
    greeting: (name) => `Сәлем, ${name}`,
    gradeLabel: (grade) => `${grade}-сынып`,
    daysLeft: (days) => `мақсатқа ${days} күн қалды`,
    noDataTitle: 'Әзірге прогресс туралы дерек жоқ',
    noDataText: 'Диагностикадан өт — ол 7 минут алады және неден бастау керегін көрсетеді.',
    startDiagnostics: 'Диагностикадан өту',
    statTasks: 'Шығарылған тапсырма',
    statAccuracy: 'Дәлдік',
    correctHint: (n) => `дұрыс ${n}`,
    statTopics: 'Меңгерілген тақырып',
    startedHint: (n) => `басталғаны ${n}`,
    statPoints: 'Ұпай',
    pointsHint: 'тапсырма күрделілігі үшін',
    topicsTitle: 'Тақырыптар бойынша прогресс',
    topicsDescription: 'Сен шығара бастаған тақырыптар',
    topicsEmpty: 'Сен әлі бірде-бір тақырыпты бастаған жоқсың. Жоспарға кіріп көр.',
    solved: (n, total) => `${total} ішінен ${n} шығарылды`,
    mastered: 'Меңгерілді',
    continue: 'Жалғастыру',
    weakTitle: 'Әлсіз тұстар',
    nextTitle: 'Оқуды жалғастыру',
    targetHintBefore: 'Емтихан күнін ',
    targetHintLink: 'профильде',
    targetHintAfter: ' көрсет — сонда кері санақ пен қарқын бойынша кеңес пайда болады.',
  },
  en: {
    noProfileTitle: 'No profile yet',
    noProfileText: 'Tell us about yourself — grade, subjects and goal — and the dashboard will fill up.',
    createProfile: 'Create profile',
    greeting: (name) => `Hi, ${name}`,
    gradeLabel: (grade) => `Grade ${grade}`,
    daysLeft: (days) => `${days} days left until your goal`,
    noDataTitle: 'No progress data yet',
    noDataText: 'Take the diagnostic — it takes 7 minutes and shows where to start.',
    startDiagnostics: 'Take the diagnostic',
    statTasks: 'Tasks solved',
    statAccuracy: 'Accuracy',
    correctHint: (n) => `${n} correct`,
    statTopics: 'Topics mastered',
    startedHint: (n) => `${n} started`,
    statPoints: 'Points',
    pointsHint: 'for task difficulty',
    topicsTitle: 'Progress by topic',
    topicsDescription: 'Topics you have already started',
    topicsEmpty: 'You have not started any topic yet. Take a look at your plan.',
    solved: (n, total) => `${n} of ${total} solved`,
    mastered: 'Mastered',
    continue: 'Continue',
    weakTitle: 'Weak spots',
    nextTitle: 'Keep learning',
    targetHintBefore: 'Set your exam date in your ',
    targetHintLink: 'profile',
    targetHintAfter: ' and a countdown with pacing tips will appear.',
  },
};

export default function DashboardPage() {
  const { state, hydrated } = useStore();
  const profile = state.profile;
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
        <EmptyState
          icon="🎒"
          title={t.noProfileTitle}
          description={t.noProfileText}
          action={<ButtonLink href="/onboarding">{t.createProfile}</ButtonLink>}
        />
      </div>
    );
  }

  const stats = summarize(state);
  const daysLeft = daysUntil(profile.targetDate);
  const primarySubject = getSubject(profile.subjectIds[0]);
  const nextTopics = primarySubject ? rankTopics(primarySubject, state, state.customTopics).slice(0, 3) : [];

  // Темы, к которым ученик уже прикасался.
  const startedTopics = Object.values(state.topicProgress).filter((item) => item.attempts > 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">{t.greeting(profile.name.split(' ')[0])}</h1>
      <p className="mt-2 text-ink-500">
        {t.gradeLabel(profile.grade)}
        {daysLeft !== null && daysLeft >= 0 && ` · ${t.daysLeft(daysLeft)}`}
      </p>

      {stats.totalAttempts === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon="🚀"
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
          {/* Метрики */}
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label={t.statTasks} value={stats.totalAttempts} />
            <Stat
              label={t.statAccuracy}
              value={`${Math.round(stats.accuracy * 100)}%`}
              hint={t.correctHint(stats.correctAttempts)}
            />
            <Stat label={t.statTopics} value={stats.topicsMastered} hint={t.startedHint(stats.topicsStarted)} />
            <Stat label={t.statPoints} value={stats.points} hint={t.pointsHint} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
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
                      <Card as="li" key={progress.topicId}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="font-bold text-ink-900">{topic.title}</h3>
                          <span className="text-sm text-ink-400">
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
                <h2 className="text-lg font-bold text-ink-900">{t.weakTitle}</h2>
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
                <h2 className="text-lg font-bold text-ink-900">{t.nextTitle}</h2>
                <ul className="mt-3 space-y-2">
                  {nextTopics.map((item) => (
                    <li key={item.topic.id}>
                      <a
                        href={`/learn/${item.topic.id}`}
                        className="block rounded-xl border border-ink-200 p-3 transition-colors hover:border-brand-300 hover:bg-brand-50"
                      >
                        <span className="block text-sm font-semibold text-ink-800">{item.topic.title}</span>
                        <span className="mt-0.5 block text-xs text-ink-400">{item.reasons[0]}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </Card>

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
    </div>
  );
}
