/**
 * Уровни по набранным баллам.
 *
 * Голое число баллов плохо отвечает на вопрос «я много набрал или мало?»:
 * 180 — это много? Уровень отвечает сразу, потому что сравнивает не с
 * другими учениками, а с самим собой вчерашним. Это важно для тех, кто
 * стоит в конце таблицы: место в рейтинге у них не изменится ещё долго,
 * а уровень растёт с первых баллов.
 *
 * Шаг между уровнями растёт линейно (10, 20, 30 …), то есть сумма для
 * уровня n равна 5·n·(n+1). Первые уровни берутся за пару достижений —
 * иначе шкала не отличалась бы от «есть баллы / нет баллов», — а дальше
 * замедляются, чтобы верхние уровни что-то значили.
 */

export type LevelTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface LevelInfo {
  /** Номер уровня, начиная с 1. */
  level: number;
  tier: LevelTier;
  /** Баллы, с которых начался текущий уровень. */
  levelStart: number;
  /** Баллы, нужные для следующего. null — уровень максимальный. */
  nextAt: number | null;
  /** Доля пути до следующего уровня, 0…1. На максимуме — 1. */
  progress: number;
}

/** Порог входа на уровень n (n ≥ 1). */
export function pointsForLevel(level: number): number {
  if (level <= 1) return 0;
  const n = level - 1;
  return 5 * n * (n + 1);
}

/** Последний уровень: выше шкала не растёт, иначе она бесконечна и пуста. */
export const MAX_LEVEL = 25;

function tierFor(level: number): LevelTier {
  if (level >= 20) return 'diamond';
  if (level >= 14) return 'platinum';
  if (level >= 9) return 'gold';
  if (level >= 4) return 'silver';
  return 'bronze';
}

export function levelFromPoints(points: number): LevelInfo {
  const safe = Number.isFinite(points) && points > 0 ? Math.floor(points) : 0;

  let level = 1;
  while (level < MAX_LEVEL && safe >= pointsForLevel(level + 1)) level += 1;

  const levelStart = pointsForLevel(level);
  const nextAt = level >= MAX_LEVEL ? null : pointsForLevel(level + 1);

  const progress =
    nextAt === null ? 1 : Math.min(1, Math.max(0, (safe - levelStart) / (nextAt - levelStart)));

  return { level, tier: tierFor(level), levelStart, nextAt, progress };
}

/**
 * Названия рангов.
 *
 * Одинаковы для всех трёх языков намеренно: ученики сравнивают карточки
 * между собой, и «Алмаз» рядом с «Diamond» выглядели бы как две разные
 * шкалы. Лежат здесь, а не на страницах, потому что рейтинг и профиль
 * обязаны показывать один и тот же ранг — две копии рано или поздно
 * разъедутся.
 */
export const TIER_LABEL: Record<LevelTier, string> = {
  bronze: 'Бронза',
  silver: 'Серебро',
  gold: 'Золото',
  platinum: 'Платина',
  diamond: 'Алмаз',
};

/**
 * Склонение слова «балл» по числу.
 *
 * «до уровня 3 — 3 балл.» читается как недоделанный интерфейс, а строка
 * стоит на видном месте профиля. Правило обычное для русского счёта:
 * 1 — балл, 2–4 — балла, остальное — баллов, с оговоркой на 11–14.
 */
export function pointsWord(n: number): string {
  const abs = Math.abs(n) % 100;
  if (abs >= 11 && abs <= 14) return 'баллов';
  const last = abs % 10;
  if (last === 1) return 'балл';
  if (last >= 2 && last <= 4) return 'балла';
  return 'баллов';
}
