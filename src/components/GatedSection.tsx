'use client';

/**
 * Раздел, который целиком исчезает без нужной роли.
 *
 * Раньше страницы делали так: заголовок «Опубликовать объявление», а под
 * ним SchoolAuthGate. Когда прав не хватало, ворота показывали серую
 * плашку «этот раздел только для роли admin» — но заголовок оставался,
 * и получалось обещание действия, которого не будет.
 *
 * Здесь заголовок и содержимое связаны: нет прав — нет и заголовка.
 * Проверка роли продублирована внутри SchoolAuthGate: она отвечает
 * за доступ, а эта обёртка — только за то, чтобы не рисовать пустое место.
 */

import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import type { SchoolProfile } from '@/lib/supabase/useSchoolAuth';
import { SchoolAuthGate } from './SchoolAuthGate';
import { Kicker } from './ui';

type SchoolRole = 'student' | 'teacher' | 'admin';

export function GatedSection({
  title,
  description,
  requireRole,
  language,
  className = 'mt-16',
  children,
}: {
  title: string;
  description?: string;
  requireRole: SchoolRole | SchoolRole[];
  language: 'ru' | 'kk' | 'en';
  className?: string;
  children: (profile: SchoolProfile) => ReactNode;
}) {
  const { profile, loading, isSignedIn } = useSchoolAuth();
  const allowed = Array.isArray(requireRole) ? requireRole : [requireRole];

  // Пока роль неизвестна — ничего не рисуем, иначе заголовок мигнёт
  // и исчезнет у того, кому раздел не полагается.
  if (loading) return null;

  /*
    Вошедший с неподходящей ролью не видит раздела вовсе. Гостя это
    не касается: ему ворота предложат войти, и заголовок нужен, чтобы
    он понимал, ради чего вход.
  */
  if (isSignedIn && profile && !allowed.includes(profile.role)) return null;

  return (
    <div className={className}>
      <Kicker>{title}</Kicker>
      {description && <p className="mt-2 max-w-2xl text-sm text-ink-500">{description}</p>}
      <div className="mt-4">
        <Suspense fallback={null}>
          <SchoolAuthGate requireRole={requireRole} language={language}>
            {children}
          </SchoolAuthGate>
        </Suspense>
      </div>
    </div>
  );
}
