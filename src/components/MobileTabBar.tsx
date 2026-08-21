'use client';

/**
 * Нижняя панель навигации на телефоне.
 *
 * Большой палец достаёт до низа экрана, а не до верхнего угла, поэтому
 * основные разделы живут внизу. Раньше на мобильном была только кнопка,
 * открывающая полный список из одиннадцати пунктов поверх контента —
 * то есть любой переход стоил двух касаний и перекрывал страницу.
 *
 * Пунктов пять, а не одиннадцать: это те разделы, куда заходят каждый
 * день. Остальное (архив, афиша, объявления) остаётся в боковом меню,
 * которое на телефоне открывается кнопкой «Ещё».
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { useStore } from './StoreProvider';
import type { Dict } from '@/lib/i18n';
import { Icon } from './Icon';
import type { IconName } from './Icon';

const TEXT: Dict<{
  dashboard: string;
  achievements: string;
  mentor: string;
  leaderboard: string;
  profile: string;
  teacher: string;
  admin: string;
  more: string;
}> = {
  ru: {
    dashboard: 'Кабинет',
    achievements: 'Портфолио',
    mentor: 'Наставник',
    leaderboard: 'Рейтинг',
    profile: 'Профиль',
    teacher: 'Класс',
    admin: 'Админ',
    more: 'Ещё',
  },
  kk: {
    dashboard: 'Кабинет',
    achievements: 'Портфолио',
    mentor: 'Тәлімгер',
    leaderboard: 'Рейтинг',
    profile: 'Профиль',
    teacher: 'Сынып',
    admin: 'Админ',
    more: 'Тағы',
  },
  en: {
    dashboard: 'Home',
    achievements: 'Portfolio',
    mentor: 'Mentor',
    leaderboard: 'Ranking',
    profile: 'Profile',
    teacher: 'Class',
    admin: 'Admin',
    more: 'More',
  },
};

export function MobileTabBar({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  const { state } = useStore();
  const { profile } = useSchoolAuth();
  const t = TEXT[state.language];

  /*
    Набор вкладок зависит от роли: у учителя нет кабинета ученика и
    наставника, зато есть класс. Гость сюда не попадает вообще —
    middleware разворачивает его на вход раньше.
  */
  const tabs: { href: string; label: string; icon: IconName }[] =
    profile?.role === 'teacher'
      ? [
          { href: '/teacher', label: t.teacher, icon: 'cap' },
          { href: '/achievements', label: t.achievements, icon: 'trophy' },
          { href: '/leaderboard', label: t.leaderboard, icon: 'medal' },
          { href: '/profile', label: t.profile, icon: 'user' },
        ]
      : profile?.role === 'admin'
        ? [
            { href: '/admin', label: t.admin, icon: 'building' },
            { href: '/achievements', label: t.achievements, icon: 'trophy' },
            { href: '/leaderboard', label: t.leaderboard, icon: 'medal' },
            { href: '/profile', label: t.profile, icon: 'user' },
          ]
        : [
            { href: '/dashboard', label: t.dashboard, icon: 'columns' },
            { href: '/achievements', label: t.achievements, icon: 'trophy' },
            { href: '/chat', label: t.mentor, icon: 'chat' },
            { href: '/leaderboard', label: t.leaderboard, icon: 'medal' },
          ];

  return (
    <nav
      aria-label={t.more}
      /*
        Плавающая пилюля, а не полоса во всю ширину.

        Полоса прибивает интерфейс к нижнему краю и на светлом фоне
        сливается с контентом. Отдельная скруглённая панель с тенью
        читается как элемент поверх страницы, а не как её край.
        Отступ снизу учитывает системную полосу айфона.
      */
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
    >
      <ul
        className="mx-auto flex max-w-md items-stretch rounded-[var(--radius-pill)] border border-ink-200/70 bg-white/90 p-1.5 shadow-[var(--shadow-float)] backdrop-blur-xl"
      >
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className="flex flex-col items-center gap-1 rounded-[var(--radius-pill)] px-1 py-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <span
                  className={`flex h-9 w-full max-w-[3.5rem] items-center justify-center rounded-[var(--radius-pill)] transition-all duration-200 ${
                    active ? 'text-white shadow-[var(--shadow-glow)]' : 'text-ink-400'
                  }`}
                  style={active ? { background: 'var(--gradient-brand)' } : undefined}
                >
                  <Icon name={tab.icon} size={19} />
                </span>
                <span
                  className={`text-[10px] font-semibold leading-none ${
                    active ? 'text-brand-700' : 'text-ink-400'
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}

        {/* «Ещё» открывает тот же боковой список — редкие разделы не
            занимают место в постоянной панели, но остаются достижимы. */}
        <li className="flex-1">
          <button
            onClick={onMore}
            className="flex w-full flex-col items-center gap-1 rounded-[var(--radius-pill)] px-1 py-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <span className="flex h-9 w-full max-w-[3.5rem] items-center justify-center rounded-[var(--radius-pill)] text-ink-400">
              <Icon name="menu" size={19} />
            </span>
            <span className="text-[10px] font-semibold leading-none text-ink-400">{t.more}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
