'use client';

/**
 * Боковая навигация внутренних разделов.
 *
 * Раньше пункты меню лежали в горизонтальной шапке и на ноутбучной ширине
 * прокручивались вбок — пункт можно было промотать мимо и не заметить.
 * Вертикальный список читается целиком без прокрутки: все десять разделов
 * видны сразу.
 *
 * На мобильном экране боковая колонка заняла бы половину ширины — вместо неё
 * тонкая верхняя полоса с кнопкой, которая открывает тот же список поверх
 * контента.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from './StoreProvider';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { LANGUAGES } from '@/lib/i18n-shared';
import type { Dict } from '@/lib/i18n';
import type { IconName } from './Icon';
import { Icon } from './Icon';
import { Logo, LogoMark } from './Logo';

/**
 * Пункты, скрытые от роли.
 *
 * Действует только для вошедших через школьный Google-аккаунт с известной
 * ролью — гость (никто не вошёл) по-прежнему видит всё, как раньше. Учителю
 * не нужны инструменты ученика (план, кабинет, наставник), ученику не нужна
 * панель мониторинга класса.
 */
const HIDDEN_FOR_ROLE: Record<'student' | 'teacher' | 'admin', string[]> = {
  student: ['/teacher', '/admin'],
  teacher: ['/plan', '/dashboard', '/chat', '/admin'],
  admin: ['/plan', '/dashboard', '/chat', '/teacher'],
};

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
  admin: string;
  nav: string;
  settings: string;
  language: string;
  openMenu: string;
  closeMenu: string;
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
    admin: 'Админ',
    nav: 'Основная навигация',
    settings: 'Настройки профиля',
    language: 'Язык интерфейса',
    openMenu: 'Открыть меню',
    closeMenu: 'Закрыть меню',
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
    admin: 'Админ',
    nav: 'Негізгі навигация',
    settings: 'Профиль параметрлері',
    language: 'Интерфейс тілі',
    openMenu: 'Мәзірді ашу',
    closeMenu: 'Мәзірді жабу',
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
    admin: 'Admin',
    nav: 'Main navigation',
    settings: 'Profile settings',
    language: 'Interface language',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
  },
};

export function SiteSidebar() {
  const pathname = usePathname();
  const { state, hydrated, setLanguage } = useStore();
  const { profile: schoolProfile } = useSchoolAuth();
  const t = TEXT[state.language];
  const profile = state.profile;
  const [open, setOpen] = useState(false);

  // Закрываем drawer при переходе на другой маршрут, иначе следующая
  // страница открылась бы с уже нажатым меню поверх себя.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const ALL_NAV: { href: string; label: string; icon: IconName }[] = [
    { href: '/announcements', label: t.announcements, icon: 'megaphone' },
    { href: '/plan', label: t.plan, icon: 'compass' },
    { href: '/dashboard', label: t.dashboard, icon: 'columns' },
    { href: '/archive', label: t.archive, icon: 'folder' },
    { href: '/events', label: t.events, icon: 'calendar' },
    { href: '/marketplace', label: t.marketplace, icon: 'backpack' },
    { href: '/achievements', label: t.achievements, icon: 'trophy' },
    { href: '/leaderboard', label: t.leaderboard, icon: 'medal' },
    { href: '/chat', label: t.mentor, icon: 'chat' },
    { href: '/teacher', label: t.teacher, icon: 'cap' },
    { href: '/admin', label: t.admin, icon: 'building' },
  ];
  const NAV = ALL_NAV.filter(
    (item) => !schoolProfile || !HIDDEN_FOR_ROLE[schoolProfile.role].includes(item.href)
  );

  const navList = (
    <ul className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
                active ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800'
              }`}
            >
              <Icon name={item.icon} size={19} className={active ? 'text-brand-600' : 'text-ink-400'} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const languageSwitcher = (
    <div className="flex rounded-lg border border-ink-200 p-0.5" role="group" aria-label={t.language}>
      {LANGUAGES.map((item) => (
        <button
          key={item.id}
          onClick={() => setLanguage(item.id)}
          title={item.title}
          aria-pressed={state.language === item.id}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-bold outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
            state.language === item.id ? 'bg-brand-500 text-white' : 'text-ink-400 hover:text-ink-700'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );

  const profileRow = hydrated && profile && (
    <Link
      href="/profile"
      className="flex items-center gap-2 rounded-xl border border-ink-200 py-2 pl-2 pr-3 outline-none transition-all duration-150 hover:border-brand-300 hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-brand-500"
      title={t.settings}
    >
      <span
        aria-hidden
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-100 text-xs font-bold text-accent-700"
      >
        {profile.name.trim().charAt(0).toUpperCase() || '?'}
      </span>
      <span className="truncate text-sm font-semibold text-ink-700">{profile.name.split(' ')[0]}</span>
    </Link>
  );

  return (
    <>
      {/* Тонкая верхняя полоса: видна только на мобильном экране */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-ink-200 bg-white/90 px-4 backdrop-blur md:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label={t.openMenu}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 outline-none transition-all duration-150 hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <Icon name="menu" size={22} />
        </button>
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg">
          <LogoMark size={26} className="text-accent-500 shrink-0" />
          <span
            className="truncate text-base tracking-tight text-accent-500"
            style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontWeight: 700 }}
          >
            Tanym
          </span>
        </Link>
      </div>

      {/* Постоянная колонка: видна только от md и выше */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r border-ink-200 bg-white px-4 py-6 md:flex">
        <Link href="/dashboard" className="rounded-lg px-1 outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          <Logo size={28} />
        </Link>
        <nav aria-label={t.nav} className="flex-1">
          {navList}
        </nav>
        <div className="flex flex-col gap-3">
          {profileRow}
          {languageSwitcher}
        </div>
      </aside>

      {/* Мобильный drawer поверх контента */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label={t.closeMenu}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink-900/40"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto bg-white px-4 py-6 shadow-[var(--shadow-lift)]">
            <div className="flex items-center justify-between">
              <Logo size={28} />
              <button
                onClick={() => setOpen(false)}
                aria-label={t.closeMenu}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 outline-none transition-all duration-150 hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <nav aria-label={t.nav} className="flex-1">
              {navList}
            </nav>
            <div className="flex flex-col gap-3">
              {profileRow}
              {languageSwitcher}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
