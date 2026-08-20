'use client';

/**
 * Шапка лендинга.
 *
 * Используется только на главной странице (см. AppShell) — внутри продукта
 * навигация ушла в боковую колонку (SiteSidebar), там она не прокручивается
 * и видна целиком.
 */

import Link from 'next/link';
import { useStore } from './StoreProvider';
import { LANGUAGES } from '@/lib/i18n-shared';
import type { Dict } from '@/lib/i18n';
import { ButtonLink } from './ui';
import { Logo } from './Logo';

const TEXT: Dict<{
  start: string;
  toDashboard: string;
  language: string;
}> = {
  ru: { start: 'Начать', toDashboard: 'В кабинет', language: 'Язык интерфейса' },
  kk: { start: 'Бастау', toDashboard: 'Кабинетке', language: 'Интерфейс тілі' },
  en: { start: 'Start', toDashboard: 'Dashboard', language: 'Interface language' },
};

export function SiteHeader() {
  const { state, setLanguage } = useStore();
  const t = TEXT[state.language];
  const profile = state.profile;

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <Logo />
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <div className="flex rounded-lg border border-ink-200 p-0.5" role="group" aria-label={t.language}>
            {LANGUAGES.map((item) => (
              <button
                key={item.id}
                onClick={() => setLanguage(item.id)}
                title={item.title}
                aria-pressed={state.language === item.id}
                className={`rounded-md px-2 py-1 text-xs font-bold outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  state.language === item.id ? 'bg-brand-500 text-white' : 'text-ink-400 hover:text-ink-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <ButtonLink href={profile ? '/dashboard' : '/onboarding'} size="sm">
            {profile ? t.toDashboard : t.start}
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}

