'use client';

/**
 * Каркас страницы создания.
 *
 * Один и тот же на все разделы: возврат к списку, заголовок, форма.
 * Общий каркас здесь не ради экономии строк, а потому что путь назад
 * обязан быть одинаковым везде — человек, который однажды нашёл выход
 * из формы объявления, не должен искать его заново в форме события.
 *
 * Роль проверяется здесь же, а не только кнопкой, которая сюда привела:
 * на страницу можно прийти по прямой ссылке, из истории браузера или
 * из закладки, и все эти пути кнопку минуют. Настоящая защита всё равно
 * стоит в политиках базы — эта проверка лишь про то, чтобы не показывать
 * форму, отправка которой заведомо закончится отказом.
 */

import Link from 'next/link';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import type { SchoolProfile } from '@/lib/supabase/useSchoolAuth';
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { EmptyState, Kicker, Skeleton } from './ui';
import { Reveal } from './motion';

type SchoolRole = 'student' | 'teacher' | 'admin';

export function CreatePageShell({
  backHref,
  backLabel,
  kicker,
  title,
  description,
  requireRole,
  children,
}: {
  backHref: string;
  backLabel: string;
  kicker: string;
  title: string;
  description?: string;
  requireRole: SchoolRole | SchoolRole[];
  children: (profile: SchoolProfile) => ReactNode;
}) {
  const { profile, loading } = useSchoolAuth();
  const allowed = Array.isArray(requireRole) ? requireRole : [requireRole];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-ink-500 outline-none transition-colors duration-150 hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <Icon name="arrow-left" size={16} />
        {backLabel}
      </Link>

      <Reveal immediate>
        <div className="mt-5">
          <Kicker>{kicker}</Kicker>
          <h1 className="mt-2 text-3xl font-medium text-ink-900 sm:text-4xl">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-sm text-ink-500">{description}</p>}
        </div>
      </Reveal>

      <div className="mt-8">
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : !profile || !allowed.includes(profile.role) ? (
          <EmptyState
            title="Этот раздел не для вашей роли"
            description="Публиковать сюда может другая роль. Вернитесь к списку — читать его можно всем, кто вошёл."
          />
        ) : (
          children(profile)
        )}
      </div>
    </div>
  );
}
