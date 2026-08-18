/**
 * Базовые элементы интерфейса Tanym.
 *
 * Собраны в одном файле намеренно: это маленькие компоненты по 10–30 строк,
 * и держать под каждый отдельный файл здесь было бы дороже, чем полезнее.
 * Все страницы обязаны использовать именно их — так интерфейс остаётся
 * единым, а отступы, радиусы и цвета не разъезжаются от экрана к экрану.
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Кнопка                                                             */
/* ------------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

/*
 * Кнопка слегка проседает под нажатием.
 *
 * Это не украшение: на телефоне палец закрывает кнопку целиком, и смещение
 * на один пиксель остаётся единственным подтверждением, что нажатие засчитано.
 * Смену цвета в этот момент не видно из-под пальца.
 */
const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 disabled:active:translate-y-0';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-500 text-white shadow-[var(--shadow-rest)] hover:bg-brand-600 hover:shadow-[var(--shadow-lift)] active:bg-brand-700 active:shadow-[var(--shadow-rest)]',
  secondary: 'border border-ink-200 bg-white text-ink-800 hover:border-ink-300 hover:bg-ink-50',
  ghost: 'bg-transparent text-brand-600 hover:bg-brand-50',
  danger: 'bg-danger-500 text-white shadow-[var(--shadow-rest)] hover:bg-danger-700',
};

/*
 * Высоты подобраны под палец, а не под курсор: у среднего и крупного размера
 * область нажатия не ниже 44 пикселей, что считается минимумом для сенсорного
 * экрана. Мелкий размер оставлен только для вспомогательных действий в углу
 * карточки, где промах не стоит ученику ничего.
 */
const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'min-h-11 px-4 py-2.5 text-sm',
  lg: 'min-h-12 px-6 py-3 text-base',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
      {...props}
    />
  );
}

/** Ссылка, выглядящая как кнопка. Используется для переходов между экранами. */
export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
    >
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Карточка                                                           */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  return (
    <Tag className={`rounded-2xl border border-ink-200 bg-white p-5 shadow-[var(--shadow-rest)] sm:p-6 ${className}`}>
      {children}
    </Tag>
  );
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h2 className={`text-lg font-bold text-ink-900 ${className}`}>{children}</h2>;
}

/* ------------------------------------------------------------------ */
/*  Бейдж                                                              */
/* ------------------------------------------------------------------ */

type BadgeTone = 'neutral' | 'brand' | 'success' | 'danger' | 'accent';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-ink-100 text-ink-700',
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-success-50 text-success-700',
  danger: 'bg-danger-50 text-danger-700',
  accent: 'bg-accent-50 text-accent-700',
};

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-5 ${BADGE_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Прогресс                                                           */
/* ------------------------------------------------------------------ */

/**
 * Полоса прогресса. Значение — доля от 0 до 1.
 * Цвет меняется по уровню: красный → жёлтый → зелёный, чтобы состояние
 * читалось без чтения цифры.
 */
export function ProgressBar({
  value,
  label,
  showPercent = true,
  className = '',
}: {
  value: number;
  label?: string;
  showPercent?: boolean;
  className?: string;
}) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const tone = percent >= 80 ? 'bg-success-500' : percent >= 50 ? 'bg-accent-400' : 'bg-danger-500';

  return (
    <div className={className}>
      {(label || showPercent) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          {label && <span className="text-sm font-medium text-ink-700">{label}</span>}
          {showPercent && <span className="text-sm font-semibold tabular-nums text-ink-500">{percent}%</span>}
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-ink-100"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Прогресс'}
      >
        <div className={`h-full rounded-full transition-all duration-500 ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Служебные состояния                                                */
/* ------------------------------------------------------------------ */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-soft-pulse rounded-lg bg-ink-100 ${className}`} />;
}

/**
 * Пустое состояние.
 *
 * Иконка задаётся именем из общего набора, а не произвольной строкой: так она
 * подчиняется цвету и толщине линий остального интерфейса и одинаково выглядит
 * на любой системе.
 */
export function EmptyState({
  icon = 'folder',
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-12 text-center">
      <Icon name={icon} size={40} className="text-ink-300" />
      <h3 className="mt-3 text-base font-bold text-ink-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

type AlertTone = 'info' | 'success' | 'danger';

const ALERT_TONES: Record<AlertTone, string> = {
  info: 'border-brand-200 bg-brand-50 text-brand-800',
  success: 'border-success-500/30 bg-success-50 text-success-700',
  danger: 'border-danger-500/30 bg-danger-50 text-danger-700',
};

export function Alert({ tone = 'info', children }: { tone?: AlertTone; children: ReactNode }) {
  return <div className={`rounded-xl border p-4 text-sm ${ALERT_TONES[tone]}`}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/*  Статистика                                                         */
/* ------------------------------------------------------------------ */

/**
 * Карточка метрики.
 *
 * Порядок элементов важен: сначала мелкая подпись, потом крупное число.
 * Взгляд идёт по числам сверху вниз, а подписи читаются только там, где число
 * заинтересовало. Если поменять местами, глазу придётся каждый раз
 * перепрыгивать через текст.
 *
 * Необязательная полоса внизу показывает долю от предела. Она появляется только
 * когда предел действительно есть: полоса без верхней границы ничего не значит.
 */
export function Stat({
  label,
  value,
  hint,
  icon,
  progress,
  progressNote,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: IconName;
  /** Доля заполнения 0..1. Без неё полоса не рисуется. */
  progress?: number;
  /** Подпись справа под полосой, обычно вида «7 из 10». */
  progressNote?: string;
}) {
  const percent = progress === undefined ? null : Math.round(Math.min(1, Math.max(0, progress)) * 100);

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4 transition-all duration-150 hover:border-ink-300 hover:shadow-[var(--shadow-lift)]">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</span>
        {icon && <Icon name={icon} size={16} className="text-ink-300" />}
      </div>

      <div className="mt-1 text-2xl font-bold tabular-nums text-ink-900">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-ink-400">{hint}</div>}

      {percent !== null && (
        <>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="font-semibold tabular-nums text-brand-600">{percent}%</span>
            {progressNote && <span className="tabular-nums text-ink-400">{progressNote}</span>}
          </div>
        </>
      )}
    </div>
  );
}

/** Заголовок раздела страницы. */
export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold text-ink-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
