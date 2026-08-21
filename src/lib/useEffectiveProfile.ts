'use client';

/**
 * Один профиль вместо двух.
 *
 * Исторически в приложении жили две независимые личности: локальная
 * (localStorage, создаётся на /onboarding) и настоящая, из Supabase
 * (создаётся при регистрации). Кабинет и план проверяли только первую —
 * поэтому вошедший ученик, у которого localStorage пуст (другой браузер,
 * очищенный кэш, новое устройство), видел «Профиль ещё не создан» и его
 * отправляли заполнять то, что он уже заполнил.
 *
 * Здесь они сводятся: учебные поля берутся из Supabase, если они там есть,
 * и только потом из локальной копии. Локальная не удаляется — на ней всё
 * ещё держится прогресс по темам, — но перестаёт быть единственным
 * условием, по которому страница решает, что ученика не существует.
 */

import { useMemo } from 'react';
import { useStore } from '@/components/StoreProvider';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import type { Grade, LearningGoal, Profile, SubjectId } from '@/lib/types';

export function useEffectiveProfile(): Profile | null {
  const { state } = useStore();
  const { profile: schoolProfile } = useSchoolAuth();
  const local = state.profile;

  return useMemo(() => {
    if (!schoolProfile) return local;

    /*
      Админ сюда не приводится: в учебных типах роли всего две, и админ
      это не «ученик с правами», а отдельная роль без класса, предметов и
      плана. Его страницы — админские; кабинет и план ему показывать нечем.
    */
    if (schoolProfile.role === 'admin') return local;

    /*
      Класс и предметы — минимум, без которого движок персонализации не
      может ничего посчитать. Если их нет ни там, ни там, честнее вернуть
      null и показать приглашение заполнить профиль, чем подставить
      выдуманный 9 класс и построить план не по нему.
    */
    const grade = (schoolProfile.grade ?? local?.grade ?? null) as Grade | null;
    const subjectIds = (schoolProfile.subject_ids?.length
      ? schoolProfile.subject_ids
      : (local?.subjectIds ?? [])) as SubjectId[];

    if (grade === null || subjectIds.length === 0) return local;

    return {
      id: schoolProfile.id,
      name: schoolProfile.name || (local?.name ?? ''),
      role: schoolProfile.role,
      grade,
      subjectIds,
      goal: (schoolProfile.goal ?? local?.goal ?? 'ent') as LearningGoal,
      targetDate: schoolProfile.target_date ?? local?.targetDate,
      createdAt: local?.createdAt ?? new Date().toISOString(),
    };
  }, [schoolProfile, local]);
}
