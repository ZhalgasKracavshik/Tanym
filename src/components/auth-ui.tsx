'use client';

/**
 * Кирпичики экранов входа и регистрации.
 *
 * Вынесены отдельно, потому что четыре страницы (/login, /register,
 * /forgot-password, /reset-password) обязаны выглядеть как один экран
 * в разных состояниях, а не как четыре похожие формы. Общая оболочка
 * гарантирует это лучше, чем копирование разметки.
 */

import { useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { PressButton, Reveal, SuccessCheck, Spinner, motion } from './motion';

/* ------------------------------------------------------------------ */
/*  Оболочка                                                           */
/* ------------------------------------------------------------------ */

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-[calc(100vh-3.5rem)] items-center justify-center overflow-hidden px-4 py-14">
      {/* То же тёплое свечение, что на первом экране лендинга: вход должен
          ощущаться частью продукта, а не служебной страницей. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-32 -z-10 h-[30rem] opacity-70 blur-3xl"
        style={{
          background:
            'radial-gradient(40% 50% at 50% 40%, rgb(229 117 69 / 0.24) 0%, rgb(253 243 238 / 0.5) 45%, transparent 72%)',
        }}
      />

      <Reveal className="w-full max-w-md">
        <div className="rounded-[var(--radius-card)] border border-ink-200/80 bg-white p-8 shadow-[var(--shadow-float)] sm:p-10">
          <div className="flex justify-center">
            <Logo />
          </div>
          <h1 className="mt-7 text-center text-2xl font-semibold text-ink-900">{title}</h1>
          <p className="mt-2 text-center text-sm leading-relaxed text-ink-500">{subtitle}</p>

          <div className="mt-8">{children}</div>
        </div>

        {footer && <div className="mt-6 text-center text-sm text-ink-500">{footer}</div>}
      </Reveal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Поля                                                               */
/* ------------------------------------------------------------------ */

const FIELD_CLASS =
  'h-12 w-full rounded-[var(--radius-control)] border border-ink-200 bg-white px-4 text-[15px] text-ink-900 outline-none transition-all duration-150 placeholder:text-ink-300 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 disabled:bg-ink-50';

export function Field({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-ink-800">{label}</span>
      <input {...props} className={FIELD_CLASS} />
      {hint && <span className="mt-1.5 block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

/**
 * Пароль с переключателем видимости.
 *
 * Глаз нужен не для красоты: на телефоне пароль набирают вслепую и
 * ошибаются, а единственная альтернатива — вводить заново с нуля.
 */
export function PasswordField({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-ink-800">{label}</span>
      <span className="relative block">
        <input {...props} type={visible ? 'text' : 'password'} className={`${FIELD_CLASS} pr-12`} />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
          className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-[12px] text-ink-400 transition-colors hover:text-ink-700"
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} size={18} />
        </button>
      </span>
      {hint && <span className="mt-1.5 block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

export function Select({
  label,
  children,
  ...props
}: InputHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-ink-800">{label}</span>
      <select
        {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
        className={FIELD_CLASS}
      >
        {children}
      </select>
    </label>
  );
}

/**
 * Поле кода класса: моноширинный шрифт и разрядка.
 *
 * Код диктуют вслух или списывают с доски, и в обычном шрифте
 * легко перепутать похожие символы. Ввод сразу приводится к верхнему
 * регистру, чтобы «k7x9qf» и «K7X9QF» не считались разными кодами.
 */
export function ClassCodeField({
  value,
  onValueChange,
  label,
  hint,
}: {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-ink-800">{label}</span>
      <input
        value={value}
        onChange={(event) => onValueChange(event.target.value.toUpperCase())}
        maxLength={6}
        placeholder="K7X9QF"
        autoCapitalize="characters"
        spellCheck={false}
        className={`${FIELD_CLASS} text-center font-mono text-lg font-bold tracking-[0.3em]`}
      />
      {hint && <span className="mt-1.5 block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Кнопки и состояния                                                 */
/* ------------------------------------------------------------------ */

export function SubmitButton({
  children,
  loading,
  success,
  disabled,
  onClick,
  type = 'submit',
}: {
  children: ReactNode;
  loading?: boolean;
  success?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'submit' | 'button';
}) {
  return (
    <PressButton
      type={type}
      onClick={onClick}
      disabled={disabled || loading || success}
      className="flex h-13 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] py-3.5 text-[15px] font-bold text-white shadow-[var(--shadow-glow)] transition-opacity duration-200 disabled:opacity-60 disabled:shadow-none"
      style={{ background: success ? 'var(--color-success-500)' : 'var(--gradient-brand)' }}
    >
      {/* mode="wait" обязателен: без него старое и новое содержимое
          накладываются друг на друга и кнопка дёргается по ширине. */}
      <AnimatePresence mode="wait" initial={false}>
        {success ? (
          <motion.span
            key="success"
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SuccessCheck size={18} />
            Готово
          </motion.span>
        ) : loading ? (
          <motion.span
            key="loading"
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Spinner />
            Секунду…
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </PressButton>
  );
}

/** Сообщение об ошибке или успехе над кнопкой. */
export function FormMessage({ tone, children }: { tone: 'error' | 'success'; children: ReactNode }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-[var(--radius-control)] border px-4 py-3 text-sm font-medium ${
        tone === 'error'
          ? 'border-danger-200 bg-danger-50 text-danger-700'
          : 'border-success-200 bg-success-50 text-success-700'
      }`}
    >
      {children}
    </motion.p>
  );
}

/* ------------------------------------------------------------------ */
/*  Вход через провайдеров                                             */
/* ------------------------------------------------------------------ */

/** Логотип Google. Внутри цветные пути, поэтому не из общего набора иконок. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.05 12.54c.02-2.1 1.72-3.1 1.8-3.15-.98-1.44-2.5-1.63-3.05-1.65-1.3-.13-2.54.76-3.2.76-.66 0-1.68-.74-2.76-.72-1.42.02-2.73.82-3.46 2.09-1.47 2.56-.38 6.35 1.06 8.43.7 1.02 1.54 2.16 2.64 2.12 1.06-.04 1.46-.68 2.74-.68 1.28 0 1.64.68 2.76.66 1.14-.02 1.86-1.04 2.56-2.06.8-1.18 1.13-2.32 1.15-2.38-.03-.01-2.2-.85-2.24-3.36ZM14.96 5.4c.58-.71.97-1.7.86-2.68-.84.03-1.86.56-2.46 1.26-.53.63-1 1.63-.87 2.59.94.07 1.9-.47 2.47-1.17Z" />
    </svg>
  );
}

export function ProviderButtons({
  onGoogle,
  onApple,
  dividerLabel,
}: {
  onGoogle: () => void;
  onApple: () => void;
  dividerLabel: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-ink-200" />
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
          {dividerLabel}
        </span>
        <span className="h-px flex-1 bg-ink-200" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <PressButton
          type="button"
          onClick={onGoogle}
          className="flex h-12 items-center justify-center gap-2.5 rounded-[var(--radius-control)] border border-ink-200 bg-white text-sm font-semibold text-ink-700 shadow-[var(--shadow-rest)] transition-colors hover:border-ink-300"
        >
          <GoogleMark />
          Google
        </PressButton>

        <PressButton
          type="button"
          onClick={onApple}
          className="flex h-12 items-center justify-center gap-2.5 rounded-[var(--radius-control)] border border-ink-900 bg-ink-900 text-sm font-semibold text-white shadow-[var(--shadow-rest)] transition-colors hover:bg-ink-800"
        >
          <AppleMark />
          Apple
        </PressButton>
      </div>
    </div>
  );
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-brand-600 transition-colors hover:text-brand-700">
      {children}
    </Link>
  );
}
