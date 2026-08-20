'use client';

/**
 * Регистрация: одна форма, а не мастер из шагов.
 *
 * Роль выбирается здесь же и переключает следующее поле: ученику нужен код
 * класса, учителю — ничего. Мастер из трёх экранов на такой объём данных
 * только добавил бы кликов.
 *
 * Профиль (роль и класс) создаётся отдельным запросом после того, как
 * появилась сессия: роль хранится в нашей таблице profiles, а не в
 * учётной записи Supabase, и до входа записать её некуда.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AuthLink,
  AuthShell,
  ClassCodeField,
  Field,
  FormMessage,
  PasswordField,
  ProviderButtons,
  Select,
  SubmitButton,
} from '@/components/auth-ui';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';

function translateError(message: string): string {
  if (/already registered|already exists/i.test(message)) {
    return 'Такая почта уже зарегистрирована — попробуйте войти.';
  }
  if (/password.*at least|weak password/i.test(message)) {
    return 'Пароль слишком короткий: нужно не меньше 6 символов.';
  }
  if (/invalid email/i.test(message)) return 'Проверьте адрес почты.';
  if (/rate limit|too many/i.test(message)) return 'Слишком много попыток. Подождите минуту.';
  return message;
}

const CLASS_CODE_ERRORS: Record<string, string> = {
  class_not_found: 'Класс с таким кодом не найден. Проверьте код у учителя.',
  class_code_required: 'Введите код класса.',
};

export default function RegisterPage() {
  const router = useRouter();
  const { signUpWithPassword, chooseRole, signInWithProvider } = useSchoolAuth();

  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [classCode, setClassCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setNotice(null);

    if (!name.trim()) return setError('Как вас зовут?');
    if (!email.trim() || !password) return setError('Заполните почту и пароль.');
    if (role === 'student' && classCode.trim().length === 0) {
      return setError('Введите код класса — его даёт учитель.');
    }

    setStatus('loading');
    const signUp = await signUpWithPassword(email.trim(), password, name.trim());

    if (!signUp.ok) {
      setStatus('idle');
      setError(translateError(signUp.error ?? 'Не удалось зарегистрироваться.'));
      return;
    }

    // Подтверждение почты включено — сессии ещё нет, профиль создать нельзя.
    // Честно говорим об этом вместо того, чтобы молча выкинуть на дашборд.
    if (signUp.needsConfirmation) {
      setStatus('idle');
      setNotice(
        'Мы отправили письмо для подтверждения. Откройте ссылку из него, затем войдите — и мы спросим роль.',
      );
      return;
    }

    const profile = await chooseRole(role, classCode.trim());
    if (!profile.ok) {
      setStatus('idle');
      setError(CLASS_CODE_ERRORS[profile.error ?? ''] ?? profile.error ?? 'Не удалось создать профиль.');
      return;
    }

    setStatus('success');
    router.push(role === 'teacher' ? '/teacher' : '/dashboard');
  }

  return (
    <AuthShell
      title="Создать аккаунт"
      subtitle="Ученику — персональный план и рейтинг. Учителю — прогресс всего класса."
      footer={
        <>
          Уже есть аккаунт? <AuthLink href="/login">Войти</AuthLink>
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
          label="Имя и фамилия"
          autoComplete="name"
          placeholder="Айсултан Жакыпов"
          value={name}
          onChange={(event) => setName(event.target.value)}
          hint="Так вас увидят одноклассники в рейтинге."
        />

        <Select
          label="Я"
          value={role}
          onChange={(event) => setRole(event.target.value as 'student' | 'teacher')}
        >
          <option value="student">Ученик</option>
          <option value="teacher">Учитель</option>
        </Select>

        {/* Код класса только у ученика: учитель класс создаёт, а не входит в него */}
        {role === 'student' && (
          <ClassCodeField
            label="Код класса"
            value={classCode}
            onValueChange={setClassCode}
            hint="Шесть символов, их даёт классный руководитель."
          />
        )}

        {role === 'teacher' && (
          <p className="rounded-[var(--radius-control)] border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
            После регистрации вы получите код класса — раздайте его ученикам.
          </p>
        )}

        <Field
          label="Почта"
          type="email"
          autoComplete="email"
          placeholder="name@binom.edu.kz"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <PasswordField
          label="Пароль"
          autoComplete="new-password"
          placeholder="Не меньше 6 символов"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error && <FormMessage tone="error">{error}</FormMessage>}
        {notice && <FormMessage tone="success">{notice}</FormMessage>}

        <SubmitButton loading={status === 'loading'} success={status === 'success'}>
          Зарегистрироваться
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
