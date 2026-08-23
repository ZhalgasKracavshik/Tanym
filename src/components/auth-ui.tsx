'use client';

/**
 * Кирпичики экранов входа и регистрации.
 *
 * Новый дизайн: glassmorphism форма поверх WebGL smokey-background.
 * Логика и хуки не изменились — только визуальная оболочка.
 */

import { useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { EASE_OUT, PressButton, Reveal, SuccessCheck, Spinner, motion } from './motion';
import { SmokeyBackground } from './ui/smokey-background';

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
    <div className="relative min-h-screen w-full overflow-hidden bg-ink-900 flex items-center justify-center p-4">
      {/* WebGL smokey background — тёплая терракота, в тон бренду */}
      <SmokeyBackground color="#d85f2e" />

      {/* Затемняющий оверлей поверх шейдера, в той же тёплой тёмной гамме, что и --gradient-ink */}
      <div className="absolute inset-0 bg-gradient-to-br from-ink-900/70 via-ink-800/50 to-brand-900/50" />

      {/* Glassmorphism карточка */}
      <Reveal immediate className="relative z-10 w-full max-w-sm">
        <div className="rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
          {/* Лого */}
          <div className="mb-6 flex justify-center">
            <Link
              href="/"
              className="inline-block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              <Logo size={32} />
            </Link>
          </div>

          {/* Заголовок */}
          <div className="mb-7 text-center">
            <h1 className="text-3xl font-bold text-white">{title}</h1>
            <p className="mt-2 text-sm text-gray-300">{subtitle}</p>
          </div>

          {/* Контент формы */}
          {children}

          {/* Футер с ссылкой */}
          {footer && (
            <p className="mt-6 text-center text-xs text-gray-400">{footer}</p>
          )}
        </div>
      </Reveal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Поля                                                               */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <div className="relative z-0">
      <input
        {...props}
        placeholder=" "
        className="auth-field peer block w-full appearance-none border-0 border-b-2 border-gray-400/60 bg-transparent py-2.5 px-0 text-sm text-white outline-none transition-colors focus:border-brand-400 focus:ring-0"
      />
      {/*
        peer-autofill добавлен отдельно от peer-[:not(:placeholder-shown)] —
        не косметика, а обход реального расхождения. У автозаполненного
        браузером поля value меняется не так, как при наборе текста рукой,
        и Chrome не всегда пересчитывает :placeholder-shown у него вовремя.
        Подпись оставалась в «пустой» крупной позиции и печаталась прямо
        поверх значения — то раздвоение текста, что видно на скриншоте.
        :autofill матчится у браузера безошибочно, поэтому подпись сворачивается
        и в этом случае тоже.
      */}
      <label className="absolute top-3 -z-10 origin-[0] transform text-sm text-gray-300 duration-300 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:text-brand-400 peer-[:not(:placeholder-shown)]:-translate-y-6 peer-[:not(:placeholder-shown)]:scale-75 peer-autofill:-translate-y-6 peer-autofill:scale-75">
        {label}
      </label>
      {hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>}
    </div>
  );
}

/**
 * Пароль с переключателем видимости.
 */
export function PasswordField({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative z-0">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        placeholder=" "
        className="auth-field peer block w-full appearance-none border-0 border-b-2 border-gray-400/60 bg-transparent py-2.5 px-0 pr-8 text-sm text-white outline-none transition-colors focus:border-brand-400 focus:ring-0"
      />
      {/* peer-autofill — см. комментарий в Field выше: тот же обход для
          сохранённого браузером пароля. */}
      <label className="absolute top-3 -z-10 origin-[0] transform text-sm text-gray-300 duration-300 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:text-brand-400 peer-[:not(:placeholder-shown)]:-translate-y-6 peer-[:not(:placeholder-shown)]:scale-75 peer-autofill:-translate-y-6 peer-autofill:scale-75">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
        className="absolute right-0 top-2 flex h-8 w-8 items-center justify-center text-gray-400 transition-colors hover:text-white"
      >
        <Icon name={visible ? 'eyeOff' : 'eye'} size={16} />
      </button>
      {hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>}
    </div>
  );
}

