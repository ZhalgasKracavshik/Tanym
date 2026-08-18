'use client';

/**
 * Достижения и серия занятий.
 *
 * Страница отвечает на вопрос «зачем возвращаться завтра». Персональный план
 * объясняет, ЧТО учить, а этот экран даёт причину не бросить: видимая серия
 * и незакрытые достижения работают там, где не работает рациональный аргумент.
 */

import { useEffect, useState } from 'react';
import { evaluateAchievements, freshlyUnlocked } from '@/lib/achievements';
import type { AchievementStatus } from '@/lib/achievements';
import { summarize } from '@/lib/personalization';
import { almatyDateIso, almatyYesterdayIso } from '@/lib/date';
import type { Dict } from '@/lib/i18n';
import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';
import { ButtonLink, Card, EmptyState, ProgressBar, Skeleton, Stat } from '@/components/ui';

const TEXT: Dict<{
  title: string;
  subtitle: string;
  noProfileTitle: string;
  noProfileText: string;
  createProfile: string;
  streakTitle: string;
  streakDays: (n: number) => string;
  streakActive: string;
  streakBroken: string;
  streakNone: string;
  longest: string;
  points: string;
  unlockedCount: string;
  newlyUnlocked: string;
  locked: string;
  done: string;
  ofTarget: (current: number, target: number) => string;
}> = {
  ru: {
    title: 'Достижения',
    subtitle: 'Серия занятий и награды за прогресс.',
    noProfileTitle: 'Сначала нужен профиль',
    noProfileText: 'Достижения начисляются за решённые задания, начни с диагностики.',
    createProfile: 'Создать профиль',
    streakTitle: 'Серия занятий',
    streakDays: (n) => (n === 1 ? '1 день' : n < 5 ? `${n} дня` : `${n} дней`),
    streakActive: 'Серия идёт, не прерывай её сегодня',
    streakBroken: 'Серия прервалась. Реши одно задание, чтобы начать заново',
    streakNone: 'Реши первое задание, чтобы начать серию',
    longest: 'Лучшая серия',
    points: 'Очки',
    unlockedCount: 'Получено',
    newlyUnlocked: 'Новое достижение!',
    locked: 'Ещё не получено',
    done: 'Получено',
    ofTarget: (current, target) => `${current} из ${target}`,
  },
  kk: {
    title: 'Жетістіктер',
    subtitle: 'Сабақ сериясы және прогресс үшін марапаттар.',
    noProfileTitle: 'Алдымен профиль қажет',
    noProfileText: 'Жетістіктер шешілген тапсырмалар үшін беріледі, диагностикадан баста.',
    createProfile: 'Профиль құру',
    streakTitle: 'Сабақ сериясы',
    streakDays: (n) => `${n} күн`,
    streakActive: 'Серия жалғасып жатыр, бүгін үзіп алма',
    streakBroken: 'Серия үзілді. Қайта бастау үшін бір тапсырма шеш',
    streakNone: 'Серияны бастау үшін алғашқы тапсырманы шеш',
    longest: 'Үздік серия',
    points: 'Ұпай',
    unlockedCount: 'Алынды',
    newlyUnlocked: 'Жаңа жетістік!',
    locked: 'Әлі алынған жоқ',
    done: 'Алынды',
    ofTarget: (current, target) => `${target} ішінен ${current}`,
  },
  en: {
    title: 'Achievements',
    subtitle: 'Your study streak and rewards for progress.',
    noProfileTitle: 'A profile is needed first',
    noProfileText: 'Achievements come from solving tasks, so start with the diagnostic.',
    createProfile: 'Create profile',
    streakTitle: 'Study streak',
    streakDays: (n) => (n === 1 ? '1 day' : `${n} days`),
    streakActive: 'Your streak is alive, keep it going today',
    streakBroken: 'Your streak ended. Solve one task to start again',
    streakNone: 'Solve your first task to start a streak',
    longest: 'Longest streak',
    points: 'Points',
    unlockedCount: 'Unlocked',
    newlyUnlocked: 'New achievement!',
    locked: 'Not yet unlocked',
    done: 'Unlocked',
    ofTarget: (current, target) => `${current} of ${target}`,
  },
};

