'use client';

/**
 * Кнопка «опубликовать» в углу шапки раздела.
 *
 * Раньше форма публикации стояла развёрнутой прямо под списком. Это
 * неверно расставляет вес: читают раздел все и постоянно, а публикуют
 * единицы и изредка — а форма на два экрана всё равно лежала первой
 * по важности внизу каждой страницы и отодвигала собой содержимое.
 *
 * Так устроены все списковые интерфейсы, от почты до трекеров задач:
 * список — это страница, создание — отдельный экран, попасть в него
 * можно одной кнопкой в постоянном месте.
 *
 * Кнопки нет вовсе, если роль не та: обещать действие, которое затем
 * ответит «недостаточно прав», хуже, чем не обещать ничего.
 */

import Link from 'next/link';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { Icon } from './Icon';

type SchoolRole = 'student' | 'teacher' | 'admin';

export function PublishAction({
  href,
  label,
  requireRole,
}: {
  href: string;
  label: string;
  requireRole: SchoolRole | SchoolRole[];
}) {
  const { profile, loading } = useSchoolAuth();
  const allowed = Array.isArray(requireRole) ? requireRole : [requireRole];

  // Пока роль неизвестна, кнопки нет: мигнуть и исчезнуть хуже, чем появиться.
  if (loading || !profile || !allowed.includes(profile.role)) return null;

  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-2 rounded-[var(--radius-control)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-lift)] transition-all duration-150 hover:shadow-[var(--shadow-lift)] focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      style={{ background: 'var(--gradient-brand)' }}
    >
      <Icon name="plus" size={17} />
      {label}
    </Link>
  );
}
