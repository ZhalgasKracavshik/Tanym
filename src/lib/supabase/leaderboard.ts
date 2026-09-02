'use client';

/**
 * Реальный школьный рейтинг из Supabase — раньше одноклассники были
 * захардкожены в data/leaderboard.ts. Каждая строка собирается из
 * verified_progress (попытки, правильность которых определил сервер)
 * плюс имя и класс из profiles.
 */

import { useEffect, useState } from 'react';
import { createClient } from './client';
import type { LeaderboardEntry } from '@/lib/leaderboard';
import type { Grade } from '@/lib/types';
import { avatarPhotoUrl } from '@/lib/supabase/avatarPhoto';

interface ProgressRow {
  student_id: string;
  points: number;
  topics_touched: number;
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

        verified_progress — баллы за задания, решённые внутри продукта.
        portfolio_achievements — подтверждённые олимпиады и конкурсы; ради
        них рейтинг и затевался, потому что победа на городской олимпиаде
        значит для ученика больше, чем сотня решённых тестов.

        Отсюда же следует, что фильтр «решил хотя бы одно задание» больше
        не годится как условие попадания в рейтинг: победитель олимпиады,
        не трогавший тренажёр, обязан быть в списке.
      */
      const [{ data: progress }, { data: achievements }, { data: streaks }] = await Promise.all([
        /*
          Баллы берутся из verified_progress, а не из student_progress.

          Разница принципиальная. student_progress присылает браузер, и
          выставить себе там любое число можно из консоли за полминуты —
          для продукта, чьё единственное обещание в честном измерении
          навыка, это обесценивало обещание целиком. verified_progress
          считается базой из попыток, каждую из которых проверил сервер.

          Баллы даются только за первое верное решение задания, поэтому
          перерешивание с уже известными ответами больше ничего не даёт.
        */
        supabase.from('verified_progress').select('student_id, points, topics_touched, streak_current'),
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

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, grade, avatar_color, avatar_photo_path, leaderboard_anonymous')
        .in('id', ids);
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
              topicsMastered: p?.topics_touched ?? 0,
              streak: p?.streak_current ?? 0,
              avatarColor: profile.avatar_color,
              avatarPhoto: avatarPhotoUrl(profile.avatar_photo_path),
              /*
                Анонимность читается из базы, а не из локального состояния.

                Раньше признак проставлялся только на строке самого ученика,
                а всем остальным имена приходили из базы как есть — то есть
                переключатель прятал имя от владельца и ни от кого больше,
                хотя подпись обещала обратное одноклассникам.
              */
              anonymous: profile.leaderboard_anonymous ?? false,
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

export interface VerifiedProgress {
  points: number;
  topicsMastered: number;
  streak: number;
}

const EMPTY_VERIFIED: VerifiedProgress = { points: 0, topicsMastered: 0, streak: 0 };

/**
 * Проверенный прогресс одного ученика — для своей строки в рейтинге.
 *
 * Нужен ровно затем же, зачем useOwnStreakPoints: своя строка собирается
 * на странице отдельно от общего запроса, и если бы она брала баллы из
 * локального состояния, собственное место считалось бы по другим правилам,
 * чем чужие. После перехода рейтинга на verified_progress своя строка
 * обязана считаться оттуда же.
 *
 * Пока ученик решает задания, число тут отстаёт от локального счётчика на
 * один запрос — это плата за то, что оно не подделывается.
 */
export function useVerifiedProgress(studentId: string | null): VerifiedProgress {
  const [loaded, setLoaded] = useState<{ studentId: string; value: VerifiedProgress } | null>(null);

  useEffect(() => {
    if (!studentId) return;
    const supabase = createClient();
    let cancelled = false;

    supabase
      .from('verified_progress')
      .select('points, topics_touched, streak_current')
      .eq('student_id', studentId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const row = data as { points: number; topics_touched: number; streak_current: number } | null;
        setLoaded({
          studentId,
          value: row
            ? { points: row.points, topicsMastered: row.topics_touched, streak: row.streak_current }
            : EMPTY_VERIFIED,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  return loaded?.studentId === studentId ? loaded.value : EMPTY_VERIFIED;
}

/**
 * Бонусы за серии у одного ученика.
 *
 * Нужен отдельно, потому что своя строка в рейтинге собирается на странице
 * отдельно от общего запроса. Баллы за серии живут только в базе — без
 * этого запроса собственное место считалось бы по другим правилам, чем
 * чужие.
 */
export function useOwnStreakPoints(studentId: string | null): number {
  /*
    Сумма хранится вместе с учеником, которому принадлежит.

    Раньше сброс на ноль делался присваиванием прямо в теле эффекта, и
    это давало лишний проход рендера на каждый выход из аккаунта. Хуже
    того, до этого прохода на экране оставалась сумма ПРЕДЫДУЩЕГО
    ученика: между сменой studentId и срабатыванием эффекта проходил
    целый кадр. Сравнение с текущим studentId убирает и то, и другое —
    чужая сумма не может быть показана по построению.
  */
  const [loaded, setLoaded] = useState<{ studentId: string; points: number } | null>(null);

  useEffect(() => {
    if (!studentId) return;
    const supabase = createClient();
    let cancelled = false;

    supabase
      .from('streak_bonuses')
      .select('points')
      .eq('student_id', studentId)
      .then(({ data }) => {
        if (cancelled) return;
        const points = ((data as { points: number }[] | null) ?? []).reduce((sum, r) => sum + r.points, 0);
        setLoaded({ studentId, points });
      });

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  return loaded?.studentId === studentId ? loaded.points : 0;
}
