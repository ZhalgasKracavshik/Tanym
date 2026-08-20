'use client';

/**
 * Тактильные примитивы движения.
 *
 * Одно место, где заданы кривые и длительности, — иначе каждая кнопка
 * анимируется чуть по-своему, и интерфейс перестаёт ощущаться цельным.
 *
 * Главный принцип: анимация отвечает на действие, а не украшает простой.
 * Нажатие сжимает элемент и гасит тень (палец придавил кнопку к поверхности),
 * отпускание возвращает объём. Появление блоков — только один раз при
 * попадании в кадр, без повтора при обратной прокрутке: повторный запуск
 * той же анимации превращает страницу в аттракцион.
 *
 * Системная настройка «уменьшить движение» уважается через useReducedMotion:
 * тогда остаётся мгновенная смена состояния без сдвигов и масштабирования.
 */

import { motion, useReducedMotion } from 'framer-motion';
import type { HTMLMotionProps, Transition, Variants } from 'framer-motion';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

/**
 * Пружина для отклика на курсор и нажатие.
 *
 * Не линейная кривая: у линейной анимации есть отчётливый «конец», и элемент
 * останавливается мёртво. Пружина с небольшим перелётом ощущается как
 * физический предмет, который встал на место.
 */
export const SPRING: Transition = { type: 'spring', stiffness: 420, damping: 30, mass: 0.7 };

/** Плавная кривая для появления крупных блоков. */
export const EASE_OUT: Transition = { duration: 0.5, ease: [0.16, 1, 0.3, 1] };

/* ------------------------------------------------------------------ */
/*  Появление при прокрутке                                            */
/* ------------------------------------------------------------------ */

/**
 * Блок, который проявляется снизу вверх при попадании в кадр.
 *
 * `once: true` намеренно: анимация проигрывается один раз за визит.
 * `amount: 0.2` — блок считается видимым, когда показалась пятая часть,
 * иначе высокие секции начинают анимироваться, только доехав до середины.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ ...EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Контейнер, который выпускает детей по очереди, а не все разом. */
export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: EASE_OUT },
};

export function StaggerGroup({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={staggerParent}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={staggerChild}>
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Тактильные поверхности                                             */
/* ------------------------------------------------------------------ */

/**
 * Карточка, которая приподнимается под курсором.
 *
 * Сдвиг всего на 4 пикселя: большее смещение выглядит как прыжок и мешает
 * попасть по ссылке внутри карточки.
 */
export function LiftCard({
  children,
  className = '',
  ...rest
}: HTMLMotionProps<'div'> & { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      whileHover={reduced ? undefined : { y: -4, boxShadow: 'var(--shadow-float)' }}
      transition={SPRING}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

type PressableProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
};

/**
 * Отклик на нажатие: сжатие до 97%.
 *
 * Ровно столько, чтобы палец почувствовал ответ, но текст внутри не поплыл.
 * У выключенной кнопки отклика нет — иначе она врёт, что действие произошло.
 */
const pressAnimation = (reduced: boolean | null, disabled?: boolean) =>
  reduced || disabled ? {} : { scale: 0.97 };

const hoverAnimation = (reduced: boolean | null, disabled?: boolean) =>
  reduced || disabled ? {} : { scale: 1.02 };

export function PressButton({
  children,
  className = '',
  disabled,
  ...rest
}: PressableProps & HTMLMotionProps<'button'>) {
  const reduced = useReducedMotion();

  return (
    <motion.button
      className={className}
      disabled={disabled}
      whileHover={hoverAnimation(reduced, disabled)}
      whileTap={pressAnimation(reduced, disabled)}
      transition={SPRING}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

/** Та же тактильность, но для перехода по ссылке. */
export function PressLink({
  href,
  children,
  className = '',
  style,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  /** Нужен для градиентных заливок: их нельзя выразить классом Tailwind. */
  style?: CSSProperties;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.span
      className="inline-flex"
      whileHover={reduced ? undefined : { scale: 1.02 }}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      transition={SPRING}
    >
      <Link href={href} className={className} style={style}>
        {children}
      </Link>
    </motion.span>
  );
}

/* ------------------------------------------------------------------ */
/*  Состояния                                                          */
/* ------------------------------------------------------------------ */

/** Спиннер для состояния загрузки внутри кнопки. */
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <motion.span
      aria-hidden
      className={`inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent ${className}`}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, ease: 'linear', duration: 0.7 }}
    />
  );
}

/**
 * Галочка успеха, которая рисуется штрихом, а не появляется целиком.
 *
 * Рисование занимает время и потому читается как «действие завершилось»,
 * тогда как мгновенно возникшая галочка выглядит как часть статичной вёрстки.
 */
export function SuccessCheck({ size = 20 }: { size?: number }) {
  const reduced = useReducedMotion();

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      initial={reduced ? undefined : { scale: 0.6 }}
      animate={{ scale: 1 }}
      transition={SPRING}
    >
      <motion.path
        d="M4 12.5 9.5 18 20 6.5"
        initial={reduced ? undefined : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      />
    </motion.svg>
  );
}

export { motion };
