'use client';

/**
 * Экран «что-то пошло не так» и «страница не найдена».
 *
 * Без него ученик видел стандартный экран Next.js на английском — белую
 * страницу с «Application error» или «This page could not be found», без
 * единой ссылки обратно. Здесь всегда есть путь дальше: на афишу.
 */

import type { ReactNode } from 'react';
import { ButtonLink } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';

export function ErrorScreen({
  icon,
  kicker,
  title,
  text,
  actions,
}: {
  icon: IconName;
  kicker?: string;
  title: string;
  text: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Icon name={icon} size={26} />
        </div>
        {kicker && <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-ink-400">{kicker}</p>}
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">{text}</p>
        <div className="mt-6 flex flex-col items-stretch gap-2 sm:flex-row sm:justify-center">
          {actions ?? (
            <ButtonLink href="/events">
              <Icon name="calendar" size={16} />
              Открыть афишу
            </ButtonLink>
          )}
        </div>
      </div>
    </div>
  );
}
