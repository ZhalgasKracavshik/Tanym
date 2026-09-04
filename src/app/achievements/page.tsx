'use client';

/**
 * Достижения школы: портфолио и лента, а не внутренние значки.
 *
 * Раньше страница начиналась с серии дней и очков за решённые задания —
 * то есть с внутренней механики приложения. Теперь порядок обратный:
 * сначала настоящие достижения (олимпиады, конкурсы, проекты) и лента
 * школы, а серии и значки ушли вниз как подробность. Причина простая:
 * ученик приходит сюда посмотреть, кто чего добился, а не сколько
 * кликов он сделал в тренажёре.
 */

import { useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { useOwnStreakPoints, useSchoolLeaderboard, useVerifiedProgress } from '@/lib/supabase/leaderboard';
import { rankEntries } from '@/lib/leaderboard';
import { evaluateAchievements } from '@/lib/achievements';
import { summarize } from '@/lib/personalization';
import {
  AchievementForm,
  PortfolioGrid,
  portfolioPoints,
  usePortfolio,
  useSchoolPortfolio,
} from '@/components/Portfolio';
import { ActivityFeed } from '@/components/ActivityFeed';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import { Reveal } from '@/components/motion';
import { ButtonLink, Kicker, ProgressBar, RailRow, Skeleton } from '@/components/ui';

/** Крупный показатель в тёмной шапке. */
function HeroStat({ icon, value, label }: { icon: IconName; value: number | string; label: string }) {
  return (
    <div className="rounded-[var(--radius-control)] border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
      <p className="flex items-center gap-2 text-2xl font-medium tabular-nums text-white">
        <Icon name={icon} size={18} className="text-white/60" />
        {value}
      </p>
      <p className="mt-1 text-xs text-white/50">{label}</p>
    </div>
  );
}

export default function AchievementsPage() {
  const { state, hydrated } = useStore();
  const { profile: schoolProfile, loading } = useSchoolAuth();

  const [refreshKey, setRefreshKey] = useState(0);
  const achievements = usePortfolio(schoolProfile?.id ?? null, refreshKey);
  const streakPoints = useOwnStreakPoints(schoolProfile?.id ?? null);
  const verified = useVerifiedProgress(schoolProfile?.id ?? null);
  /*
    Учитель и администрация смотрят достижения всей школы. Условие стоит
    здесь, а не внутри хука, чтобы ученик не отправлял лишний запрос за
    данными, которых всё равно не увидит.
  */
  const isStaff = schoolProfile?.role === 'teacher' || schoolProfile?.role === 'admin';
  const schoolPortfolio = useSchoolPortfolio(isStaff, refreshKey);
  const others = useSchoolLeaderboard(schoolProfile?.id ?? null);

  if (!hydrated || loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const summary = summarize(state);
  const achievementPoints = portfolioPoints(achievements);
  /*
    Баллы за тренажёр берутся из проверенных сервером попыток, а не из
    локального состояния.

    Локальное состояние живёт в браузере, поэтому на другом устройстве
    оно пустое: ученик открывал рейтинг и видел там свои очки, открывал
    эту страницу — и видел ноль. Один человек, две цифры на соседних
    вкладках. Считать надо тем же источником, что и рейтинг, иначе
    расхождение неизбежно.
  */
  const totalPoints = verified.points + achievementPoints + streakPoints;
  const isStudent = schoolProfile?.role === 'student';

  /*
    Место считается ровно так же, как в рейтинге: своя строка добавляется
    к чужим и ранжируется вместе с ними. Иначе на разных страницах у
    одного человека оказалось бы разное место.
  */
  const myRank =
    isStudent && others
      ? (rankEntries([
          ...others,
          {
            id: schoolProfile.id,
            name: schoolProfile.name,
            grade: (schoolProfile.grade ?? 0) as never,
            points: totalPoints,
            topicsMastered: verified.topicsMastered,
            streak: verified.streak,
            isCurrentUser: true,
          },
        ]).find((entry) => entry.isCurrentUser)?.rank ?? null)
      : null;

  // Внутренние значки: считаются из локального прогресса, а не из базы.
  const badges = evaluateAchievements(state);
  const unlockedCount = badges.filter((item) => item.unlocked).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* Шапка: чего добился именно ты */}
      <Reveal immediate>
        <div
          className="relative overflow-hidden rounded-[var(--radius-card)] p-8 text-white shadow-[var(--shadow-float)] sm:p-10"
          style={{ background: 'var(--color-ink-900)' }}
        >
          <div className="relative">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/50">Достижения</p>
            <h1 className="mt-2 text-3xl font-medium sm:text-4xl">
              {isStudent ? 'Твоё портфолио' : 'Достижения школы'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
              {isStudent
                ? 'Олимпиады, конкурсы и проекты приносят баллы в рейтинг школы. Участие без места — тоже достижение.'
                : 'Здесь ученики публикуют олимпиады, конкурсы и проекты.'}
            </p>

            {isStudent && (
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <HeroStat icon="chart" value={myRank ? `#${myRank}` : '—'} label="место в школе" />
                <HeroStat icon="trophy" value={totalPoints} label="всего баллов" />
                <HeroStat icon="medal" value={achievementPoints} label="за достижения" />
                <HeroStat icon="flame" value={streakPoints} label="за серии" />
              </div>
            )}
          </div>
        </div>
      </Reveal>

      {/* Портфолио — главное на странице */}
      {isStudent && (
        <section className="mt-12">
          <Kicker>Моё портфолио</Kicker>
          <div className="mt-4">
            <AchievementForm
              studentId={schoolProfile.id}
              language={state.language}
              onSubmitted={() => setRefreshKey((key) => key + 1)}
            />
          </div>
          <div className="mt-6">
            <PortfolioGrid
              items={achievements ?? []}
              language={state.language}
              emptyText="Добавьте первое достижение — после проверки оно принесёт баллы и появится в ленте школы."
            />
          </div>
        </section>
      )}

      {/* Портфолио школы — для учителя и администрации */}
      {isStaff && (
        <section className="mt-12">
          <Kicker>Достижения учеников</Kicker>
          <p className="mt-2 text-sm text-ink-500">
            Подтверждённые олимпиады, конкурсы и проекты — по всей школе.
          </p>
          <div className="mt-5">
            {schoolPortfolio === null ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <PortfolioGrid
                items={schoolPortfolio.map((row) => ({
                  ...row.achievement,
                  // Имя автора идёт в заголовок карточки: без него список
                  // достижений школы не отвечает на вопрос «чьё это».
                  title: `${row.achievement.title} — ${row.author}`,
                }))}
                language={state.language}
                emptyText="Пока ни одно достижение не подтверждено."
              />
            )}
          </div>
        </section>
      )}

      {/* Лента школы */}
      <section className="mt-14">
        <Kicker>Лента школы</Kicker>
        <p className="mt-2 text-sm text-ink-500">
          Олимпиады, конкурсы и проекты, которыми делятся ученики.
        </p>
        <div className="mt-5">
          <ActivityFeed limit={20} refreshKey={refreshKey} />
        </div>
      </section>

      {/*
        Значки за работу в тренажёре — внизу и намеренно спокойнее.
        Это внутренняя механика продукта, а не результат, который ученик
        покажет при поступлении.
      */}
      {isStudent && (
        <section className="mt-14 border-t border-ink-200 pt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <Kicker>Значки за занятия</Kicker>
              <p className="mt-2 text-sm text-ink-500">
                Начисляются автоматически за работу в тренажёре.
              </p>
            </div>
            <p className="text-sm font-semibold tabular-nums text-ink-400">
              {unlockedCount} из {badges.length}
            </p>
          </div>

          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {badges.map((badge) => (
              <li key={badge.id}>
                <RailRow tone={badge.unlocked ? 'success' : 'neutral'}>
                  <div className="flex items-start gap-3">
                    <Icon
                      name={badge.icon}
                      size={20}
                      className={badge.unlocked ? 'text-success-700' : 'text-ink-300'}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink-900">{badge.title[state.language]}</p>
                      <p className="mt-1 text-xs text-ink-500">{badge.description[state.language]}</p>
                      {!badge.unlocked && (
                        <div className="mt-2 max-w-[16rem]">
                          <ProgressBar value={badge.ratio} />
                        </div>
                      )}
                    </div>
                  </div>
                </RailRow>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Учитель и админ портфолио не ведут, но ленту школы видят */}
      {!isStudent && (
        <div className="mt-10">
          <ButtonLink href="/leaderboard" variant="secondary">
            Открыть рейтинг школы
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
