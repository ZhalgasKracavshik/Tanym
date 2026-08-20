'use client';

/**
 * Установка нового пароля по ссылке из письма.
 *
 * Ссылка приводит сюда уже с временной сессией — Supabase обменивает
 * токен из адреса на неё автоматически. Поэтому отдельного поля «старый
 * пароль» здесь нет: доступ к почте и есть подтверждение.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthLink, AuthShell, FormMessage, PasswordField, SubmitButton } from '@/components/auth-ui';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { updatePassword, isSignedIn, loading } = useSchoolAuth();

  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Перекидываем на дашборд после успеха, но не мгновенно: пользователь
  // должен успеть увидеть, что пароль действительно сменился.
  useEffect(() => {
    if (status !== 'success') return;
    const timer = setTimeout(() => router.push('/dashboard'), 1200);
    return () => clearTimeout(timer);
  }, [status, router]);

  async function submit() {
    setError(null);

    if (password.length < 6) return setError('Пароль должен быть не короче 6 символов.');
    if (password !== repeat) return setError('Пароли не совпадают.');

    setStatus('loading');
    const result = await updatePassword(password);

    if (!result.ok) {
      setStatus('idle');
      setError(
        /session|expired|invalid/i.test(result.error ?? '')
          ? 'Ссылка устарела. Запросите новое письмо.'
          : (result.error ?? 'Не удалось сменить пароль.'),
      );
      return;
    }

    setStatus('success');
  }

  return (
    <AuthShell
      title="Новый пароль"
      subtitle="Придумайте пароль, который не используете больше нигде."
      footer={
        <>
          Ссылка не работает? <AuthLink href="/forgot-password">Запросить новую</AuthLink>
        </>
      }
    >
      {/* Сессии нет и загрузка кончилась — значит по ссылке не пришли
          или она просрочена. Показать форму было бы обманом: сохранить
          пароль всё равно не выйдет. */}
      {!loading && !isSignedIn ? (
        <FormMessage tone="error">
          Похоже, ссылка устарела или открыта не из письма. Запросите новое письмо для сброса.
        </FormMessage>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <PasswordField
            label="Новый пароль"
            autoComplete="new-password"
            placeholder="Не меньше 6 символов"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <PasswordField
            label="Ещё раз"
            autoComplete="new-password"
            placeholder="Повторите пароль"
            value={repeat}
            onChange={(event) => setRepeat(event.target.value)}
          />

          {error && <FormMessage tone="error">{error}</FormMessage>}
          {status === 'success' && (
            <FormMessage tone="success">Пароль обновлён. Открываем кабинет…</FormMessage>
          )}

          <SubmitButton loading={status === 'loading'} success={status === 'success'}>
            Сохранить пароль
          </SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
