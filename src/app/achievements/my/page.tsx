'use client';

/**
 * Своё портфолио: что добавил ты, и в каком оно состоянии.
 *
 * Отделено от общей ленты школы. Пока они лежали на одной странице,
 * ученик искал своё среди чужого, не находил (оно ещё на проверке) и
 * добавлял второй раз — а разделы отличались только подписью.
 *
 * Здесь же остались значки за тренажёр: это тоже про тебя, а не про
 * школу, — но ниже и намеренно спокойнее. Значок за серию дней не то, что
 * ученик покажет при поступлении.
 */

import { useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { useOwnStreakPoints, useSchoolLeaderboard, useVerifiedProgress } from '@/lib/supabase/leaderboard';
import { rankEntries } from '@/lib/leaderboard';
import { evaluateAchievements } from '@/lib/achievements';
import { AchievementForm, PortfolioGrid, portfolioPoints, usePortfolio } from '@/components/Portfolio';
import { AchievementsNav } from '@/components/AchievementsNav';
import { StudentOnlyNotice } from '@/components/StudentOnlyNotice';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import { Reveal } from '@/components/motion';
import { Kicker, ProgressBar, RailRow, Skeleton } from '@/components/ui';

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

export default function MyPortfolioPage() {
  const { state, hydrated } = useStore();
  const { profile: schoolProfile, loading } = useSchoolAuth();

  const [refreshKey, setRefreshKey] = useState(0);
  const achievements = usePortfolio(schoolProfile?.id ?? null, refreshKey);
  const streakPoints = useOwnStreakPoints(schoolProfile?.id ?? null);
  const verified = useVerifiedProgress(schoolProfile?.id ?? null);
  const others = useSchoolLeaderboard(schoolProfile?.id ?? null);

  if (!hydrated || loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (schoolProfile && schoolProfile.role !== 'student') {
    return <StudentOnlyNotice role={schoolProfile.role} />;
  }

  const achievementPoints = portfolioPoints(achievements);
  /*
    Баллы за тренажёр берутся из проверенных сервером попыток, а не из
    локального состояния: оно живёт в браузере и на другом устройстве
    пустое. Считать надо тем же источником, что и рейтинг, иначе у одного
    человека на соседних вкладках окажутся разные цифры.
  */
  const totalPoints = verified.points + achievementPoints + streakPoints;

  /*
    Место считается ровно так же, как в рейтинге: своя строка добавляется
    к чужим и ранжируется вместе с ними.
  */
  const myRank =
    schoolProfile && others
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

  const badges = evaluateAchievements(state);
  const unlockedCount = badges.filter((item) => item.unlocked).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Reveal immediate>
        <div
          className="relative overflow-hidden rounded-[var(--radius-card)] p-8 text-white shadow-[var(--shadow-float)] sm:p-10"
          style={{ background: 'var(--color-ink-900)' }}
        >
          <div className="relative">
            <p className="text-[13px] font-medium text-white/60">Достижения</p>
            <h1 className="mt-2 text-3xl font-medium sm:text-4xl">Моё портфолио</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
              Олимпиады, конкурсы и проекты приносят баллы в рейтинг школы. Участие без места — тоже
              достижение.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <HeroStat icon="chart" value={myRank ? `#${myRank}` : '—'} label="место в школе" />
              <HeroStat icon="trophy" value={totalPoints} label="всего баллов" />
              <HeroStat icon="medal" value={achievementPoints} label="за достижения" />
              <HeroStat icon="flame" value={streakPoints} label="за серии" />
            </div>
          </div>
        </div>
      </Reveal>

      <AchievementsNav showMine />

      <section className="mt-8">
        <AchievementForm
          studentId={schoolProfile?.id ?? ''}
          language={state.language}
          onSubmitted={() => setRefreshKey((key) => key + 1)}
        />
        <div className="mt-6">
          <PortfolioGrid
            items={achievements ?? []}
            language={state.language}
            emptyText="Добавьте первое достижение — после проверки оно принесёт баллы и появится в ленте школы."
          />
        </div>
      </section>

      <section className="mt-14 border-t border-ink-200 pt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Kicker>Значки за занятия</Kicker>
            <p className="mt-2 text-sm text-ink-500">Начисляются автоматически за работу в тренажёре.</p>
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
    </div>
  );
}
