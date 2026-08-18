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
import { ButtonLink, Card, EmptyState, ProgressBar, SectionHeader, Skeleton, Stat } from '@/components/ui';

export default function DashboardPage() {
  const { state, hydrated } = useStore();
  const profile = state.profile;

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
          title="Профиль ещё не создан"
          description="Расскажите о себе — класс, предметы и цель, — и кабинет наполнится данными."
          action={<ButtonLink href="/onboarding">Создать профиль</ButtonLink>}
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
      <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">Привет, {profile.name.split(' ')[0]}</h1>
      <p className="mt-2 text-ink-500">
        {profile.grade} класс
        {daysLeft !== null && daysLeft >= 0 && ` · до цели осталось ${daysLeft} дн.`}
      </p>

      {stats.totalAttempts === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon="🚀"
            title="Пока нет данных о прогрессе"
            description="Пройди диагностику — она займёт 7 минут и покажет, с чего начать."
            action={
              primarySubject && (
                <ButtonLink href={`/diagnostics/${primarySubject.id}`}>Пройти диагностику</ButtonLink>
              )
            }
          />
        </div>
      ) : (
        <>
          {/* Метрики */}
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Решено заданий" value={stats.totalAttempts} />
            <Stat label="Точность" value={`${Math.round(stats.accuracy * 100)}%`} hint={`верно ${stats.correctAttempts}`} />
            <Stat label="Освоено тем" value={stats.topicsMastered} hint={`начато ${stats.topicsStarted}`} />
            <Stat label="Очки" value={stats.points} hint="за сложность заданий" />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionHeader title="Прогресс по темам" description="Темы, которые ты уже начал решать" />
              {startedTopics.length === 0 ? (
                <Card>
                  <p className="text-sm text-ink-500">Ты ещё не начал ни одной темы. Загляни в план.</p>
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
                            решено {progress.correct} из {topic.tasks.length}
                          </span>
                        </div>
                        <ProgressBar className="mt-3" label="Освоено" value={progress.mastery} />
                        <div className="mt-4">
                          <ButtonLink href={`/learn/${topic.id}`} size="sm" variant="secondary">
                            Продолжить
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
                <h2 className="text-lg font-bold text-ink-900">Слабые места</h2>
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
                <h2 className="text-lg font-bold text-ink-900">Продолжить обучение</h2>
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
                    Укажи дату экзамена в{' '}
                    <a href="/profile" className="font-semibold underline">
                      профиле
                    </a>
                    , и появится обратный отсчёт с подсказкой по темпу.
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
