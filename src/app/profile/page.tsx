'use client';

/**
 * Профиль ученика: витрина, а не форма настроек.
 *
 * Раньше здесь лежали поля «класс / предметы / цель» и больше ничего —
 * то есть страница называлась профилем, но показывать другому человеку
 * на ней было нечего. Настройки уехали в /settings, а профиль стал тем,
 * ради чего его открывают: портфолио, баллы, место в рейтинге.
 *
 * Порядок блоков задан приоритетом пользователя: сначала кто ты и что
 * ты сделал (портфолио), и только потом внутренняя механика приложения.
 */

import { useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { useOwnStreakPoints, useSchoolLeaderboard } from '@/lib/supabase/leaderboard';
import { rankEntries } from '@/lib/leaderboard';
import { summarize } from '@/lib/personalization';
import { AchievementForm, PortfolioGrid, portfolioPoints, usePortfolio } from '@/components/Portfolio';
import { Avatar } from '@/components/Avatar';
import { SocialLinks } from '@/components/SocialLinks';
import { parseSocialLinks } from '@/lib/social';
import type { SocialLink } from '@/lib/social';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import { Reveal } from '@/components/motion';
import { TIER_LABEL, levelFromPoints, pointsWord } from '@/lib/level';
import { ButtonLink, Kicker, Skeleton } from '@/components/ui';
import { avatarPhotoUrl } from '@/lib/supabase/avatarPhoto';

/** Показатель в шапке профиля. */
function Stat({ icon, value, label }: { icon: IconName; value: number | string; label: string }) {
  return (
    <div className="rounded-[var(--radius-control)] border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
      <p className="flex items-center gap-2 text-2xl font-semibold tabular-nums text-white">
        <Icon name={icon} size={18} className="text-white/60" />
        {value}
      </p>
      <p className="mt-1 text-xs text-white/50">{label}</p>
    </div>
  );
}

const ROLE_TITLE: Record<string, string> = {
  student: 'Ученик',
  teacher: 'Учитель',
  admin: 'Администратор',
};


export default function ProfilePage() {
  const { state, hydrated } = useStore();
  const { profile: schoolProfile, schoolClass, loading } = useSchoolAuth();

  const [refreshKey, setRefreshKey] = useState(0);

  /*
    Ссылки держим в локальном состоянии и подменяем сразу при изменении,
    не дожидаясь ответа сервера: добавление ссылки — мелкое действие,
    и ждать сеть ради него незачем. Расхождение невозможно, потому что
    источник правды один и тот же профиль.
  */
  const [socialDraft, setSocialDraft] = useState<SocialLink[] | null>(null);
  const achievements = usePortfolio(schoolProfile?.id ?? null, refreshKey);
  const streakPoints = useOwnStreakPoints(schoolProfile?.id ?? null);
  const others = useSchoolLeaderboard(schoolProfile?.id ?? null);

  if (!hydrated || loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const socialLinks = socialDraft ?? parseSocialLinks(schoolProfile?.social_links);

  function saveSocialLinks(next: SocialLink[]) {
    setSocialDraft(next);
    fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ socialLinks: next }),
    }).catch(() => {
      // Сеть отвалилась: ссылка осталась на экране, но не сохранилась.
      // Ронять профиль из-за этого нельзя — человек просто повторит.
    });
  }

  const summary = summarize(state);
  const achievementPoints = portfolioPoints(achievements);
  const totalPoints = summary.points + achievementPoints + streakPoints;
  const name = schoolProfile?.name ?? 'Ученик';
  const isStudent = schoolProfile?.role === 'student';

  /*
    Место считается по тем же правилам, что и в рейтинге: своя строка
    добавляется к чужим и ранжируется вместе с ними. Иначе на профиле
    и в рейтинге у одного человека были бы разные места.
  */
  const myRank =
    isStudent && others
      ? (rankEntries([
          ...others,
          {
            id: schoolProfile.id,
            name,
            grade: (schoolProfile.grade ?? 0) as never,
            points: totalPoints,
            topicsMastered: summary.topicsMastered,
            streak: state.streak.current,
            isCurrentUser: true,
          },
        ]).find((entry) => entry.isCurrentUser)?.rank ?? null)
      : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {/* Шапка: кто это и чего добился */}
      <Reveal immediate>
        <div
          className="relative overflow-hidden rounded-[var(--radius-card)] p-8 shadow-[var(--shadow-float)] sm:p-10"
          style={{ background: 'var(--gradient-ink)' }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
            style={{ background: 'var(--gradient-brand)' }}
          />

          <div className="relative flex flex-wrap items-center gap-5">
            <Avatar
              name={name}
              colorId={schoolProfile?.avatar_color}
              emoji={schoolProfile?.avatar_emoji}
              photoUrl={avatarPhotoUrl(schoolProfile?.avatar_photo_path)}
              size={80}
            />
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">{name}</h1>
              <p className="mt-1 text-sm text-white/60">
                {ROLE_TITLE[schoolProfile?.role ?? 'student']}
                {schoolProfile?.grade ? ` · ${schoolProfile.grade} класс` : ''}
                {schoolClass ? ` · ${schoolClass.name}` : ''}
              </p>
            </div>

            <div className="ml-auto">
              <ButtonLink href="/settings" size="sm" variant="secondary">
                Настройки
              </ButtonLink>
            </div>
          </div>

          {isStudent && (
            <>
              <div className="relative mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat icon="trophy" value={totalPoints} label="всего баллов" />
                <Stat icon="medal" value={achievementPoints} label="за достижения" />
                <Stat icon="flame" value={state.streak.current} label="дней подряд" />
                <Stat icon="chart" value={myRank ? `#${myRank}` : '—'} label="место в школе" />
              </div>

              {/*
                Уровень под цифрами.

                Место в школе — единственная сравнительная метрика выше, и
                она бесполезна тому, кто стоит двадцатым: сдвинуть её тяжело,
                а значит она не мотивирует, а расстраивает. Уровень сравнивает
                ученика с ним же вчерашним и потому растёт у всех.
              */}
              {(() => {
                const level = levelFromPoints(totalPoints);
                return (
                  <div className="relative mt-4 rounded-[var(--radius-control)] border border-white/15 bg-white/5 px-5 py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-bold text-white">
                        Уровень {level.level}
                        <span className="ml-2 font-semibold text-white/50">{TIER_LABEL[level.tier]}</span>
                      </p>
                      {level.nextAt !== null && (
                        <p className="text-xs tabular-nums text-white/50">
                          до уровня {level.level + 1} — {level.nextAt - totalPoints}{' '}
                          {pointsWord(level.nextAt - totalPoints)}
                        </p>
                      )}
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      {/*
                        Минимум 3% ширины: пустая полоса читается как «ты ещё
                        не начинал», хотя уровень уже идёт. Цифра слева при
                        этом остаётся точной — подкрашена только полоса.
                      */}
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.max(3, Math.round(level.progress * 100))}%`,
                          background: 'var(--gradient-brand)',
                        }}
                      />
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </Reveal>

      {/*
        Контакты под шапкой.

        Ученик оставляет их не ради красоты: репетиторство, командные
        проекты и просьба помочь с темой начинаются с того, что человека
        находят где-то ещё. Свои ссылки редактируются здесь же — заводить
        ради трёх кнопок отдельный экран настроек не за чем.
      */}
      <div className="mt-6">
        <SocialLinks links={socialLinks} editable onChange={saveSocialLinks} />
      </div>

      {/* Портфолио — главное на странице */}
      {isStudent ? (
        <>
          <div className="mt-12 flex flex-wrap items-end justify-between gap-3">
            <div>
              <Kicker>Портфолио</Kicker>
              <p className="mt-2 max-w-xl text-sm text-ink-500">
                Олимпиады, конкурсы, проекты. Участие без места — тоже достижение: его тоже
                стоит добавить, оно приносит баллы.
              </p>
            </div>
          </div>

          <div className="mt-6">
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
              emptyText="Здесь появятся ваши олимпиады и конкурсы. Добавьте первое достижение — после проверки оно принесёт баллы и попадёт в ленту школы."
            />
          </div>
        </>
      ) : (
        <div className="mt-12 rounded-[var(--radius-card)] border border-ink-200 bg-white p-6">
          <p className="text-sm text-ink-500">
            Портфолио ведут ученики. В вашей роли доступны панель класса и публикация материалов.
          </p>
        </div>
      )}
    </div>
  );
}
