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
      const { data: progress } = await supabase
        .from('student_progress')
        .select('student_id, points, topics_mastered, streak_current')
        .gt('total_attempts', 0);

      if (cancelled || !progress) return;

      const ids = progress.map((row: ProgressRow) => row.student_id).filter((id) => id !== excludeStudentId);
      if (ids.length === 0) {
        setEntries([]);
        return;
      }

      const { data: profiles } = await supabase.from('profiles').select('id, name, grade').in('id', ids);
      if (cancelled) return;

      const profileById = Object.fromEntries((profiles ?? []).map((row) => [row.id, row]));
      const byId = Object.fromEntries(progress.map((row: ProgressRow) => [row.student_id, row]));

      setEntries(
        ids
          .filter((id) => profileById[id])
          .map((id) => {
            const p = byId[id] as ProgressRow;
            const profile = profileById[id];
            return {
              id,
              name: profile.name,
              // Класс пока не собирается при регистрации через Google — 0
              // читается честнее, чем выдумывать значение.
              grade: (profile.grade ?? 0) as Grade,
              points: p.points,
              topicsMastered: p.topics_mastered,
              streak: p.streak_current,
            };
          }),
      );
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [excludeStudentId]);

  return entries;
}
