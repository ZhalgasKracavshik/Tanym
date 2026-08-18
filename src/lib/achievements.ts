/**
 * Достижения и серии занятий (геймификация).
 *
 * Ключевое решение: достижения НЕ хранятся как «выданные», а вычисляются
 * из состояния каждый раз заново. Плюс в том, что список нельзя рассинхронизировать
 * с реальным прогрессом: если ученик сбросил прогресс, ачивки исчезнут сами,
 * а не останутся висеть. В состоянии хранится только список уже показанных —
 * он нужен, чтобы поздравить один раз, а не при каждом открытии страницы.
 *
 * Зачем это в учебном продукте: возвращаемость. Сама по себе «правильная»
 * рекомендация не заставит подростка открыть приложение завтра, а незакрытая
 * серия и видимый прогресс — заставят.
 */

import type { AppState, Language } from './types';
import type { IconName } from '@/components/Icon';
import { summarize } from './personalization';

export interface AchievementDefinition {
  id: string;
  icon: IconName;
  title: Record<Language, string>;
  description: Record<Language, string>;
  /**
   * Прогресс к получению: сколько уже есть и сколько нужно.
   * Возвращаем именно числа, а не готовый процент, чтобы показать «7 из 10».
   */
  progress: (state: AppState) => { current: number; target: number };
}

export interface AchievementStatus extends AchievementDefinition {
  current: number;
  target: number;
  unlocked: boolean;
  /** Доля выполнения 0..1 — для полосы прогресса. */
  ratio: number;
}

/** Максимальная серия верных ответов подряд за всю историю попыток. */
function bestCorrectStreak(state: AppState): number {
  let best = 0;
  let run = 0;
  for (const attempt of state.attempts) {
    run = attempt.correct ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

/** Сколько разных предметов ученик уже трогал. */
function subjectsTouched(state: AppState): number {
  return new Set(state.attempts.map((attempt) => attempt.subjectId)).size;
}

/** Сколько тем освоено на 80% и выше. */
function topicsMastered(state: AppState): number {
  return Object.values(state.topicProgress).filter((topic) => topic.mastery >= 0.8).length;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first-step',
    icon: 'steps',
    title: { ru: 'Первый шаг', kk: 'Алғашқы қадам', en: 'First step' },
    description: {
      ru: 'Решить первое задание',
      kk: 'Алғашқы тапсырманы шешу',
      en: 'Solve your first task',
    },
    progress: (state) => ({ current: Math.min(state.attempts.length, 1), target: 1 }),
  },
  {
    id: 'diagnosed',
    icon: 'compass',
    title: { ru: 'Знай себя', kk: 'Өзіңді таны', en: 'Know yourself' },
    description: {
      ru: 'Пройти диагностику по любому предмету',
      kk: 'Кез келген пән бойынша диагностикадан өту',
      en: 'Complete a diagnostic in any subject',
    },
    progress: (state) => ({
      current: Math.min(Object.keys(state.diagnostics).length, 1),
      target: 1,
    }),
  },
  {
    id: 'ten-tasks',
    icon: 'target',
    title: { ru: 'Разогрев', kk: 'Қыздыру', en: 'Warm-up' },
    description: { ru: 'Решить 10 заданий', kk: '10 тапсырма шешу', en: 'Solve 10 tasks' },
    progress: (state) => ({ current: state.attempts.length, target: 10 }),
  },
  {
    id: 'fifty-tasks',
    icon: 'weight',
    title: { ru: 'Марафонец', kk: 'Марафоншы', en: 'Marathoner' },
    description: { ru: 'Решить 50 заданий', kk: '50 тапсырма шешу', en: 'Solve 50 tasks' },
    progress: (state) => ({ current: state.attempts.length, target: 50 }),
  },
  {
    id: 'streak-3',
    icon: 'flame',
    title: { ru: 'Три дня подряд', kk: 'Үш күн қатарынан', en: 'Three days straight' },
    description: {
      ru: 'Заниматься 3 дня без перерыва',
      kk: '3 күн үзіліссіз айналысу',
      en: 'Study 3 days in a row',
    },
    progress: (state) => ({ current: state.streak.longest, target: 3 }),
  },
  {
    id: 'streak-7',
    icon: 'bolt',
    title: { ru: 'Неделя силы', kk: 'Күш аптасы', en: 'Power week' },
    description: {
      ru: 'Заниматься 7 дней без перерыва',
      kk: '7 күн үзіліссіз айналысу',
      en: 'Study 7 days in a row',
    },
    progress: (state) => ({ current: state.streak.longest, target: 7 }),
  },
  {
    id: 'sniper',
    icon: 'crosshair',
    title: { ru: 'Снайпер', kk: 'Мерген', en: 'Sniper' },
    description: {
      ru: '10 верных ответов подряд',
      kk: 'Қатарынан 10 дұрыс жауап',
      en: '10 correct answers in a row',
    },
    progress: (state) => ({ current: bestCorrectStreak(state), target: 10 }),
  },
  {
    id: 'topic-master',
    icon: 'bookCheck',
    title: { ru: 'Тема закрыта', kk: 'Тақырып жабылды', en: 'Topic mastered' },
    description: {
      ru: 'Освоить любую тему на 80%',
      kk: 'Кез келген тақырыпты 80%-ға меңгеру',
      en: 'Master any topic to 80%',
    },
    progress: (state) => ({ current: Math.min(topicsMastered(state), 1), target: 1 }),
  },
  {
    id: 'polymath',
    icon: 'brain',
    title: { ru: 'Разносторонний', kk: 'Жан-жақты', en: 'Well-rounded' },
    description: {
      ru: 'Решать задания по трём предметам',
      kk: 'Үш пән бойынша тапсырма шешу',
      en: 'Solve tasks in three subjects',
    },
    progress: (state) => ({ current: subjectsTouched(state), target: 3 }),
  },
  {
    id: 'thousand-points',
    icon: 'gem',
    title: { ru: 'Тысяча', kk: 'Мың', en: 'One thousand' },
    description: { ru: 'Набрать 1000 очков', kk: '1000 ұпай жинау', en: 'Earn 1000 points' },
    progress: (state) => ({ current: summarize(state).points, target: 1000 }),
  },
];

/** Считает статус всех достижений для текущего состояния. */
export function evaluateAchievements(state: AppState): AchievementStatus[] {
  return ACHIEVEMENTS.map((definition) => {
    const { current, target } = definition.progress(state);
    return {
      ...definition,
      current,
      target,
      unlocked: current >= target,
      ratio: Math.min(1, target === 0 ? 0 : current / target),
    };
  });
}

/**
 * Достижения, которые уже получены, но ещё не показывались ученику.
 * Именно их страница подсвечивает поздравлением.
 */
export function freshlyUnlocked(state: AppState): AchievementStatus[] {
  return evaluateAchievements(state).filter(
    (item) => item.unlocked && !state.seenAchievements.includes(item.id),
  );
}
