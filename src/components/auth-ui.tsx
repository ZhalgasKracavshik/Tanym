'use client';

/**
 * Кирпичики экранов входа, регистрации и сброса пароля.
 *
 * Раньше эти экраны были тёмным стеклянным дизайном поверх WebGL-дыма —
 * ровно тем, что не совпадает со стилем остального сайта: Taным нигде
 * больше не тёмный, у него белые карточки на `--radius-card`,
 * `--shadow-rest` и терракотовый акцент. Теперь форма живёт на такой же
 * белой карточке, а тёмная дымка осталась только в декоративной левой
 * колонке — том же приёме, что уже используется в кабинете и профиле
 * (тёмная панель-акцент внутри светлой страницы).
 */

import { useEffect, useId, useRef, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import { Icon, type IconName } from './Icon';
import { Logo } from './Logo';
import { EASE_OUT, PressButton, Reveal, SuccessCheck, Spinner, motion } from './motion';
import { SmokeyBackground } from './ui/smokey-background';
import { useStore } from './StoreProvider';
import { LANGUAGES } from '@/lib/i18n-shared';

/* ------------------------------------------------------------------ */
/*  Оболочка: тёплая колонка слева, белая карточка формы справа        */
/* ------------------------------------------------------------------ */

interface HeroFeature {
  icon: IconName;
  text: string;
}

/*
  Появление содержимого левой колонки по очереди, а не всё разом.

  StaggerGroup из motion.tsx для этого не подходит: он ждёт попадания в
  область просмотра (`whileInView`), а колонка видна сразу при открытии
  страницы — ждать прокрутки, которой не будет, значит остаться
  невидимой навсегда. Здесь нужен `animate`, а не `whileInView`.
*/
const heroParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};
const heroChild = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: EASE_OUT },
};

/**
 * Переключатель языка в углу экрана.
 *
 * Без него локализация формы бесполезна тому, кто попал на регистрацию
 * впервые (по прямой ссылке из объявления, например): выбрать казахский
 * или английский было бы негде — сайдбар с таким переключателем сюда не
 * попадает, эти маршруты рендерятся без него намеренно. `fixed`, а не
 * часть колонки: колонка с формой сама прокручивается, и переключатель
 * внутри неё уезжал бы вместе с полями при скролле на невысоком экране.
 */
