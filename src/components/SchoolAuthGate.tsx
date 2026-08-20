'use client';

/**
 * Ворота перед публикацией.
 *
 * Просмотр афиши, возможностей, архива остаётся гостевым — этот компонент
 * оборачивает только формы публикации. Состояния по очереди: кнопка входа,
 * выбор роли после первого входа (ученику ещё нужен код класса), и сама
 * форма (children) — но только с ожидаемой ролью, иначе учитель случайно
 * опубликует пост ученика.
 */

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import type { SchoolProfile } from '@/lib/supabase/useSchoolAuth';
import { Button, ButtonLink } from './ui';

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

const SUBMIT_ERROR_TEXT: Record<string, Record<'ru' | 'kk' | 'en', string>> = {
  class_not_found: {
    ru: 'Класс с таким кодом не найден. Проверьте код у учителя.',
    kk: 'Мұндай код бойынша сынып табылмады. Кодты мұғалімнен тексеріңіз.',
    en: 'No class found with that code. Check it with your teacher.',
  },
  class_code_required: {
    ru: 'Введите код класса.',
    kk: 'Сынып кодын енгізіңіз.',
    en: 'Enter the class code.',
  },
};

type SchoolRole = 'student' | 'teacher' | 'admin';

interface SchoolAuthGateProps {
  requireRole: SchoolRole | SchoolRole[];
  language: 'ru' | 'kk' | 'en';
  children: (profile: SchoolProfile) => ReactNode;
}

const TEXT = {
  ru: {
    signIn: 'Войти',
    register: 'Создать аккаунт',
    domainHint: 'Публикация доступна только с почтой домена binom.edu.kz.',
    chooseRole: 'Вы ученик или учитель?',
    student: 'Я ученик',
    teacher: 'Я учитель',
    classCodeLabel: 'Код класса от учителя',
    classCodePlaceholder: 'Например, K7X9QF',
    join: 'Присоединиться',
    joining: 'Проверяем код…',
    back: 'Назад',
    wrongRole: (role: string) => `Этот раздел только для роли «${role}» — у вас другая роль в профиле.`,
    signedInAs: (name: string) => `Вы вошли как ${name}`,
    signOut: 'Выйти',
    yourClass: 'Ваш класс',
    classCodeForStudents: 'Код для учеников',
    inClass: (name: string) => `Класс: ${name}`,
  },
  kk: {
    signIn: 'Кіру',
    register: 'Аккаунт құру',
    domainHint: 'Жариялау тек binom.edu.kz домені поштасымен қолжетімді.',
    chooseRole: 'Сіз оқушысыз ба, мұғалімсіз бе?',
    student: 'Мен оқушымын',
    teacher: 'Мен мұғаліммін',
    classCodeLabel: 'Мұғалімнен алған сынып коды',
    classCodePlaceholder: 'Мысалы, K7X9QF',
    join: 'Қосылу',
    joining: 'Код тексерілуде…',
    back: 'Артқа',
    wrongRole: (role: string) => `Бұл бөлім тек «${role}» рөліне арналған.`,
    signedInAs: (name: string) => `Сіз ${name} ретінде кірдіңіз`,
    signOut: 'Шығу',
    yourClass: 'Сіздің сыныбыңыз',
    classCodeForStudents: 'Оқушыларға арналған код',
    inClass: (name: string) => `Сынып: ${name}`,
  },
  en: {
    signIn: 'Sign in',
    register: 'Create account',
    domainHint: 'Publishing is only available with a binom.edu.kz email.',
    chooseRole: 'Are you a student or a teacher?',
    student: "I'm a student",
    teacher: "I'm a teacher",
    classCodeLabel: 'Class code from your teacher',
    classCodePlaceholder: 'E.g. K7X9QF',
    join: 'Join',
    joining: 'Checking code…',
    back: 'Back',
    wrongRole: (role: string) => `This section is only for the "${role}" role.`,
    signedInAs: (name: string) => `Signed in as ${name}`,
    signOut: 'Sign out',
    yourClass: 'Your class',
    classCodeForStudents: 'Code for students',
    inClass: (name: string) => `Class: ${name}`,
  },
} as const;

