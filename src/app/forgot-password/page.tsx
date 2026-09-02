'use client';

/**
 * Запрос письма для сброса пароля.
 *
 * После отправки экран не сообщает, существует ли такая почта: иначе форму
 * можно использовать как проверялку «зарегистрирован ли этот человек».
 * Текст одинаковый в обоих случаях.
 */

import { useState } from 'react';
import { AuthLink, AuthShell, Field, FormMessage, SubmitButton } from '@/components/auth-ui';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { useLang, type Dict } from '@/lib/i18n';

const TEXT: Dict<{
  heroTitle: string;
  heroText: string;
  title: string;
  subtitle: string;
  email: string;
  emailRequired: string;
  rateLimit: string;
  genericError: string;
  sent: string;
  rememberedPassword: string;
  login: string;
  submit: string;
}> = {
  ru: {
    heroTitle: 'Бывает',
    heroText: 'Укажите почту — пришлём ссылку для нового пароля через минуту.',
    title: 'Восстановление пароля',
    subtitle: 'Пришлём ссылку для смены пароля на вашу почту.',
    email: 'Почта',
    emailRequired: 'Введите адрес почты.',
    rateLimit: 'Слишком много запросов. Подождите минуту.',
    genericError: 'Не удалось отправить письмо.',
    sent: 'Если такая почта зарегистрирована, письмо уже в пути. Проверьте входящие и папку «Спам».',
    rememberedPassword: 'Вспомнили пароль?',
    login: 'Войти',
    submit: 'Отправить ссылку',
  },
  kk: {
    heroTitle: 'Бола береді',
    heroText: 'Поштаңызды көрсетіңіз — бір минутта жаңа құпия сөзге сілтеме жібереміз.',
    title: 'Құпия сөзді қалпына келтіру',
    subtitle: 'Құпия сөзді ауыстыруға сілтемені поштаңызға жібереміз.',
    email: 'Электрондық пошта',
    emailRequired: 'Пошта мекенжайын енгізіңіз.',
    rateLimit: 'Тым көп сұрау. Бір минуттан кейін қайталаңыз.',
    genericError: 'Хатты жіберу мүмкін болмады.',
    sent: 'Егер бұл пошта тіркелген болса, хат жолда. Кіріс қалтаны және «Спам» қалтасын тексеріңіз.',
    rememberedPassword: 'Құпия сөзді есіңізге түсірдіңіз бе?',
    login: 'Кіру',
    submit: 'Сілтемені жіберу',
  },
  en: {
    heroTitle: 'It happens',
    heroText: "Enter your email — we'll send a reset link within a minute.",
    title: 'Reset your password',
    subtitle: "We'll send a password reset link to your email.",
    email: 'Email',
    emailRequired: 'Enter your email address.',
    rateLimit: 'Too many requests. Wait a minute.',
    genericError: 'Could not send the email.',
    sent: "If this email is registered, the message is on its way. Check your inbox and spam folder.",
    rememberedPassword: 'Remembered your password?',
    login: 'Log in',
    submit: 'Send link',
  },
};

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useSchoolAuth();
  const lang = useLang();
  const t = TEXT[lang];

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent'>('idle');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  async function submit() {
    setEmailError(undefined);
    setFormError(null);
    setShakeKey((k) => k + 1);

    if (!email.trim()) {
      setEmailError(t.emailRequired);
      return;
    }
    setStatus('loading');

    const result = await sendPasswordReset(email.trim());
    if (!result.ok) {
      setStatus('idle');
      setFormError(/rate limit|too many/i.test(result.error ?? '') ? t.rateLimit : (result.error ?? t.genericError));
      setShakeKey((k) => k + 1);
      return;
    }

    setStatus('sent');
  }

  return (
    <AuthShell
      heroTitle={t.heroTitle}
      heroText={t.heroText}
      title={t.title}
      subtitle={t.subtitle}
      footer={
        <>
          {t.rememberedPassword} <AuthLink href="/login">{t.login}</AuthLink>
        </>
      }
    >
      {status === 'sent' ? (
        <FormMessage tone="success">{t.sent}</FormMessage>
      ) : (
        <form
          className="space-y-5"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Field
            label={t.email}
            type="email"
            autoComplete="email"
            placeholder="name@binom.edu.kz"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (emailError) setEmailError(undefined);
            }}
            error={emailError}
            shakeKey={shakeKey}
          />

          {formError && <FormMessage tone="error">{formError}</FormMessage>}

          <SubmitButton loading={status === 'loading'}>{t.submit}</SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
