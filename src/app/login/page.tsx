'use client';

/**
 * Вход в аккаунт: почта с паролем, Google или Apple.
 *
 * Три способа рядом, а не только один: школьная почта на Google есть не
 * у каждой школы, а требовать пароль от того, у кого она есть
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
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim() || !password) {
      setError('Заполните почту и пароль.');
      return;
    }
    setError(null);
    setStatus('loading');

    const result = await signInWithPassword(email.trim(), password);
    if (!result.ok) {
      setStatus('idle');
      setError(translateError(result.error ?? 'Не удалось войти.'));
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
      title="С возвращением"
      subtitle="Войдите, чтобы продолжить с того места, где остановились."
      footer={
        <>
          Ещё нет аккаунта? <AuthLink href="/register">Зарегистрироваться</AuthLink>
        </>
      }
    >
      <form
        className="space-y-5"
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
          onChange={(event) => setEmail(event.target.value)}
        />

        <div>
          <PasswordField
            label="Пароль"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <p className="mt-2 text-right text-sm">
            <AuthLink href="/forgot-password">Забыли пароль?</AuthLink>
          </p>
        </div>

        {error && <FormMessage tone="error">{error}</FormMessage>}

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
