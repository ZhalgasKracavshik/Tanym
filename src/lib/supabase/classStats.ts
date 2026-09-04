'use client';

/**
 * Сводка по классу для панели учителя — из проверенных сервером попыток.
 *
 * Раньше эти цифры брались из data/demo-class.ts: класс генерировался
 * детерминированной функцией, и «западающие навыки» считались по
 * выдуманным ученикам. Учитель видел аккуратную аналитику, за которой не
 * стоял ни один живой человек, и решение «кому помочь» принималось по
 * сгенерированным числам.
 *
 * Теперь всё считается из task_attempts: там навык, сложность и вердикт,
 * и каждую строку записал сервер, а не браузер ученика.
 *
 * Класс определяется по class_id самого учителя. Если код класса ещё
 * никто не ввёл, хук честно вернёт пустую сводку — это правдивее, чем
 * показать выдуманных отличников.
 */

import { useEffect, useState } from 'react';
import { createClient } from './client';
import { useSchoolAuth } from './useSchoolAuth';

interface SkillRow {
  student_id: string;
  subject_id: string | null;
  skill_id: string;
  attempts: number;
  correct: number;
  mastery: number;
}

export interface ClassSkill {
  skillId: string;
  /** Доля верных попыток по классу, 0..1. */
  average: number;
  attempts: number;
  /** Сколько учеников вообще брались за этот навык. */
  students: number;
}

export interface ClassStats {
  /** Учеников, подключённых по коду класса. */
  studentCount: number;
  /** Из них те, кто хоть раз решал задание. */
  activeCount: number;
  /** Средняя доля верных ответов по классу, 0..1. null — решать ещё некому. */
  average: number | null;
  /** Ученики с долей верных ответов ниже 50%. */
  atRisk: number;
  /** Навыки от самого слабого к сильному. */
  weakSkills: ClassSkill[];
}

const EMPTY: ClassStats = {
  studentCount: 0,
  activeCount: 0,
  average: null,
  atRisk: 0,
  weakSkills: [],
};

export function useClassStats(subjectId: string | null): ClassStats | null {
  const { profile } = useSchoolAuth();
  const [stats, setStats] = useState<ClassStats | null>(null);

  const classId = profile?.class_id ?? null;
  const isStaff = profile?.role === 'teacher' || profile?.role === 'admin';

  useEffect(() => {
    if (!isStaff) return;
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const roster = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'student')
        /*
          Администратор смотрит школу целиком, классный руководитель —
          свой класс. Фильтр по классу применяется только когда класс
          вообще есть: у учителя без класса иначе вышел бы запрос
          `class_id = null`, который не вернёт ничего и молча покажет
          пустую панель вместо понятного «код класса ещё никто не ввёл».
        */
        .match(profile?.role === 'teacher' && classId ? { class_id: classId } : {});

      if (cancelled) return;
      const ids = (roster.data ?? []).map((row) => row.id as string);
      if (ids.length === 0) {
        setStats(EMPTY);
        return;
      }

      let query = supabase
        .from('student_skill_stats')
        .select('student_id, subject_id, skill_id, attempts, correct, mastery')
        .in('student_id', ids);
      if (subjectId) query = query.eq('subject_id', subjectId);

      const { data } = await query;
      if (cancelled) return;

      const rows = (data as SkillRow[] | null) ?? [];

      // Сводка по ученику: сколько решал и сколько верно.
      const byStudent = new Map<string, { attempts: number; correct: number }>();
      // Сводка по навыку: он и есть ответ на вопрос «что объяснять заново».
      const bySkill = new Map<string, { attempts: number; correct: number; students: Set<string> }>();

      for (const row of rows) {
        const s = byStudent.get(row.student_id) ?? { attempts: 0, correct: 0 };
        s.attempts += row.attempts;
        s.correct += row.correct;
        byStudent.set(row.student_id, s);

        const k = bySkill.get(row.skill_id) ?? { attempts: 0, correct: 0, students: new Set<string>() };
        k.attempts += row.attempts;
        k.correct += row.correct;
        k.students.add(row.student_id);
        bySkill.set(row.skill_id, k);
      }

      const active = [...byStudent.values()].filter((s) => s.attempts > 0);
      const shares = active.map((s) => s.correct / s.attempts);

      setStats({
        studentCount: ids.length,
        activeCount: active.length,
        average: shares.length ? shares.reduce((a, b) => a + b, 0) / shares.length : null,
        // «В зоне риска» — только среди решавших. Ученик, не начавший
        // заниматься, — это другая проблема, и смешивать их значит
        // потерять обе.
        atRisk: shares.filter((value) => value < 0.5).length,
        weakSkills: [...bySkill.entries()]
          .map(([skillId, k]) => ({
            skillId,
            average: k.correct / k.attempts,
            attempts: k.attempts,
            students: k.students.size,
          }))
          .sort((a, b) => a.average - b.average),
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isStaff, classId, subjectId, profile?.role]);

  return stats;
}
