'use client';

/**
 * Реальные ученики, подключившиеся по коду класса.
 *
 * Честно: это список подключившихся, а не прогресс. Академические данные
 * (mastery, попытки, серии) по-прежнему живут только в localStorage
 * каждого ученика и никуда не синхронизируются — учитель видит здесь имя
 * и дату подключения, а не проценты. Полный мониторинг прогресса это
 * отдельная и заметно большая задача: пришлось бы дублировать в базу
 * весь поток попыток из движка персонализации, а не только профиль.
 */

import { useEffect, useState } from 'react';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { createClient } from '@/lib/supabase/client';
import type { Language } from '@/lib/types';
import { Icon } from './Icon';
import { RailRow } from './ui';

interface Student {
  id: string;
  name: string;
  created_at: string;
}

const TEXT = {
  ru: {
    title: 'Ученики, подключённые по коду класса',
    code: 'Код для новых учеников',
    empty: 'Пока никто не подключился этим кодом.',
    joined: 'Подключился',
    honest: 'Здесь только список подключившихся. Прогресс по заданиям пока хранится в браузере каждого ученика и не синхронизируется с этой панелью — это следующий шаг.',
  },
  kk: {
    title: 'Сынып коды бойынша қосылған оқушылар',
    code: 'Жаңа оқушыларға арналған код',
    empty: 'Әзірге бұл код бойынша ешкім қосылған жоқ.',
    joined: 'Қосылды',
    honest: 'Мұнда тек қосылғандар тізімі. Тапсырмалар бойынша үлгерім әзірге әр оқушының браузерінде сақталады және бұл панельмен синхрондалмайды — бұл келесі қадам.',
  },
  en: {
    title: 'Students connected via class code',
    code: 'Code for new students',
    empty: 'No one has joined with this code yet.',
    joined: 'Joined',
    honest: "This is only a list of who joined. Task progress is still stored in each student's own browser and is not synced to this panel yet — that's the next step.",
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

    supabase
      .from('profiles')
      .select('id, name, created_at')
      .eq('class_id', profile.class_id)
      .eq('role', 'student')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setStudents(data ?? []);
      });

    return () => {
      cancelled = true;
    };
  }, [profile]);

  if (!profile || profile.role !== 'teacher') return null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-ink-900">{t.title}</h2>
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
          {students.map((student) => (
            <li key={student.id}>
              <RailRow tone="brand">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 font-semibold text-ink-800">
                    <Icon name="user" size={16} className="text-brand-500" />
                    {student.name}
                  </span>
                  <span className="text-xs text-ink-400">
                    {t.joined} {new Date(student.created_at).toLocaleDateString(language)}
                  </span>
                </div>
              </RailRow>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-ink-400">{t.honest}</p>
    </div>
  );
}
