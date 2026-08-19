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
import { ButtonLink, EmptyState, ProgressBar, RailRow, Skeleton } from '@/components/ui';

const TEXT: Dict<{
  title: string;
  noProfileTitle: string;
  noProfileText: string;
  createProfile: string;
  streakTitle: string;
  streakUnit: (n: number) => string;
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
    noProfileTitle: 'Сначала нужен профиль',
    noProfileText: 'Достижения начисляются за решённые задания, начни с диагностики.',
    createProfile: 'Создать профиль',
    streakTitle: 'Серия занятий',
    streakUnit: (n) => (n === 1 ? 'день' : n > 1 && n < 5 ? 'дня' : 'дней'),
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
    noProfileTitle: 'Алдымен профиль қажет',
    noProfileText: 'Жетістіктер шешілген тапсырмалар үшін беріледі, диагностикадан баста.',
    createProfile: 'Профиль құру',
    streakTitle: 'Сабақ сериясы',
    streakUnit: () => 'күн',
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
    noProfileTitle: 'A profile is needed first',
    noProfileText: 'Achievements come from solving tasks, so start with the diagnostic.',
    createProfile: 'Create profile',
    streakTitle: 'Study streak',
    streakUnit: (n) => (n === 1 ? 'day' : 'days'),
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
      {/*
        Заголовок без описания, сразу серия. Ученик приходит сюда посмотреть,
        сколько дней он держится, а не прочитать, что такое достижения.
      */}
      <h1 className="text-3xl font-semibold text-ink-900 sm:text-4xl">{t.title}</h1>

      {/*
        Серия это главный элемент экрана, поэтому она набрана в несколько раз
        крупнее всего остального и лежит прямо на фоне между волосяными линиями.
        Раньше она сидела в карточке рядом с тремя одинаковыми плитками метрик
        и по весу ничем от них не отличалась.
      */}
      <div className="mt-10 flex flex-wrap items-end justify-between gap-x-10 gap-y-8 border-y border-ink-200 py-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.streakTitle}</p>
          <p className="mt-2 flex items-end gap-3">
            <Icon
              name="flame"
              size={52}
              className={streakValue > 0 ? 'text-accent-500' : 'text-ink-300'}
            />
            <span className="text-6xl font-semibold leading-none tabular-nums text-ink-900 sm:text-7xl">
              {streakValue}
            </span>
            <span className="text-xl text-ink-400">{t.streakUnit(streakValue)}</span>
          </p>
          <p className="mt-2 text-sm text-ink-500">
            {streakValue > 0 ? t.streakActive : state.streak.longest > 0 ? t.streakBroken : t.streakNone}
          </p>
        </div>

        {/* Второстепенные показатели: те же цифры, но заметно мельче серии */}
        <div className="grid grid-cols-3 gap-x-8 sm:divide-x sm:divide-ink-200">
          <div className="sm:pr-8">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.longest}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-ink-900">{state.streak.longest}</p>
          </div>
          <div className="sm:px-8">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.points}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-ink-900">{stats.points}</p>
          </div>
          <div className="sm:pl-8">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.unlockedCount}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-ink-900">
              {unlocked}/{achievements.length}
            </p>
          </div>
        </div>
      </div>

      {/* Поздравление с новыми достижениями стоит после серии: иначе экран
          открывался бы разным содержимым в зависимости от дня. */}
      {fresh.length > 0 && (
        <div className="mt-10 rounded-2xl border border-accent-200 bg-accent-50 p-5">
          <p className="flex items-center gap-2 font-bold text-accent-700">
            <Icon name="sparkles" size={18} />
            {t.newlyUnlocked}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
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

      {/*
        Достижения это перечисление, а не набор самодостаточных единиц, поэтому
        они переехали с карточек на строки с рейкой. Цвет рейки кодирует
        состояние, но рядом всегда стоит подпись словами.
      */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {achievements.map((item) => (
          <RailRow
            key={item.id}
            tone={item.unlocked ? 'success' : 'neutral'}
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
                <p className="mt-2 text-sm text-ink-500">{item.description[state.language]}</p>

                {!item.unlocked && (
                  <div className="mt-4">
                    <ProgressBar value={item.ratio} showPercent={false} />
                    <p className="mt-2 text-xs tabular-nums text-ink-400">
                      {t.ofTarget(item.current, item.target)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </RailRow>
        ))}
      </div>
    </div>
  );
}
