'use client';

/**
 * Вход в аккаунт: почта с паролем, Google или Apple.
 *
 * Три способа рядом, а не только один: школьная почта на Google есть не
 * у каждой школы, а требовать пароль от того, у кого она есть, незачем.
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

function translateError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Неверная почта или пароль.';
  if (/email not confirmed/i.test(message)) return 'Почта не подтверждена - проверьте письмо.';
  if (/rate limit|too many/i.test(message)) return 'Слишком много попыток. Подождите минуту.';
  return message;
}

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

  async function submit() {
    setFormError(null);
    setEmailError(undefined);
    setPasswordError(undefined);
    setShakeKey((k) => k + 1);

    let hasError = false;
    if (!email.trim()) {
      setEmailError('Введите почту.');
      hasError = true;
    }
    if (!password) {
      setPasswordError('Введите пароль.');
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
      const message = translateError(result.error ?? 'Не удалось войти.');
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
      heroTitle="С возвращением"
      heroText="Персональный план, наставник и рейтинг никуда не делись — продолжите с того места, где остановились."
      title="Вход"
      subtitle="Войдите, чтобы продолжить с того места, где остановились."
      footer={
        <>
          Ещё нет аккаунта? <AuthLink href="/register">Зарегистрироваться</AuthLink>
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
          label="Почта"
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
            label="Пароль"
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
            <AuthLink href="/forgot-password">Забыли пароль?</AuthLink>
          </p>
        </div>

        {formError && <FormMessage tone="error">{formError}</FormMessage>}

        <SubmitButton loading={status === 'loading'} success={status === 'success'}>
          Войти
        </SubmitButton>
      </form>

      <div className="mt-7">
        <ProviderButtons
          dividerLabel="или"
          onGoogle={() => signInWithProvider('google', nextPath)}
          onApple={() => signInWithProvider('apple', nextPath)}
        />
      </div>
    </AuthShell>
  );
}
