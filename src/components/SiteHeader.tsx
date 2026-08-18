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
import { LANGUAGES } from '@/lib/i18n-shared';
import type { Dict } from '@/lib/i18n';
import { ButtonLink } from './ui';

/** Подписи шапки на трёх языках. Ключи одинаковые — за этим следит TypeScript. */
const TEXT: Dict<{
  plan: string;
  dashboard: string;
  achievements: string;
  archive: string;
  events: string;
  marketplace: string;
  announcements: string;
  leaderboard: string;
  mentor: string;
  teacher: string;
  start: string;
  toDashboard: string;
  nav: string;
  settings: string;
  language: string;
}> = {
  ru: {
    plan: 'Мой план',
    dashboard: 'Кабинет',
    achievements: 'Достижения',
    archive: 'Архив',
    events: 'Афиша',
    marketplace: 'Возможности',
    announcements: 'Объявления',
    leaderboard: 'Рейтинг',
    mentor: 'Наставник',
    teacher: 'Учителю',
    start: 'Начать',
    toDashboard: 'В кабинет',
    nav: 'Основная навигация',
    settings: 'Настройки профиля',
    language: 'Язык интерфейса',
  },
  kk: {
    plan: 'Жоспарым',
    dashboard: 'Кабинет',
    achievements: 'Жетістіктер',
    archive: 'Мұрағат',
    events: 'Афиша',
    marketplace: 'Мүмкіндіктер',
    announcements: 'Хабарландырулар',
    leaderboard: 'Рейтинг',
    mentor: 'Тәлімгер',
    teacher: 'Мұғалімге',
    start: 'Бастау',
    toDashboard: 'Кабинетке',
    nav: 'Негізгі навигация',
    settings: 'Профиль параметрлері',
    language: 'Интерфейс тілі',
  },
  en: {
    plan: 'My plan',
    dashboard: 'Dashboard',
    achievements: 'Achievements',
    archive: 'Archive',
    events: 'Events',
    marketplace: 'Opportunities',
    announcements: 'Announcements',
    leaderboard: 'Leaderboard',
    mentor: 'Mentor',
    teacher: 'For teachers',
    start: 'Start',
    toDashboard: 'Dashboard',
    nav: 'Main navigation',
    settings: 'Profile settings',
    language: 'Interface language',
  },
};

export function SiteHeader() {
  const pathname = usePathname();
  const { state, hydrated, setLanguage } = useStore();

  const t = TEXT[state.language];
  const isLanding = pathname === '/';
  const profile = state.profile;

  const NAV = [
    { href: '/announcements', label: t.announcements },
    { href: '/plan', label: t.plan },
    { href: '/dashboard', label: t.dashboard },
    { href: '/archive', label: t.archive },
    { href: '/events', label: t.events },
    { href: '/marketplace', label: t.marketplace },
    { href: '/achievements', label: t.achievements },
    { href: '/leaderboard', label: t.leaderboard },
    { href: '/chat', label: t.mentor },
    { href: '/teacher', label: t.teacher },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-lg font-black text-white"
          >
            T
          </span>
          <span className="text-lg font-black tracking-tight text-ink-900">Tanym</span>
        </Link>

        {!isLanding && (
          /*
           * Пунктов навигации много, и на ноутбуке они не помещаются в строку.
           * Список не переносится и не режется, а прокручивается по горизонтали:
           * маршруты остаются на месте, высота шапки не растёт. Полоса прокрутки
           * скрыта, потому что край списка и так уходит под правый блок и
           * подсказывает, что дальше есть ещё пункты.
           */
          <nav aria-label={t.nav} className="min-w-0 flex-1">
            <ul className="flex items-center gap-1 overflow-x-auto overscroll-x-contain scroll-smooth py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href} className="shrink-0">
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={`block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
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
          {/* Переключатель языка доступен на всех экранах, включая лендинг */}
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

          {isLanding ? (
            <ButtonLink href={profile ? '/dashboard' : '/onboarding'} size="sm">
              {profile ? t.toDashboard : t.start}
            </ButtonLink>
          ) : (
            hydrated &&
            profile && (
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-full border border-ink-200 py-1 pl-1 pr-3 outline-none transition-all duration-150 hover:border-brand-300 hover:bg-ink-50 hover:shadow-[var(--shadow-lift)] focus-visible:ring-2 focus-visible:ring-brand-500"
                title={t.settings}
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