function LanguageCorner() {
  const { state, setLanguage } = useStore();
  return (
    <div
      role="group"
      aria-label="RU / KZ / EN"
      className="fixed right-3 top-3 z-30 flex rounded-lg border border-ink-200 bg-white/95 p-0.5 shadow-[var(--shadow-rest)] backdrop-blur lg:right-5 lg:top-5"
    >
      {LANGUAGES.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setLanguage(item.id)}
          title={item.title}
          aria-pressed={state.language === item.id}
          className={`rounded-md px-2 py-1 text-[11px] font-medium outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
            state.language === item.id ? 'bg-brand-500 text-white shadow-sm' : 'text-ink-400 hover:text-ink-700'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function AuthShell({
  heroTitle,
  heroText,
  heroFeatures,
  title,
  subtitle,
  children,
  footer,
}: {
  heroTitle: string;
  /** Необязателен: список фактов о продукте иногда достаточен сам по себе. */
  heroText?: string;
  heroFeatures?: HeroFeature[];
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    // div, а не main: AppShell уже оборачивает бесшовные маршруты (в том
    // числе этот) в свой <main>, и два <main> на странице — не разметка,
    // а поломанная семантика документа.
    <div className="flex min-h-screen w-full bg-[var(--gradient-warm)] p-2 lg:h-screen lg:p-4">
      <LanguageCorner />
      {/*
        Левая колонка: та же тёмная дымка в терракоту, что и раньше во всей
        оболочке, — но теперь как один акцентный блок среди светлой
        страницы, а не как фон для всего экрана. Тот же приём уже стоит в
        кабинете и в профиле (тёмная панель-акцент на градиенте
        --gradient-ink внутри светлого макета).
      */}
      <div className="relative hidden h-full w-[43%] shrink-0 overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-float)] lg:flex lg:flex-col lg:justify-between">
        <SmokeyBackground color="#d85f2e" />

        <Link
          href="/"
          className="relative z-10 flex w-fit items-center gap-2 p-8 outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {/* Цвет задан здесь, а не внутри знака: на тёмной дымке нужен белый. */}
          <Logo size={30} className="text-white" />
        </Link>

        <motion.div
          variants={heroParent}
          initial="hidden"
          animate="show"
          className="relative z-10 space-y-7 p-10 pb-12"
        >
          <motion.div variants={heroChild}>
            <h1 className="text-[2.35rem] font-medium leading-[1.1] tracking-tight text-balance text-white">
              {heroTitle}
            </h1>
            {heroText && <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-white/75">{heroText}</p>}
          </motion.div>

          {/*
            Список фактов — без карточек-«таблеток» со стеклом и размытием.
            Такая плашка (полупрозрачный фон, тонкая рамка, backdrop-blur)
            стала одним из самых узнаваемых штампов ИИ-сгенерированного
            дизайна: три из них подряд читаются как типовой шаблон, а не
            как решение для конкретного продукта. Значок и строка текста
            прямо на дымке достаточно заметны сами по себе.
          */}
          {heroFeatures && (
            <ul className="space-y-3.5">
              {heroFeatures.map((feature) => (
                <motion.li key={feature.text} variants={heroChild} className="flex items-start gap-3">
                  <Icon name={feature.icon} size={17} className="mt-0.5 shrink-0 text-white/70" />
                  <span className="text-[15px] leading-snug text-white/90">{feature.text}</span>
                </motion.li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>

      {/*
        Правая колонка: форма на обычной белой карточке — Card в остальном
        сайте выглядит так же.

        Прокрутка внутри колонки, а не запрет на неё: с фиксированной
        высотой lg:h-screen форма регистрации (шесть полей плюс кнопки)
        на невысоком экране ноутбука не помещалась целиком, а
        lg:overflow-hidden просто обрезал нижнюю часть без какого-либо
        способа до неё докрутить.
      */}
      {/*
        items-center-safe, а не items-center: обычное центрирование по
        кросс-оси не даёт долистать до начала содержимого, если оно выше
        контейнера — браузер считает «начало» уже центрированным и не
        пускает прокрутку в область над ним. safe откатывается на
        выравнивание по краю ровно тогда, когда контент не помещается, и
        именно так карточка регистрации (шесть полей) стала доскроллиться
        до самого заголовка на невысоком экране ноутбука.
      */}
      <div className="flex flex-1 items-center-safe justify-center overflow-y-auto px-4 py-10 sm:px-8 lg:py-10">
        <Reveal immediate className="w-full max-w-sm">
          <div className="mb-6 flex justify-center lg:hidden">
            <Link href="/" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
              <Logo size={30} />
            </Link>
          </div>

          <div className="rounded-[var(--radius-card)] border border-ink-200 bg-white p-7 shadow-[var(--shadow-rest)] sm:p-8">
            <div className="mb-6 text-center lg:text-left">
              <h2 className="text-2xl font-medium tracking-tight text-ink-900">{title}</h2>
              <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>
            </div>

            {children}

            {footer && <p className="mt-6 text-center text-sm text-ink-500">{footer}</p>}
          </div>
        </Reveal>
      </div>
    </div>
  );
}

/**
 * Переключатель из двух вариантов вместо нативного `<select>`.
 *
 * Роль — не поле ввода, а решение из ровно двух вариантов, и нативный
 * список с плавающей подписью выглядел как обычное текстовое поле: подпись
 * «Я» из одной буквы зависала над значением почти без связи с ним, а сам
 * факт выбора терялся за выпадающим списком. Две видимые кнопки читаются
 * как переключатель сразу, без разворачивания.
 */
export function SegmentedToggle<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon: IconName }[];
}) {
  const groupId = useId();
  return (
    <div>
      <span id={groupId} className="text-sm font-medium text-ink-700">
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={groupId} className="mt-2 grid grid-cols-2 gap-2.5">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={`flex items-center justify-center gap-2 rounded-[var(--radius-control)] border-2 py-3 text-sm font-semibold outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
                active
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-ink-200 text-ink-500 hover:border-ink-300'
              }`}
            >
              <Icon name={option.icon} size={16} className={active ? 'text-brand-600' : 'text-ink-400'} />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Поля                                                               */
/* ------------------------------------------------------------------ */

/**
 * Держит последний непустой текст ошибки.
 *
 * Нужен ради самого перехода: `.t-error-msg` тает по `opacity` 220 мс, а
 * если текст убрать из React в тот же момент, что и класс `is-error`,
 * сообщение исчезнет мгновенно и будет таять уже пустая строка — на
 * глаз это читалось бы как «текст оборвался», а не «сообщение аккуратно ушло».
 *
 * setState вызывается прямо в теле рендера, а не в эффекте: это тот самый
 * официально одобренный React случай «подстроить состояние под новый
 * проп» (сравнение с предыдущим значением перед вызовом не даёт уйти в
 * бесконечный цикл). Через эффект пришлось бы ждать лишний кадр после
 * покраски — сообщение на мгновение показывало бы старый текст, прежде
 * чем эффект успевал его обновить.
 */
function useStickyMessage(value?: string): string | undefined {
  const [sticky, setSticky] = useState(value);
  if (value && value !== sticky) setSticky(value);
  return sticky;
}

/**
 * Запускает встряску поля заново на каждую новую попытку отправки.
 *
 * `shakeKey` — счётчик, который растёт при каждом submit(), а не только
 * при неудачном: поле само решает, трясти ли себя, глядя на `error` в
 * момент изменения счётчика. Класс снимается, вызывается reflow и
 * добавляется заново — иначе повторная ошибка на том же поле не
 * переиграла бы анимацию, потому что класс формально не менялся.
 */
function useShake(elementRef: React.RefObject<HTMLElement | null>, error: string | undefined, shakeKey?: number) {
  const lastKey = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (shakeKey === undefined || shakeKey === lastKey.current) return;
    lastKey.current = shakeKey;
    if (!error) return;
    const el = elementRef.current;
    if (!el) return;
    el.classList.remove('is-shaking');
    void el.offsetWidth;
    el.classList.add('is-shaking');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shakeKey, error]);
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  /** Текст ошибки. Пока задан — рамка красная, поле трясётся при новом shakeKey. */
  error?: string;
  /** Счётчик попыток отправки формы — растёт на каждый submit(), см. useShake. */
  shakeKey?: number;
};

export function Field({ label, hint, error, shakeKey, id, className, ...props }: FieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const inputRef = useRef<HTMLInputElement>(null);
  const displayError = useStickyMessage(error);
  useShake(inputRef, error, shakeKey);

  return (
    <div className={`t-input-wrap relative z-0 ${error ? 'is-error' : ''}`}>
      <input
        {...props}
        ref={inputRef}
        id={fieldId}
        placeholder=" "
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={`t-input peer block w-full appearance-none border-0 border-b-2 bg-transparent px-0 pt-5 pb-1.5 text-[15px] text-ink-900 outline-none transition-colors focus:ring-0 ${
          error ? 'is-error' : ''
        } ${className ?? ''}`}
      />
      {/*
        peer-autofill добавлен отдельно от peer-[:not(:placeholder-shown)] —
        не косметика, а обход реального расхождения. У автозаполненного
        браузером поля value меняется не так, как при наборе текста рукой,
        и Chrome не всегда пересчитывает :placeholder-shown у него вовремя.
        Подпись оставалась в «пустой» крупной позиции и печаталась прямо
        поверх значения. :autofill матчится у браузера безошибочно, поэтому
        подпись сворачивается и в этом случае тоже.
      */}
      <label
        htmlFor={fieldId}
        className="absolute top-4 -z-10 origin-[0] -translate-y-0 scale-100 transform text-sm text-ink-400 duration-300 peer-focus:-translate-y-7 peer-focus:scale-75 peer-focus:text-brand-600 peer-[:not(:placeholder-shown)]:-translate-y-7 peer-[:not(:placeholder-shown)]:scale-75 peer-autofill:-translate-y-7 peer-autofill:scale-75"
      >
        {label}
      </label>
      {hint && !error && <span className="mt-1.5 block text-xs text-ink-400">{hint}</span>}
      <p id={`${fieldId}-error`} className="t-error-msg mt-1.5 text-xs font-medium text-danger-600" role="alert">
        {displayError}
      </p>
    </div>
  );
}

/**
 * Пароль с переключателем видимости и той же тряской при ошибке.
 */
export function PasswordField({
  label,
  hint,
  error,
  shakeKey,
  id,
  className,
  ...props
}: FieldProps) {
  const [visible, setVisible] = useState(false);
  const autoId = useId();
  const fieldId = id ?? autoId;
  const inputRef = useRef<HTMLInputElement>(null);
  const displayError = useStickyMessage(error);
  useShake(inputRef, error, shakeKey);

  return (
    <div className={`t-input-wrap relative z-0 ${error ? 'is-error' : ''}`}>
      <input
        {...props}
        ref={inputRef}
        id={fieldId}
        type={visible ? 'text' : 'password'}
        placeholder=" "
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={`t-input peer block w-full appearance-none border-0 border-b-2 bg-transparent px-0 pt-5 pb-1.5 pr-8 text-[15px] text-ink-900 outline-none transition-colors focus:ring-0 ${
          error ? 'is-error' : ''
        } ${className ?? ''}`}
      />
      <label
        htmlFor={fieldId}
        className="absolute top-4 -z-10 origin-[0] -translate-y-0 scale-100 transform text-sm text-ink-400 duration-300 peer-focus:-translate-y-7 peer-focus:scale-75 peer-focus:text-brand-600 peer-[:not(:placeholder-shown)]:-translate-y-7 peer-[:not(:placeholder-shown)]:scale-75 peer-autofill:-translate-y-7 peer-autofill:scale-75"
      >
        {label}
      </label>
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
        className="absolute right-0 top-4 flex h-8 w-8 items-center justify-center text-ink-400 transition-colors hover:text-ink-700"
      >
        <Icon name={visible ? 'eyeOff' : 'eye'} size={16} />
      </button>
      {hint && !error && <span className="mt-1.5 block text-xs text-ink-400">{hint}</span>}
      <p id={`${fieldId}-error`} className="t-error-msg mt-1.5 text-xs font-medium text-danger-600" role="alert">
        {displayError}
      </p>
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
  error,
  shakeKey,
}: {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  hint?: string;
  error?: string;
  shakeKey?: number;
}) {
  const autoId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const displayError = useStickyMessage(error);
  useShake(inputRef, error, shakeKey);

  return (
    <div className={`t-input-wrap relative z-0 ${error ? 'is-error' : ''}`}>
      <input
        ref={inputRef}
        id={autoId}
        value={value}
        onChange={(event) => onValueChange(event.target.value.toUpperCase())}
        maxLength={6}
        placeholder=" "
        autoCapitalize="characters"
        spellCheck={false}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${autoId}-error` : undefined}
        className={`t-input peer block w-full appearance-none border-0 border-b-2 bg-transparent px-0 pt-5 pb-1.5 text-center font-mono text-lg font-medium tracking-[0.3em] text-ink-900 outline-none transition-colors focus:ring-0 ${
          error ? 'is-error' : ''
        }`}
      />
      <label
        htmlFor={autoId}
        className="absolute top-4 -z-10 origin-[0] -translate-y-0 scale-100 transform text-sm text-ink-400 duration-300 peer-focus:-translate-y-7 peer-focus:scale-75 peer-focus:text-brand-600 peer-[:not(:placeholder-shown)]:-translate-y-7 peer-[:not(:placeholder-shown)]:scale-75"
      >
        {label}
      </label>
      {hint && !error && <span className="mt-1.5 block text-xs text-ink-400">{hint}</span>}
      <p id={`${autoId}-error`} className="t-error-msg mt-1.5 text-xs font-medium text-danger-600" role="alert">
        {displayError}
      </p>
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
      className="group flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] text-[15px] font-semibold text-white shadow-[var(--shadow-rest)] transition-all duration-300 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-60"
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

/** Сообщение о ходе дела, ошибке или успехе, не привязанное к полю. */
const MESSAGE_TONES = {
  error: 'border-danger-200 bg-danger-50 text-danger-700',
  success: 'border-success-200 bg-success-50 text-success-700',
  // Нейтральный тон: «проверяем ссылку» — не ошибка и не успех, и красным
  // это писать нельзя, иначе человек читает промежуточное состояние как отказ.
  info: 'border-ink-200 bg-ink-50 text-ink-600',
} as const;

export function FormMessage({
  tone,
  children,
}: {
  tone: keyof typeof MESSAGE_TONES;
  children: ReactNode;
}) {
  return (
    <motion.p
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-[var(--radius-control)] border px-4 py-3 text-sm font-medium ${MESSAGE_TONES[tone]}`}
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

/**
 * Только Google.
 *
 * Apple был на этих кнопках с самого начала оболочки, но Sign in with
 * Apple требует платного аккаунта разработчика и отдельной настройки в
 * консоли Apple — в проекте она не сделана. Кнопка была декорацией:
 * ни один пользователь не вошёл через неё ни разу (проверено по базе:
 * ноль записей auth.identities с provider = apple против пяти через
 * Google), и после нажатия человек утыкался в ошибку. Рабочая кнопка
 * лучше нерабочей, даже если их было две.
 */
export function ProviderButtons({
  onGoogle,
  dividerLabel,
}: {
  onGoogle: () => void;
  dividerLabel: string;
}) {
  return (
    <div>
      <div className="relative flex items-center py-1">
        <div className="flex-grow border-t border-ink-200" />
        <span className="mx-4 flex-shrink text-xs font-semibold uppercase tracking-widest text-ink-400">
          {dividerLabel}
        </span>
        <div className="flex-grow border-t border-ink-200" />
      </div>

      <PressButton
        type="button"
        onClick={onGoogle}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2.5 rounded-[var(--radius-control)] border border-ink-200 bg-white text-sm font-semibold text-ink-700 transition-all hover:bg-ink-50"
      >
        <GoogleMark />
        Google
      </PressButton>
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

/** Информационный баннер (для учителя) */
export function InfoBanner({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-control)] border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-700">
      {children}
    </div>
  );
}
