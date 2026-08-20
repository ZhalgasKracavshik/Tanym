'use client';

/**
 * Синхронизация прогресса ученика в Supabase.
 *
 * Считает не сам — берёт уже готовый результат движка персонализации
 * (computeSkillMastery, summarize) и просто отправляет снимок в базу.
 * Два источника правды здесь не заводим: локальный движок остаётся
 * единственным местом, где мастерство реально вычисляется, а строка
 * в student_progress — это его снимок для учителя и школьного рейтинга.
 *
 * Отправка идёт с задержкой в 4 секунды после последнего изменения состояния,
 * а не на каждый клик — иначе один прогон диагностики из 8 заданий выслал бы
 * восемь отдельных запросов туда, где хватило бы одного.
 */

import { useEffect, useRef } from 'react';
import { useStore } from './StoreProvider';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { createClient } from '@/lib/supabase/client';
import { computeSkillMastery, summarize } from '@/lib/personalization';

const SYNC_DELAY_MS = 4000;

export function ProgressSync() {
  const { state, hydrated } = useStore();
  const { profile } = useSchoolAuth();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Синхронизировать есть смысл только настоящему вошедшему ученику —
    // у гостя и у учителя своего прогресса для мониторинга нет.
    if (!hydrated || !profile || profile.role !== 'student') return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const mastery = computeSkillMastery(state);
      const stats = summarize(state);
      const skillMastery = Object.fromEntries(
        Object.entries(mastery).map(([skillId, value]) => [skillId, value.mastery]),
      );

      const supabase = createClient();
      supabase
        .from('student_progress')
        .upsert({
          student_id: profile.id,
          class_id: profile.class_id,
          points: state.points,
          streak_current: state.streak.current,
          streak_longest: state.streak.longest,
          last_active_date: state.streak.lastActiveDate,
          total_attempts: stats.totalAttempts,
          correct_attempts: stats.correctAttempts,
          skill_mastery: skillMastery,
          average_mastery: stats.overallMastery,
          updated_at: new Date().toISOString(),
        })
        .then(() => {});
    }, SYNC_DELAY_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [state, hydrated, profile]);

  return null;
}
