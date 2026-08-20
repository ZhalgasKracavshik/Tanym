'use client';

/**
 * Ворота перед публикацией.
 *
 * Просмотр афиши, возможностей, архива остаётся гостевым — этот компонент
 * оборачивает только формы публикации. Три состояния по очереди: кнопка
 * входа, выбор роли после первого входа, и сама форма (children) — но только
 * с ожидаемой ролью, иначе учитель случайно опубликует пост ученика.
 */

import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { Button } from './ui';

const AUTH_ERROR_TEXT: Record<string, Record<'ru' | 'kk' | 'en', string>> = {
  wrong_domain: {
    ru: 'Вход разрешён только с почтой школьного домена.',
    kk: 'Кіру тек мектеп домені поштасымен рұқсат етілген.',
    en: 'Sign-in is only allowed with a school-domain email.',
  },
  exchange_failed: {
    ru: 'Не удалось войти. Попробуйте ещё раз.',
    kk: 'Кіру мүмкін болмады. Қайта көріңіз.',
    en: 'Sign-in failed. Please try again.',
  },
};

interface SchoolAuthGateProps {
  requireRole: 'student' | 'teacher';
  language: 'ru' | 'kk' | 'en';
  children: (profile: { id: string; name: string }) => ReactNode;
}

const TEXT = {
  ru: {
    signIn: 'Войти через Google (почта школы)',
    domainHint: 'Публикация доступна только с почтой домена binom.edu.kz.',
    chooseRole: 'Вы ученик или учитель?',
    student: 'Я ученик',
    teacher: 'Я учитель',
    wrongRole: (role: string) => `Этот раздел только для роли «${role}» — у вас другая роль в профиле.`,
    signedInAs: (name: string) => `Вы вошли как ${name}`,
    signOut: 'Выйти',
  },
  kk: {
    signIn: 'Google арқылы кіру (мектеп поштасы)',
    domainHint: 'Жариялау тек binom.edu.kz домені поштасымен қолжетімді.',
    chooseRole: 'Сіз оқушысыз ба, мұғалімсіз бе?',
    student: 'Мен оқушымын',
    teacher: 'Мен мұғаліммін',
    wrongRole: (role: string) => `Бұл бөлім тек «${role}» рөліне арналған.`,
    signedInAs: (name: string) => `Сіз ${name} ретінде кірдіңіз`,
    signOut: 'Шығу',
  },
  en: {
    signIn: 'Sign in with Google (school email)',
    domainHint: 'Publishing is only available with a binom.edu.kz email.',
    chooseRole: 'Are you a student or a teacher?',
    student: "I'm a student",
    teacher: "I'm a teacher",
    wrongRole: (role: string) => `This section is only for the "${role}" role.`,
    signedInAs: (name: string) => `Signed in as ${name}`,
    signOut: 'Sign out',
  },
} as const;

export function SchoolAuthGate({ requireRole, language, children }: SchoolAuthGateProps) {
  const { loading, isSignedIn, profile, signInWithGoogle, signOut, chooseRole } = useSchoolAuth();
  const searchParams = useSearchParams();
  const authError = searchParams.get('authError');
  const t = TEXT[language];

  if (loading) return null;

  if (!isSignedIn) {
    return (
      <div className="rounded-xl border border-ink-200 bg-ink-50 p-5">
        {authError && AUTH_ERROR_TEXT[authError] && (
          <p className="mb-3 text-sm font-semibold text-danger-600">{AUTH_ERROR_TEXT[authError][language]}</p>
        )}
        <Button onClick={() => signInWithGoogle(window.location.pathname)}>{t.signIn}</Button>
        <p className="mt-2 text-xs text-ink-400">{t.domainHint}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-xl border border-ink-200 bg-ink-50 p-5">
        <p className="font-semibold text-ink-800">{t.chooseRole}</p>
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" onClick={() => chooseRole('student')}>
            {t.student}
          </Button>
          <Button variant="secondary" onClick={() => chooseRole('teacher')}>
            {t.teacher}
          </Button>
        </div>
      </div>
    );
  }

  if (profile.role !== requireRole) {
    return (
      <div className="rounded-xl border border-ink-200 bg-ink-50 p-5">
        <p className="text-sm text-ink-500">{t.wrongRole(requireRole)}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm text-ink-500">
        <span>{t.signedInAs(profile.name)}</span>
        <button onClick={signOut} className="font-semibold text-brand-600 hover:underline">
          {t.signOut}
        </button>
      </div>
      {children(profile)}
    </div>
  );
}
