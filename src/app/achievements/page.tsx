'use client';

/**
 * Достижения школы — общая лента.
 *
 * Своё портфолио отсюда убрано на отдельную страницу. Пока форма подачи и
 * общая лента стояли друг под другом, они путались: ученик искал в ленте
 * своё, не находил (оно ещё на проверке) и добавлял второй раз, а
 * отличались разделы только подписью над списком.
 *
 * Лента показывает всё, чем ученики делятся: подтверждённые школой
 * достижения и посты о проектах. Модерационный фильтр стоит во вью
 * activity_feed, а не здесь — неподтверждённое сюда структурно не
 * попадает.
 */

import { useStore } from '@/components/StoreProvider';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { ActivityFeed } from '@/components/ActivityFeed';
import { AchievementsNav } from '@/components/AchievementsNav';
import { Reveal } from '@/components/motion';
import { ButtonLink, Skeleton } from '@/components/ui';

export default function AchievementsPage() {
  const { hydrated } = useStore();
  const { profile: schoolProfile, loading } = useSchoolAuth();

  if (!hydrated || loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isStudent = schoolProfile?.role === 'student';

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Reveal immediate>
        <div
          className="relative overflow-hidden rounded-[var(--radius-card)] p-8 text-white shadow-[var(--shadow-float)] sm:p-10"
          style={{ background: 'var(--color-ink-900)' }}
        >
          <p className="text-[13px] font-medium text-white/60">Достижения</p>
          <h1 className="mt-2 text-3xl font-medium sm:text-4xl">Достижения школы</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
            Олимпиады, конкурсы и проекты учеников — по всей школе. Здесь только то, что школа
            подтвердила.
          </p>
        </div>
      </Reveal>

      <AchievementsNav showMine={isStudent} />

      <section className="mt-8">
        <ActivityFeed limit={20} />
      </section>

      {/* Учитель и администрация портфолио не ведут — им отсюда в рейтинг */}
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
