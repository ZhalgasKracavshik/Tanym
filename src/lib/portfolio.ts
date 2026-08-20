/**
 * Портфолио достижений и шкала баллов.
 *
 * Зачем баллы вообще: рейтинг, который считает только решённые задания,
 * измеряет усидчивость в приложении, а не результаты ученика. Победа на
 * городской олимпиаде — это то, ради чего он учится, и она обязана весить
 * больше, чем сотня кликов по тестам.
 *
 * Шкала подобрана от опорной точки, названной заказчиком: первое место на
 * городской олимпиаде = 10 баллов. Остальное разведено вокруг неё так, чтобы
 * школьный уровень был заметно дешевле городского, а участие без места
 * всё-таки приносило что-то — иначе смысла заявлять его нет.
 */

import type { Language } from './types';

export type AchievementLevel = 'school' | 'city' | 'region' | 'national' | 'international';
export type AchievementPlace = 'first' | 'second' | 'third' | 'participant';
export type AchievementStatus = 'pending' | 'approved' | 'rejected';

export interface PortfolioAchievement {
  id: string;
  studentId: string;
  title: string;
  description: string;
  category: string;
  level: AchievementLevel;
  place: AchievementPlace;
  happenedOn: string;
  proofPath: string | null;
  status: AchievementStatus;
  points: number;
  createdAt: string;
}

/** Базовая стоимость уровня. Городской = 10 при первом месте. */
const LEVEL_BASE: Record<AchievementLevel, number> = {
  school: 4,
  city: 10,
  region: 20,
  national: 40,
  international: 80,
};

/**
 * Доля от базы за место.
 *
 * Участие оценивается в четверть: дойти до республиканского этапа и ничего
 * не занять — это всё равно результат, который стоит показать в портфолио.
 */
const PLACE_FACTOR: Record<AchievementPlace, number> = {
  first: 1,
  second: 0.7,
  third: 0.5,
  participant: 0.25,
};

/** Сколько баллов даёт достижение. Округление вверх, чтобы не было нулей. */
export function achievementPoints(level: AchievementLevel, place: AchievementPlace): number {
  return Math.ceil(LEVEL_BASE[level] * PLACE_FACTOR[place]);
}

export const LEVEL_TITLES: Record<AchievementLevel, Record<Language, string>> = {
  school: { ru: 'Школьный', kk: 'Мектеп', en: 'School' },
  city: { ru: 'Городской', kk: 'Қалалық', en: 'City' },
  region: { ru: 'Областной', kk: 'Облыстық', en: 'Region' },
  national: { ru: 'Республиканский', kk: 'Республикалық', en: 'National' },
  international: { ru: 'Международный', kk: 'Халықаралық', en: 'International' },
};

export const PLACE_TITLES: Record<AchievementPlace, Record<Language, string>> = {
  first: { ru: '1 место', kk: '1-орын', en: '1st place' },
  second: { ru: '2 место', kk: '2-орын', en: '2nd place' },
  third: { ru: '3 место', kk: '3-орын', en: '3rd place' },
  participant: { ru: 'Участие', kk: 'Қатысу', en: 'Participation' },
};

export const LEVELS: AchievementLevel[] = ['school', 'city', 'region', 'national', 'international'];
export const PLACES: AchievementPlace[] = ['first', 'second', 'third', 'participant'];

/** Медальный оттенок места — для плашки в портфолио и рейтинге. */
export function placeTone(place: AchievementPlace): 'gold' | 'silver' | 'bronze' | 'neutral' {
  if (place === 'first') return 'gold';
  if (place === 'second') return 'silver';
  if (place === 'third') return 'bronze';
  return 'neutral';
}