export function SchoolAuthGate({ requireRole, language, children }: SchoolAuthGateProps) {
  const { loading, isSignedIn, profile, schoolClass, signOut, chooseRole } = useSchoolAuth();
  const searchParams = useSearchParams();
  const authError = searchParams.get('authError');
  const t = TEXT[language];

  const [pendingRole, setPendingRole] = useState<'student' | 'teacher' | null>(null);
  const [classCode, setClassCode] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;

  if (!isSignedIn) {
    return (
      <div className="rounded-[var(--radius-card)] border border-ink-200 bg-ink-50/70 p-6">
        {authError && AUTH_ERROR_TEXT[authError] && (
          <p className="mb-3 text-sm font-semibold text-danger-600">{AUTH_ERROR_TEXT[authError][language]}</p>
        )}
        {/* Способов входа теперь три (почта, Google, Apple), и держать их
            копию в каждых воротах публикации значило бы поддерживать одну
            и ту же форму в пяти местах. Ведём на /login. */}
        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink href="/login" size="sm">
            {t.signIn}
          </ButtonLink>
          <ButtonLink href="/register" size="sm" variant="secondary">
            {t.register}
          </ButtonLink>
        </div>
        <p className="mt-3 text-xs text-ink-400">{t.domainHint}</p>
      </div>
    );
  }

  if (!profile) {
    async function submit(role: 'student' | 'teacher') {
      setSubmitError(null);
      if (role === 'student' && classCode.trim() === '') {
        setSubmitError('class_code_required');
        return;
      }
      setSubmitting(true);
      const result = await chooseRole(role, classCode);
      setSubmitting(false);
      if (!result.ok) setSubmitError(result.error ?? 'class_not_found');
    }

    if (pendingRole === 'student') {
      return (
        <div className="rounded-xl border border-ink-200 bg-ink-50 p-5">
          <label className="text-sm font-semibold text-ink-700" htmlFor="class-code">
            {t.classCodeLabel}
          </label>
          <input
            id="class-code"
            value={classCode}
            onChange={(event) => setClassCode(event.target.value)}
            placeholder={t.classCodePlaceholder}
            className="mt-2 w-full rounded-xl border border-ink-200 p-3 text-sm uppercase tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
          {submitError && SUBMIT_ERROR_TEXT[submitError] && (
            <p className="mt-2 text-sm font-semibold text-danger-600">{SUBMIT_ERROR_TEXT[submitError][language]}</p>
          )}
          <div className="mt-3 flex gap-2">
            <Button onClick={() => submit('student')} disabled={submitting}>
              {submitting ? t.joining : t.join}
            </Button>
            <Button variant="ghost" onClick={() => setPendingRole(null)}>
              {t.back}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-ink-200 bg-ink-50 p-5">
        <p className="font-semibold text-ink-800">{t.chooseRole}</p>
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" onClick={() => setPendingRole('student')}>
            {t.student}
          </Button>
          <Button variant="secondary" onClick={() => submit('teacher')} disabled={submitting}>
            {t.teacher}
          </Button>
        </div>
      </div>
    );
  }

  const allowedRoles = Array.isArray(requireRole) ? requireRole : [requireRole];
  if (!allowedRoles.includes(profile.role)) {
    return (
      <div className="rounded-xl border border-ink-200 bg-ink-50 p-5">
        <p className="text-sm text-ink-500">{t.wrongRole(allowedRoles.join(' / '))}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-ink-500">
        <span>
          {t.signedInAs(profile.name)}
          {schoolClass &&
            (profile.role === 'teacher'
              ? ` · ${t.classCodeForStudents}: ${schoolClass.code}`
              : ` · ${t.inClass(schoolClass.name)}`)}
        </span>
        <button onClick={signOut} className="font-semibold text-brand-600 hover:underline">
          {t.signOut}
        </button>
      </div>
      {children(profile)}
    </div>
  );
}
