'use client';

/**
 * Регистрация внешнего учебного центра — отдельным входом.
 *
 * Почему отдельно от общей регистрации. Ученик и учитель отвечают на
 * вопросы «какой класс» и «какие предметы»; организации эти вопросы
 * бессмысленны, а нужны ей название, контакт и сайт. Смешивать это в
 * одну форму значит показывать каждому половину полей не про него.
 *
 * Центр не становится участником школы: прогресс учеников, рейтинг и
 * материалы учителей ему недоступны (см. is_school_member в базе). Он
 * может ровно одно — подать объявление на проверку.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthShell, FormMessage, PasswordField, SubmitButton, Field } from '@/components/auth-ui';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { useLang, type Dict } from '@/lib/i18n';

const TEXT: Dict<{
  heroTitle: string;
  heroText: string;
  title: string;
  subtitle: string;
  org: string;
  orgPlaceholder: string;
  contact: string;
  contactHint: string;
  site: string;
  siteOptional: string;
  email: string;
  password: string;
  passwordHint: string;
  submit: string;
  haveAccount: string;
  signIn: string;
  forStudents: string;
  signUpLink: string;
  orgShort: string;
  contactShort: string;
  passwordShort: string;
  failed: string;
  success: string;
}> = {
  ru: {
    heroTitle: 'Разместить услуги центра',
    heroText:
      'Ученик приходит к вам, уже зная свой уровень: он видел диагностику и понимает, что именно ему нужно подтянуть.',
    title: 'Регистрация центра',
    subtitle: 'Для учебных центров, курсов и репетиторских школ.',
    org: 'Название организации',
    orgPlaceholder: 'Например: Учебный центр «Алгоритм»',
    contact: 'Контакт для учеников',
    contactHint: 'Телефон, WhatsApp или адрес — его увидят в объявлении',
    site: 'Сайт или страница в соцсети',
    siteOptional: 'Необязательно',
    email: 'Рабочая почта',
    password: 'Пароль',
    passwordHint: 'Не меньше 6 символов.',
    submit: 'Зарегистрировать центр',
    haveAccount: 'Уже есть аккаунт?',
    signIn: 'Войти',
    forStudents: 'Вы ученик или учитель?',
    signUpLink: 'Обычная регистрация',
    orgShort: 'Укажите название организации',
    contactShort: 'Укажите контакт, по которому с вами свяжутся',
    passwordShort: 'Пароль должен быть не короче 6 символов.',
    failed: 'Не удалось зарегистрировать центр.',
    success: 'Центр зарегистрирован. Открываем панель…',
  },
  kk: {
    heroTitle: 'Орталық қызметтерін орналастыру',
    heroText:
      'Оқушы сізге өз деңгейін біліп келеді: ол диагностикадан өткен және нақты нені пысықтау керегін түсінеді.',
    title: 'Орталықты тіркеу',
    subtitle: 'Оқу орталықтары, курстар және репетиторлық мектептер үшін.',
    org: 'Ұйым атауы',
    orgPlaceholder: 'Мысалы: «Алгоритм» оқу орталығы',
    contact: 'Оқушыларға арналған байланыс',
    contactHint: 'Телефон, WhatsApp немесе мекенжай — ол хабарландыруда көрінеді',
    site: 'Сайт немесе әлеуметтік желі парақшасы',
    siteOptional: 'Міндетті емес',
    email: 'Жұмыс поштасы',
    password: 'Құпия сөз',
    passwordHint: '6 таңбадан кем емес.',
    submit: 'Орталықты тіркеу',
    haveAccount: 'Тіркелгіңіз бар ма?',
    signIn: 'Кіру',
    forStudents: 'Сіз оқушы немесе мұғалімсіз бе?',
    signUpLink: 'Кәдімгі тіркелу',
    orgShort: 'Ұйым атауын көрсетіңіз',
    contactShort: 'Сізбен байланысатын байланысты көрсетіңіз',
    passwordShort: 'Құпия сөз 6 таңбадан кем болмауы керек.',
    failed: 'Орталықты тіркеу мүмкін болмады.',
    success: 'Орталық тіркелді. Панель ашылуда…',
  },
  en: {
    heroTitle: 'List your centre',
    heroText:
      'Students arrive already knowing their level — they have taken the diagnostic and know what needs work.',
    title: 'Centre registration',
    subtitle: 'For learning centres, courses and tutoring schools.',
    org: 'Organisation name',
    orgPlaceholder: 'For example: Algorithm Learning Centre',
    contact: 'Contact for students',
    contactHint: 'Phone, WhatsApp or address — shown in your listing',
    site: 'Website or social page',
    siteOptional: 'Optional',
    email: 'Work email',
    password: 'Password',
    passwordHint: 'At least 6 characters.',
    submit: 'Register the centre',
    haveAccount: 'Already have an account?',
    signIn: 'Sign in',
    forStudents: 'Are you a student or teacher?',
    signUpLink: 'Regular sign-up',
    orgShort: 'Enter the organisation name',
    contactShort: 'Enter a contact students can reach you on',
    passwordShort: 'Password must be at least 6 characters.',
    failed: 'Could not register the centre.',
    success: 'Centre registered. Opening your panel…',
  },
};

export default function RegisterCenterPage() {
  const router = useRouter();
  const lang = useLang();
  const t = TEXT[lang];
  const { signUpWithPassword } = useSchoolAuth();

  const [org, setOrg] = useState('');
  const [contact, setContact] = useState('');
  const [site, setSite] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [shakeKey, setShakeKey] = useState(0);

  async function submit() {
    const next: Record<string, string | undefined> = {};
    if (org.trim().length < 2) next.org = t.orgShort;
    if (contact.trim().length < 5) next.contact = t.contactShort;
    if (password.length < 6) next.password = t.passwordShort;

    setErrors(next);
    setFormError(null);
    setShakeKey((key) => key + 1);
    if (Object.keys(next).length > 0) return;

    setStatus('loading');
    const signUp = await signUpWithPassword(email.trim(), password, org.trim());
    if (!signUp.ok) {
      setStatus('idle');
      setFormError(signUp.error ?? t.failed);
      setShakeKey((key) => key + 1);
      return;
    }

    /*
      Роль назначается сразу после регистрации, а не отдельным шагом:
      организация уже сказала, кто она, самим выбором этой формы, и
      спрашивать второй раз незачем.
    */
    const response = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'center',
        orgName: org.trim(),
        orgContact: contact.trim(),
        orgSite: site.trim(),
      }),
    }).catch(() => null);

    if (!response || !response.ok) {
      setStatus('idle');
      setFormError(t.failed);
      setShakeKey((key) => key + 1);
      return;
    }

    setStatus('success');
    setTimeout(() => router.push('/center'), 900);
  }

  return (
    <AuthShell
      heroTitle={t.heroTitle}
      heroText={t.heroText}
      title={t.title}
      subtitle={t.subtitle}
      footer={
        <>
          {t.haveAccount} <Link href="/login" className="font-medium text-ink-900 underline underline-offset-4">{t.signIn}</Link>
          {' · '}
          {t.forStudents}{' '}
          <Link href="/register" className="font-medium text-ink-900 underline underline-offset-4">
            {t.signUpLink}
          </Link>
        </>
      }
    >
      <form
        className="space-y-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Field
          label={t.org}
          placeholder={t.orgPlaceholder}
          value={org}
          onChange={(event) => setOrg(event.target.value)}
          error={errors.org}
          shakeKey={shakeKey}
        />

        <Field
          label={t.contact}
          value={contact}
          onChange={(event) => setContact(event.target.value)}
          hint={t.contactHint}
          error={errors.contact}
          shakeKey={shakeKey}
        />

        <Field
          label={t.site}
          placeholder="https://"
          value={site}
          onChange={(event) => setSite(event.target.value)}
          hint={t.siteOptional}
        />

        <Field
          label={t.email}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <PasswordField
          label={t.password}
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint={t.passwordHint}
          error={errors.password}
          shakeKey={shakeKey}
        />

        {formError && <FormMessage tone="error">{formError}</FormMessage>}
        {status === 'success' && <FormMessage tone="success">{t.success}</FormMessage>}

        <SubmitButton loading={status === 'loading'} success={status === 'success'}>
          {t.submit}
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
