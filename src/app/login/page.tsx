'use client';

/**
 * Вход в аккаунт: почта с паролем или Google.
 *
 * Apple убран: Sign in with Apple требует платного аккаунта разработчика,
 * в проекте он не настроен, и кнопка была декорацией без единого
 * успешного входа (проверено по базе — 0 записей против 5 через Google).
 */

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AuthLink,
  AuthShell,
  Field,
  FormMessage,
  PasswordField,
  ProviderButtons,
  SubmitButton,
} from '@/components/auth-ui';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { useLang, type Dict } from '@/lib/i18n';

const TEXT: Dict<{
  heroTitle: string;
  heroText: string;
  title: string;
  subtitle: string;
  email: string;
  emailRequired: string;
  password: string;
  passwordRequired: string;
  invalidCredentials: string;
  emailNotConfirmed: string;
  rateLimit: string;
  genericError: string;
  forgotPassword: string;
  submit: string;
  or: string;
  noAccount: string;
  register: string;
}> = {
  ru: {
    heroTitle: 'С возвращением',
    heroText: 'Прогресс сохранён — заходите и продолжайте с того же места.',
    title: 'Вход',
    subtitle: 'Войдите, чтобы продолжить с того места, где остановились.',
    email: 'Почта',
    emailRequired: 'Введите почту.',
    password: 'Пароль',
    passwordRequired: 'Введите пароль.',
    invalidCredentials: 'Неверная почта или пароль.',
    emailNotConfirmed: 'Почта не подтверждена — проверьте письмо.',
    rateLimit: 'Слишком много попыток. Подождите минуту.',
    genericError: 'Не удалось войти.',
    forgotPassword: 'Забыли пароль?',
    submit: 'Войти',
    or: 'или',
    noAccount: 'Ещё нет аккаунта?',
    register: 'Зарегистрироваться',
  },
  kk: {
    heroTitle: 'Қайта қош келдіңіз',
    heroText: 'Үлгеріміңіз сақталды — кіріп, тоқтаған жерден жалғастырыңыз.',
    title: 'Кіру',
    subtitle: 'Тоқтаған жерден жалғастыру үшін кіріңіз.',
    email: 'Электрондық пошта',
    emailRequired: 'Поштаңызды енгізіңіз.',
    password: 'Құпия сөз',
    passwordRequired: 'Құпия сөзді енгізіңіз.',
    invalidCredentials: 'Пошта немесе құпия сөз қате.',
    emailNotConfirmed: 'Пошта расталмаған — хатты тексеріңіз.',
    rateLimit: 'Тым көп әрекет. Бір минуттан кейін қайталаңыз.',
    genericError: 'Кіру мүмкін болмады.',
    forgotPassword: 'Құпия сөзді ұмыттыңыз ба?',
    submit: 'Кіру',
    or: 'немесе',
    noAccount: 'Аккаунтыңыз жоқ па?',
    register: 'Тіркелу',
  },
  en: {
    heroTitle: 'Welcome back',
    heroText: 'Your progress is saved — sign in and pick up where you left off.',
    title: 'Log in',
    subtitle: 'Sign in to continue where you left off.',
    email: 'Email',
    emailRequired: 'Enter your email.',
    password: 'Password',
    passwordRequired: 'Enter your password.',
    invalidCredentials: 'Incorrect email or password.',
    emailNotConfirmed: 'Email not confirmed — check your inbox.',
    rateLimit: 'Too many attempts. Wait a minute.',
    genericError: 'Could not log in.',
    forgotPassword: 'Forgot password?',
    submit: 'Log in',
    or: 'or',
    noAccount: "Don't have an account?",
    register: 'Sign up',
  },
};

/**
 * Обёртка ради useSearchParams: без Suspense Next.js отказывается
 * статически рендерить страницу, потому что параметры адреса известны
 * только на клиенте.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithPassword, signInWithProvider } = useSchoolAuth();
  const lang = useLang();
  const t = TEXT[lang];

  const nextParam = searchParams.get('next');
  const nextPath = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
    ? nextParam
    : '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [formError, setFormError] = useState<string | null>(null);

  /*
    Ошибки конкретных полей вместо одной общей строки над кнопкой.

    shakeKey растёт на каждую попытку отправки — так поле знает, когда
    нужно встряхнуться заново, даже если текст ошибки не изменился (два
    клика подряд с одной и той же пустой почтой должны трясти оба раза).
  */
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [shakeKey, setShakeKey] = useState(0);

  function translateError(message: string): string {
    if (/invalid login credentials/i.test(message)) return t.invalidCredentials;
    if (/email not confirmed/i.test(message)) return t.emailNotConfirmed;
    if (/rate limit|too many/i.test(message)) return t.rateLimit;
    return message;
  }

  async function submit() {
    setFormError(null);
    setEmailError(undefined);
    setPasswordError(undefined);
    setShakeKey((k) => k + 1);

    let hasError = false;
    if (!email.trim()) {
      setEmailError(t.emailRequired);
      hasError = true;
    }
    if (!password) {
      setPasswordError(t.passwordRequired);
      hasError = true;
    }
    if (hasError) return;

    setStatus('loading');

    const result = await signInWithPassword(email.trim(), password);
    if (!result.ok) {
      setStatus('idle');
      /*
        «Неверная почта или пароль» не говорит, какое поле виновато —
        Supabase намеренно не уточняет это в ответе, иначе форма стала бы
        проверкой «зарегистрирована ли эта почта». Подсвечиваем пароль:
        это то поле, куда обычно смотрят первым при повторном вводе.
      */
      const message = translateError(result.error ?? t.genericError);
      setPasswordError(message);
      setShakeKey((k) => k + 1);
      return;
    }

    setStatus('success');
    /*
      replace, а не push: после успешного входа возврат кнопкой «назад» на
      экран входа не нужен никому. refresh() обязателен рядом — без него
      Next иногда отдаёт для nextPath уже закэшированное дерево, собранное
      до входа (гость), и человек на секунду видит гостевую версию страницы
      или вовсе улетает обратно на /login по вине серверного гейта, который
      ещё не увидел свежую сессию.
    */
    router.replace(nextPath);
    router.refresh();
  }

  return (
    <AuthShell
      heroTitle={t.heroTitle}
      heroText={t.heroText}
      title={t.title}
      subtitle={t.subtitle}
      footer={
        <>
          {t.noAccount} <AuthLink href="/register">{t.register}</AuthLink>
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

        <div>
          <PasswordField
            label={t.password}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (passwordError) setPasswordError(undefined);
            }}
            error={passwordError}
            shakeKey={shakeKey}
          />
          <p className="mt-2 text-right text-sm">
            <AuthLink href="/forgot-password">{t.forgotPassword}</AuthLink>
          </p>
        </div>

        {formError && <FormMessage tone="error">{formError}</FormMessage>}

        <SubmitButton loading={status === 'loading'} success={status === 'success'}>
          {t.submit}
        </SubmitButton>
      </form>

      <div className="mt-7">
        <ProviderButtons dividerLabel={t.or} onGoogle={() => signInWithProvider('google', nextPath)} />
      </div>
    </AuthShell>
  );
}
