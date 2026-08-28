'use client';

/**
 * Вход для учеников и учителей школы — прямо на лендинге, первым, что видно
 * под шапкой. Раньше кнопка входа была спрятана внутри разделов архива
 * и достижений, и до неё нужно было сначала долистать. Здесь она видна
 * сразу, без прокрутки, а после входа тут же показывается код класса
 * или подтверждение, что ученик подключился — без перехода на другую страницу.
 */

import { useState } from 'react';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { describeRoleError } from '@/lib/supabase/roleErrors';
import type { Language } from '@/lib/types';
import { Button, ButtonLink } from './ui';

const TEXT = {
  ru: {
    guestTitle: 'Вы ученик или учитель школы?',
    guestText: 'Войдите через Google школьной почтой — учителю откроется код класса, ученику план и прогресс.',
    signIn: 'Войти через Google',
    chooseRole: 'Ещё шаг: вы ученик или учитель?',
    student: 'Я ученик',
    teacher: 'Я учитель',
    classCodeLabel: 'Код класса от учителя',
    classCodePlaceholder: 'Например, K7X9QF',
    join: 'Присоединиться',
    joining: 'Проверяем код…',
    back: 'Назад',
    signedInAs: (name: string) => `Вы вошли как ${name}`,
    signOut: 'Выйти',
    toDashboard: 'Перейти в кабинет',
    toTeacher: 'Перейти в панель учителя',
    classCode: (code: string) => `Код для учеников: ${code}`,
    inClass: (name: string) => `Класс: ${name}`,
  },
  kk: {
    guestTitle: 'Сіз мектеп оқушысысыз ба, мұғаліміз бе?',
    guestText: 'Мектеп поштасымен Google арқылы кіріңіз — мұғалімге сынып коды, оқушыға жоспар мен үлгерім ашылады.',
    signIn: 'Google арқылы кіру',
    chooseRole: 'Тағы бір қадам: сіз оқушысыз ба, мұғалімсіз бе?',
    student: 'Мен оқушымын',
    teacher: 'Мен мұғаліммін',
    classCodeLabel: 'Мұғалімнен алған сынып коды',
    classCodePlaceholder: 'Мысалы, K7X9QF',
    join: 'Қосылу',
    joining: 'Код тексерілуде…',
    back: 'Артқа',
    signedInAs: (name: string) => `Сіз ${name} ретінде кірдіңіз`,
    signOut: 'Шығу',
    toDashboard: 'Кабинетке өту',
    toTeacher: 'Мұғалім панеліне өту',
    classCode: (code: string) => `Оқушыларға арналған код: ${code}`,
    inClass: (name: string) => `Сынып: ${name}`,
  },
  en: {
    guestTitle: 'Are you a student or teacher at your school?',
    guestText: 'Sign in with your school Google account — teachers get a class code, students get their plan and progress.',
    signIn: 'Sign in with Google',
    chooseRole: 'One more step: are you a student or a teacher?',
    student: "I'm a student",
    teacher: "I'm a teacher",
    classCodeLabel: 'Class code from your teacher',
    classCodePlaceholder: 'E.g. K7X9QF',
    join: 'Join',
    joining: 'Checking code…',
    back: 'Back',
    signedInAs: (name: string) => `Signed in as ${name}`,
    signOut: 'Sign out',
    toDashboard: 'Go to dashboard',
    toTeacher: 'Go to teacher panel',
    classCode: (code: string) => `Code for students: ${code}`,
    inClass: (name: string) => `Class: ${name}`,
  },
} as const;

export function LandingAuthBanner({ language }: { language: Language }) {
  const { loading, isSignedIn, profile, schoolClass, signOut, chooseRole } = useSchoolAuth();
  const t = TEXT[language];

  const [pendingRole, setPendingRole] = useState<'student' | 'teacher' | null>(null);
  const [classCode, setClassCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return null;

  const shell = (children: React.ReactNode) => (
    <div className="mx-auto max-w-6xl px-6 pt-6">
      <div className="rounded-[var(--radius-card)] border border-brand-200/70 bg-brand-50/70 px-6 py-5 shadow-[var(--shadow-rest)] backdrop-blur">
        {children}
      </div>
    </div>
  );

  if (!isSignedIn) {
    return shell(
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-ink-900">{t.guestTitle}</p>
          <p className="mt-1 text-sm text-ink-500">{t.guestText}</p>
        </div>
        {/* Раньше здесь была одна кнопка Google. Теперь способов три,
            и выбирать между ними человек должен на странице входа,
            а не в узкой полосе на лендинге. */}
        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink href="/login" variant="secondary" size="sm">
            Войти
          </ButtonLink>
          <ButtonLink href="/register" size="sm">
            Создать аккаунт
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (!profile) {
    async function submit(role: 'student' | 'teacher') {
      setError(null);
      /*
        Пустой код класса раньше приводил к молчаливому return: кнопка
        «Присоединиться» нажималась и не делала ровно ничего — ни запроса,
        ни сообщения. Со стороны это выглядит как сломанная кнопка.
      */
      if (role === 'student' && classCode.trim() === '') {
        setError(describeRoleError('class_code_required'));
        return;
      }
      setSubmitting(true);
      const result = await chooseRole(role, classCode);
      setSubmitting(false);
      // Раньше сюда попадал сырой код ответа («class_not_found») и печатался
      // на экране как есть — теперь тот же разбор, что и на регистрации.
      if (!result.ok) setError(describeRoleError(result.error, result.domains));
    }

    if (pendingRole === 'student') {
      return shell(
        <div>
          <label className="text-sm font-semibold text-ink-700" htmlFor="landing-class-code">
            {t.classCodeLabel}
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              id="landing-class-code"
              value={classCode}
              onChange={(event) => setClassCode(event.target.value)}
              placeholder={t.classCodePlaceholder}
              className="w-48 rounded-xl border border-ink-200 p-2.5 text-sm uppercase tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
            <Button onClick={() => submit('student')} disabled={submitting}>
              {submitting ? t.joining : t.join}
            </Button>
            <Button variant="ghost" onClick={() => setPendingRole(null)}>
              {t.back}
            </Button>
          </div>
          {error && <p className="mt-2 text-sm font-semibold text-danger-600">{error}</p>}
        </div>
      );
    }

    return shell(
      <div>
        <p className="font-semibold text-ink-900">{t.chooseRole}</p>
        <div className="mt-2 flex gap-2">
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

  return shell(
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm text-ink-700">
        <span className="font-semibold">{t.signedInAs(profile.name)}</span>
        {schoolClass && (
          <span className="text-ink-500">
            {' · '}
            {profile.role === 'teacher' ? t.classCode(schoolClass.code) : t.inClass(schoolClass.name)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <ButtonLink size="sm" href={profile.role === 'teacher' ? '/teacher' : '/dashboard'}>
          {profile.role === 'teacher' ? t.toTeacher : t.toDashboard}
        </ButtonLink>
        <button onClick={signOut} className="text-sm font-semibold text-brand-600 hover:underline">
          {t.signOut}
        </button>
      </div>
    </div>
  );
}
