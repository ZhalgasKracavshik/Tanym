'use client';

/**
 * Шапка приложения с навигацией.
 *
 * Ведёт себя по-разному на лендинге и внутри продукта: на главной показывает
 * призыв начать, во внутренних разделах — навигацию и профиль. Так лендинг
 * остаётся чистой посадочной страницей, а внутри не мешает лишнее.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from './StoreProvider';
import { ButtonLink } from './ui';

const NAV = [
  { href: '/plan', label: 'Мой план' },
  { href: '/dashboard', label: 'Кабинет' },
  { href: '/chat', label: 'Наставник' },
  { href: '/teacher', label: 'Учителю' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { state, hydrated } = useStore();

  const isLanding = pathname === '/';
  const profile = state.profile;

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-lg font-black text-white"
          >
            T
          </span>
          <span className="text-lg font-black tracking-tight text-ink-900">Tanym</span>
        </Link>

        {!isLanding && (
          <nav aria-label="Основная навигация" className="min-w-0 flex-1">
            <ul className="flex items-center gap-1 overflow-x-auto">
              {NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={`block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                        active ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-3">
          {isLanding ? (
            <ButtonLink href={profile ? '/dashboard' : '/onboarding'} size="sm">
              {profile ? 'В кабинет' : 'Начать'}
            </ButtonLink>
          ) : (
            hydrated &&
            profile && (
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-full border border-ink-200 py-1 pl-1 pr-3 transition-colors hover:bg-ink-50"
                title="Настройки профиля"
              >
                <span
                  aria-hidden
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-100 text-xs font-bold text-accent-700"
                >
                  {profile.name.trim().charAt(0).toUpperCase() || '?'}
                </span>
                <span className="hidden text-sm font-semibold text-ink-700 sm:block">
                  {profile.name.split(' ')[0]}
                </span>
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}
