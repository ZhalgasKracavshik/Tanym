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

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useSchoolAuth();

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim()) {
      setError('Введите адрес почты.');
      return;
    }
    setError(null);
    setStatus('loading');

    const result = await sendPasswordReset(email.trim());
    if (!result.ok) {
      setStatus('idle');
      setError(
        /rate limit|too many/i.test(result.error ?? '')
          ? 'Слишком много запросов. Подождите минуту.'
          : (result.error ?? 'Не удалось отправить письмо.'),
      );
      return;
    }

    setStatus('sent');
  }

  return (
    <AuthShell
      title="Восстановление пароля"
      subtitle="Пришлём ссылку для смены пароля на вашу почту."
      footer={
        <>
          Вспомнили пароль? <AuthLink href="/login">Войти</AuthLink>
        </>
      }
    >
      {status === 'sent' ? (
        <FormMessage tone="success">
          Если такая почта зарегистрирована, письмо уже в пути. Проверьте входящие и папку «Спам».
        </FormMessage>
      ) : (
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

          {error && <FormMessage tone="error">{error}</FormMessage>}

          <SubmitButton loading={status === 'loading'}>Отправить ссылку</SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
