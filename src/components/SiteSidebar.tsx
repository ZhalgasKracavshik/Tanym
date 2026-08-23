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
import { Avatar } from './Avatar';
import { MobileTabBar } from './MobileTabBar';
import { avatarPhotoUrl } from '@/lib/supabase/avatarPhoto';

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
  feed: string;
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
    feed: 'Лента',
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
    feed: 'Лента',
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
    feed: 'Feed',
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
    { href: '/feed', label: t.feed, icon: 'sparkles' },
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

  /*
    Строка пользователя: аватар ведёт в профиль, шестерёнка — в настройки.
    Раньше здесь была одна ссылка на /profile, и выход был спрятан внутри
    ворот публикации на случайных страницах — то есть найти его можно было
    только наткнувшись. Теперь он там, где его ищут: рядом со своим именем.
  */
  const displayName = schoolProfile?.name ?? profile?.name ?? null;

  const profileRow = displayName && (
    <div className="flex items-center gap-1.5">
      <Link
        href="/profile"
        className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-control)] border border-ink-200 py-2 pl-2 pr-3 outline-none transition-all duration-150 hover:border-brand-300 hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <Avatar
          name={displayName}
          colorId={schoolProfile?.avatar_color}
          photoUrl={avatarPhotoUrl(schoolProfile?.avatar_photo_path)}
          size={32}
        />
        <span className="truncate text-sm font-semibold text-ink-700">
          {displayName.split(' ')[0]}
        </span>
      </Link>

      <Link
        href="/settings"
        title={t.settings}
        aria-label={t.settings}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-ink-200 text-ink-400 outline-none transition-all duration-150 hover:border-brand-300 hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <Icon name="settings" size={17} />
      </Link>
    </div>
  );

  return (
    <>
      {/*
        Верхняя полоса на телефоне: только логотип и профиль.
        Кнопка меню отсюда убрана — навигация переехала вниз, под палец
        (MobileTabBar), а редкие разделы открываются оттуда же кнопкой «Ещё».
      */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-ink-200 bg-white/90 px-4 backdrop-blur md:hidden">
        <Link href="/dashboard" className="flex min-w-0 flex-1 items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg">
          <LogoMark size={26} className="text-accent-500 shrink-0" />
          {/* Тот же шрифт, регистр и разрядка, что и в Logo.tsx — иначе
              словесный знак на телефоне выглядит другим брендом. */}
          <span
            className="truncate text-sm text-accent-500"
            style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontWeight: 700, letterSpacing: '0.14em' }}
          >
            TANÝM
          </span>
        </Link>

        {displayName && (
          <Link
            href="/profile"
            aria-label={t.settings}
            className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <Avatar
          name={displayName}
          colorId={schoolProfile?.avatar_color}
          photoUrl={avatarPhotoUrl(schoolProfile?.avatar_photo_path)}
          size={32}
        />
          </Link>
        )}
      </div>

      {/* Нижняя панель под палец — заменила выезжающее меню как основной путь */}
      <MobileTabBar onMore={() => setOpen(true)} />

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
