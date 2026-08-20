'use client';

/**
 * Вход в аккаунт: почта с паролем, Google или Apple.
 *
 * Три способа рядом, а не только один: школьная почта на Google есть не
 * у каждой школы, а требовать пароль от того, у кого она есть, — лишний шаг.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

/** Сообщения Supabase приходят по-английски — переводим частые. */
function translateError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Неверная почта или пароль.';
  if (/email not confirmed/i.test(message)) return 'Почта не подтверждена — проверьте письмо.';
  if (/rate limit|too many/i.test(message)) return 'Слишком много попыток. Подождите минуту.';
  return message;
}

export default function LoginPage() {
  const router = useRouter();
  const { signInWithPassword, signInWithProvider } = useSchoolAuth();

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
    router.push('/dashboard');
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
          onGoogle={() => signInWithProvider('google', '/dashboard')}
          onApple={() => signInWithProvider('apple', '/dashboard')}
        />
      </div>
    </AuthShell>
  );
}
