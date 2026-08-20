'use client';

/**
 * Реальный школьный рейтинг из Supabase — раньше одноклассники были
 * захардкожены в data/leaderboard.ts. Каждая строка собирается из
 * student_progress (то, что реально прислал ProgressSync конкретного
 * ученика) плюс имя и класс из profiles.
 */

import { useEffect, useState } from 'react';
import { createClient } from './client';
import type { LeaderboardEntry } from '@/lib/leaderboard';
import type { Grade } from '@/lib/types';

interface ProgressRow {
  student_id: string;
  points: number;
  topics_mastered: number;
  streak_current: number;
}

export function useSchoolLeaderboard(excludeStudentId: string | null) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      /*
        Рейтинг складывается из двух источников, и оба обязательны.

        student_progress — баллы за решённые задания внутри продукта.
        portfolio_achievements — подтверждённые олимпиады и конкурсы; ради
        них рейтинг и затевался, потому что победа на городской олимпиаде
        значит для ученика больше, чем сотня решённых тестов.

        Отсюда же следует, что фильтр «решил хотя бы одно задание» больше
        не годится как условие попадания в рейтинг: победитель олимпиады,
        не трогавший тренажёр, обязан быть в списке.
      */
      const [{ data: progress }, { data: achievements }, { data: streaks }] = await Promise.all([
        supabase.from('student_progress').select('student_id, points, topics_mastered, streak_current'),
        supabase
          .from('portfolio_achievements')
          .select('student_id, points')
          .eq('status', 'approved'),
        // Третий источник баллов: бонусы за серии. Фильтровать по статусу
        // не нужно — в таблицу вообще не попадает ничего, кроме уже
        // начисленного триггером.
        supabase.from('streak_bonuses').select('student_id, points'),
      ]);

      if (cancelled) return;

      const progressById = Object.fromEntries(
        ((progress as ProgressRow[] | null) ?? []).map((row) => [row.student_id, row]),
      );

      /** Складывает баллы по ученику из произвольного источника. */
      function sumByStudent(rows: { student_id: string; points: number }[] | null): Record<string, number> {
        const totals: Record<string, number> = {};
        for (const row of rows ?? []) {
          totals[row.student_id] = (totals[row.student_id] ?? 0) + row.points;
        }
        return totals;
      }

      const achievementPointsById = sumByStudent(
        achievements as { student_id: string; points: number }[] | null,
      );
      const streakPointsById = sumByStudent(streaks as { student_id: string; points: number }[] | null);

      const ids = [
        ...new Set([
          ...Object.keys(progressById),
          ...Object.keys(achievementPointsById),
          ...Object.keys(streakPointsById),
        ]),
      ].filter((id) => id !== excludeStudentId);

      if (ids.length === 0) {
        setEntries([]);
        return;
      }

      const { data: profiles } = await supabase.from('profiles').select('id, name, grade').in('id', ids);
      if (cancelled) return;

      const profileById = Object.fromEntries((profiles ?? []).map((row) => [row.id, row]));

      setEntries(
        ids
          .filter((id) => profileById[id])
          .map((id) => {
            const p = progressById[id];
            const profile = profileById[id];
            return {
              id,
              name: profile.name,
              // Класс пока не собирается при входе через провайдера — 0
              // читается честнее, чем выдумывать значение.
              grade: (profile.grade ?? 0) as Grade,
              points:
                (p?.points ?? 0) + (achievementPointsById[id] ?? 0) + (streakPointsById[id] ?? 0),
              topicsMastered: p?.topics_mastered ?? 0,
              streak: p?.streak_current ?? 0,
            };
          })
          // Ученик без единого балла в списке не нужен: он попал бы туда
          // только за факт регистрации.
          .filter((entry) => entry.points > 0),
      );
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [excludeStudentId]);

  return entries;
}

/**
 * Бонусы за серии у одного ученика.
 *
 * Нужен отдельно, потому что своя строка в рейтинге собирается на клиенте
 * из локального прогресса (он свежее базы: ProgressSync шлёт снимок раз
 * в 4 секунды). Баллы за серии при этом живут только в базе — без этого
 * запроса собственное место считалось бы по другим правилам, чем чужие.
 */
export function useOwnStreakPoints(studentId: string | null): number {
  const [points, setPoints] = useState(0);

  useEffect(() => {
    if (!studentId) {
      setPoints(0);
      return;
    }
    const supabase = createClient();
    let cancelled = false;

    supabase
      .from('streak_bonuses')
      .select('points')
      .eq('student_id', studentId)
      .then(({ data }) => {
        if (cancelled) return;
        setPoints(((data as { points: number }[] | null) ?? []).reduce((sum, r) => sum + r.points, 0));
      });

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  return points;
}
