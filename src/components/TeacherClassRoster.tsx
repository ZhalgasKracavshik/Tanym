'use client';

/**
 * Реальные ученики класса вместе с прогрессом.
 *
 * Прогресс приходит из student_progress — снимка, который каждый ученик
 * сам отправляет из ProgressSync. Мастерство по-прежнему считает только
 * локальный движок персонализации в браузере ученика; здесь его уже
 * посчитанный результат, а не пересчёт заново на сервере.
 */

import { useEffect, useState } from 'react';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { createClient } from '@/lib/supabase/client';
import type { Language } from '@/lib/types';
import { Icon } from './Icon';
import { ProgressBar, RailRow } from './ui';

interface Student {
  id: string;
  name: string;
  created_at: string;
  points: number;
  average_mastery: number;
  streak_current: number;
  total_attempts: number;
  updated_at: string | null;
}

const TEXT = {
  ru: {
    title: 'Ученики, подключённые по коду класса',
    code: 'Код для новых учеников',
    empty: 'Пока никто не подключился этим кодом.',
    joined: 'Подключился',
    noProgress: 'ещё не занимался',
    points: 'очк.',
    streak: (n: number) => `серия ${n} дн.`,
    lastActive: (date: string) => `последний раз — ${date}`,
  },
  kk: {
    title: 'Сынып коды бойынша қосылған оқушылар',
    code: 'Жаңа оқушыларға арналған код',
    empty: 'Әзірге бұл код бойынша ешкім қосылған жоқ.',
    joined: 'Қосылды',
    noProgress: 'әлі айналыспаған',
    points: 'ұпай',
    streak: (n: number) => `${n} күн серия`,
    lastActive: (date: string) => `соңғы рет — ${date}`,
  },
  en: {
    title: 'Students connected via class code',
    code: 'Code for new students',
    empty: 'No one has joined with this code yet.',
    joined: 'Joined',
    noProgress: 'no activity yet',
    points: 'pts',
    streak: (n: number) => `${n}-day streak`,
    lastActive: (date: string) => `last active ${date}`,
  },
} as const;

export function TeacherClassRoster({ language }: { language: Language }) {
  const { profile, schoolClass } = useSchoolAuth();
  const [students, setStudents] = useState<Student[] | null>(null);
  const t = TEXT[language];

  useEffect(() => {
    if (!profile || profile.role !== 'teacher' || !profile.class_id) return;
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const { data: roster } = await supabase
        .from('profiles')
        .select('id, name, created_at')
        .eq('class_id', profile!.class_id)
        .eq('role', 'student')
        .order('created_at', { ascending: true });

      if (cancelled || !roster) return;

      const ids = roster.map((row) => row.id);
      const { data: progress } =
        ids.length > 0
          ? await supabase
              /*
                Проверенные сервером итоги, а не то, что прислал браузер.

                student_progress пишет клиент, и учитель, глядя в эту
                таблицу, видел бы числа, которые ученик может поставить
                себе сам из консоли. Для панели, по которой учитель
                решает, кому помочь, это недопустимо.

                Доля верных ответов считается здесь же из попыток:
                в проверенных итогах готового среднего нет, а correct к
                total — более честная мера, чем усреднённое владение,
                потому что за ней стоят конкретные попытки.
              */
              .from('verified_progress')
              .select('student_id, points, correct_attempts, streak_current, total_attempts')
              .in('student_id', ids)
          : { data: [] };

      if (cancelled) return;
      const progressById = Object.fromEntries((progress ?? []).map((row) => [row.student_id, row]));

      setStudents(
        roster.map((row) => ({
          id: row.id,
          name: row.name,
          created_at: row.created_at,
          points: progressById[row.id]?.points ?? 0,
          average_mastery: progressById[row.id]?.total_attempts
            ? progressById[row.id].correct_attempts / progressById[row.id].total_attempts
            : 0,
          streak_current: progressById[row.id]?.streak_current ?? 0,
          total_attempts: progressById[row.id]?.total_attempts ?? 0,
          updated_at: null,
        })),
      );
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  if (!profile || profile.role !== 'teacher') return null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-ink-900">{t.title}</h2>
        {schoolClass && (
          <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold tabular-nums text-brand-700">
            {t.code}: {schoolClass.code}
          </span>
        )}
      </div>

      {students === null ? null : students.length === 0 ? (
        <p className="mt-3 text-sm text-ink-500">{t.empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {students
            .slice()
            .sort((a, b) => a.average_mastery - b.average_mastery)
            .map((student) => (
              <li key={student.id}>
                <RailRow tone={student.total_attempts === 0 ? 'neutral' : 'brand'}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-semibold text-ink-800">
                        <Icon name="user" size={16} className="text-brand-500" />
                        {student.name}
                      </span>
                      {student.total_attempts > 0 ? (
                        <div className="mt-2 max-w-xs">
                          <ProgressBar value={student.average_mastery} />
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-ink-400">{t.noProgress}</p>
                      )}
                    </div>
                    <div className="text-right text-xs text-ink-500">
                      {student.total_attempts > 0 && (
                        <p className="font-semibold tabular-nums text-ink-800">
                          {student.points} {t.points}
                          {student.streak_current > 0 && ` · ${t.streak(student.streak_current)}`}
                        </p>
                      )}
                      <p className="mt-1">
                        {t.joined} {new Date(student.created_at).toLocaleDateString(language)}
                      </p>
                    </div>
                  </div>
                </RailRow>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