export function Select({
  label,
  children,
  ...props
}: InputHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return (
    <div className="relative z-0">
      <select
        {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
        className="peer block w-full appearance-none border-0 border-b-2 border-gray-400/60 bg-transparent py-2.5 px-0 text-sm text-white outline-none transition-colors focus:border-brand-400 focus:ring-0 [&>option]:bg-ink-800 [&>option]:text-white"
      >
        {children}
      </select>
      <label className="absolute top-3 -z-10 origin-[0] -translate-y-6 scale-75 transform text-sm text-gray-300 duration-300">
        {label}
      </label>
    </div>
  );
}

/**
 * Поле кода класса: моноширинный шрифт и разрядка.
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
    <div className="relative z-0">
      <input
        value={value}
        onChange={(e) => onValueChange(e.target.value.toUpperCase())}
        maxLength={6}
        placeholder=" "
        autoCapitalize="characters"
        spellCheck={false}
        className="peer block w-full appearance-none border-0 border-b-2 border-gray-400/60 bg-transparent py-2.5 px-0 text-center font-mono text-lg font-bold tracking-[0.3em] text-white outline-none transition-colors focus:border-brand-400 focus:ring-0"
      />
      <label className="absolute top-3 -z-10 origin-[0] transform text-sm text-gray-300 duration-300 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:text-brand-400 peer-[:not(:placeholder-shown)]:-translate-y-6 peer-[:not(:placeholder-shown)]:scale-75">
        {label}
      </label>
      {hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>}
    </div>
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
      className="group flex h-12 w-full items-center justify-center gap-2 rounded-lg text-[15px] font-semibold text-white shadow-lg transition-all duration-300 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-ink-900 disabled:opacity-60"
      style={{ background: 'var(--gradient-brand)' }}
    >
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
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {children}
            <svg
              className="h-5 w-5 transform transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.span>
        )}
      </AnimatePresence>
    </PressButton>
  );
}

/** Сообщение об ошибке или успехе. */
export function FormMessage({ tone, children }: { tone: 'error' | 'success'; children: ReactNode }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border px-4 py-3 text-sm font-medium backdrop-blur-sm ${
        tone === 'error'
          ? 'border-danger-500/30 bg-danger-500/20 text-danger-200'
          : 'border-success-500/30 bg-success-500/20 text-success-200'
      }`}
    >
      {children}
    </motion.p>
  );
}

/* ------------------------------------------------------------------ */
/*  Вход через провайдеров                                             */
/* ------------------------------------------------------------------ */

function GoogleMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.802 8.841C34.553 4.806 29.613 2.5 24 2.5C11.983 2.5 2.5 11.983 2.5 24s9.483 21.5 21.5 21.5S45.5 36.017 45.5 24c0-1.538-.135-3.022-.389-4.417z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12.5 24 12.5c3.059 0 5.842 1.154 7.961 3.039l5.839-5.841C34.553 4.806 29.613 2.5 24 2.5C16.318 2.5 9.642 6.723 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 45.5c5.613 0 10.553-2.306 14.802-6.341l-5.839-5.841C30.842 35.846 27.059 38 24 38c-5.039 0-9.345-2.608-11.124-6.481l-6.571 4.819C9.642 41.277 16.318 45.5 24 45.5z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l5.839 5.841C44.196 35.123 45.5 29.837 45.5 24c0-1.538-.135-3.022-.389-4.417z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
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
      {/* Разделитель */}
      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-gray-400/30" />
        <span className="mx-4 flex-shrink text-xs uppercase tracking-widest text-gray-400">
          {dividerLabel}
        </span>
        <div className="flex-grow border-t border-gray-400/30" />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <PressButton
          type="button"
          onClick={onGoogle}
          className="flex h-11 items-center justify-center gap-2.5 rounded-lg bg-white/90 text-sm font-semibold text-gray-700 transition-all hover:bg-white"
        >
          <GoogleMark />
          Google
        </PressButton>

        <PressButton
          type="button"
          onClick={onApple}
          className="flex h-11 items-center justify-center gap-2.5 rounded-lg bg-gray-900/80 text-sm font-semibold text-white ring-1 ring-white/20 transition-all hover:bg-gray-800"
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
    <Link href={href} className="font-semibold text-brand-400 transition-colors hover:text-brand-300">
      {children}
    </Link>
  );
}

/** Информационный баннер (для учителя) */
export function InfoBanner({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-accent-400/30 bg-accent-500/15 px-4 py-3 text-sm text-accent-200">
      {children}
    </div>
  );
}
