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
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [repeatError, setRepeatError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  // Перекидываем на дашборд после успеха, но не мгновенно: пользователь
  // должен успеть увидеть, что пароль действительно сменился.
  useEffect(() => {
    if (status !== 'success') return;
    const timer = setTimeout(() => router.push('/dashboard'), 1200);
    return () => clearTimeout(timer);
  }, [status, router]);

  async function submit() {
    setPasswordError(undefined);
    setRepeatError(undefined);
    setFormError(null);
    setShakeKey((k) => k + 1);

    let hasError = false;
    if (password.length < 6) {
      setPasswordError('Пароль должен быть не короче 6 символов.');
      hasError = true;
    }
    if (password !== repeat) {
      setRepeatError('Пароли не совпадают.');
      hasError = true;
    }
    if (hasError) return;

    setStatus('loading');
    const result = await updatePassword(password);

    if (!result.ok) {
      setStatus('idle');
      setFormError(
        /session|expired|invalid/i.test(result.error ?? '')
          ? 'Ссылка устарела. Запросите новое письмо.'
          : (result.error ?? 'Не удалось сменить пароль.'),
      );
      setShakeKey((k) => k + 1);
      return;
    }

    setStatus('success');
  }

  return (
    <AuthShell
      heroTitle="Почти готово"
      heroText="Придумайте пароль, который не используете больше нигде, и возвращайтесь к учёбе."
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
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <PasswordField
            label="Новый пароль"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (passwordError) setPasswordError(undefined);
            }}
            hint="Не меньше 6 символов."
            error={passwordError}
            shakeKey={shakeKey}
          />

          <PasswordField
            label="Ещё раз"
            autoComplete="new-password"
            placeholder="••••••••"
            value={repeat}
            onChange={(event) => {
              setRepeat(event.target.value);
              if (repeatError) setRepeatError(undefined);
            }}
            error={repeatError}
            shakeKey={shakeKey}
          />

          {formError && <FormMessage tone="error">{formError}</FormMessage>}
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