export default function AchievementsPage() {
  const { state, hydrated, markAchievementsSeen } = useStore();
  const t = TEXT[state.language];

  /**
   * Поздравление держим в отдельном состоянии, а не вычисляем при каждом рендере.
   *
   * Причина: как только достижение помечено показанным, freshlyUnlocked() вернёт
   * пустой список, страница перерисуется — и баннер исчезнет через доли секунды,
   * раньше, чем ученик успеет его прочитать. Снимок делается один раз при заходе
   * и живёт до ухода со страницы.
   */
  const [fresh, setFresh] = useState<AchievementStatus[]>([]);

  useEffect(() => {
    if (!hydrated) return;
    const unlockedNow = freshlyUnlocked(state);
    if (unlockedNow.length === 0) return;

    setFresh(unlockedNow);
    markAchievementsSeen(unlockedNow.map((item) => item.id));
    // Намеренно только по hydrated: снимок нужен один раз за посещение страницы.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!state.profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        {/* Иконка стоит рядом: проп icon в EmptyState принимает строку,
            а строкой иконку из набора не передать. */}
        <div className="mb-3 flex justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-ink-200 bg-white text-ink-400">
            <Icon name="trophy" size={24} />
          </span>
        </div>
        <EmptyState
          title={t.noProfileTitle}
          description={t.noProfileText}
          action={<ButtonLink href="/onboarding">{t.createProfile}</ButtonLink>}
        />
      </div>
    );
  }

  const achievements = evaluateAchievements(state);
  const unlocked = achievements.filter((item) => item.unlocked).length;
  const stats = summarize(state);

  // Серия считается живой, если последняя активность была сегодня или вчера.
  const last = state.streak.lastActiveDate;
  const streakAlive = last === almatyDateIso() || last === almatyYesterdayIso();
  const streakValue = streakAlive ? state.streak.current : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">{t.title}</h1>
      <p className="mt-2 text-ink-500">{t.subtitle}</p>

      {/* Поздравление с новыми достижениями */}
      {fresh.length > 0 && (
        <div className="mt-6 rounded-2xl border border-accent-200 bg-accent-50 p-5">
          <p className="flex items-center gap-2 font-bold text-accent-700">
            <Icon name="sparkles" size={18} />
            {t.newlyUnlocked}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {fresh.map((item) => (
              <span
                key={item.id}
                className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-ink-800"
              >
                <Icon name={item.icon} size={18} className="text-accent-600" />
                {item.title[state.language]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Серия занятий */}
      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-ink-400">{t.streakTitle}</p>
            <p className="mt-1 flex items-center gap-2">
              <Icon
                name="flame"
                size={36}
                className={streakValue > 0 ? 'text-accent-500' : 'text-ink-300'}
              />
              <span className="text-4xl font-black tabular-nums text-ink-900">
                {t.streakDays(streakValue)}
              </span>
            </p>
            <p className="mt-2 text-sm text-ink-500">
              {streakValue > 0 ? t.streakActive : state.streak.longest > 0 ? t.streakBroken : t.streakNone}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Stat label={t.longest} value={state.streak.longest} />
            <Stat label={t.points} value={stats.points} />
            <Stat label={t.unlockedCount} value={`${unlocked}/${achievements.length}`} />
          </div>
        </div>
      </Card>

      {/* Сетка достижений */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {achievements.map((item) => (
          <Card
            key={item.id}
            className={item.unlocked ? 'border-success-500/40 bg-success-50' : ''}
          >
            <div className="flex items-start gap-3">
              {/* Незаработанные показываем блёклыми — видно, что это цель, а не награда */}
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  item.unlocked ? 'bg-success-500/10 text-success-700' : 'bg-ink-100 text-ink-400'
                }`}
              >
                <Icon name={item.icon} size={24} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold text-ink-900">{item.title[state.language]}</h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      item.unlocked ? 'bg-success-500 text-white' : 'bg-ink-100 text-ink-500'
                    }`}
                  >
                    {item.unlocked ? t.done : t.locked}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-500">{item.description[state.language]}</p>

                {!item.unlocked && (
                  <div className="mt-3">
                    <ProgressBar value={item.ratio} showPercent={false} />
                    <p className="mt-1 text-xs tabular-nums text-ink-400">
                      {t.ofTarget(item.current, item.target)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
