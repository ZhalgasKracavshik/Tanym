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
import { useSlidingPill } from './useSlidingPill';
import type { IconName } from './Icon';

const TEXT: Dict<{
  archive: string;
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
    archive: 'Архив',
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
    archive: 'Мұрағат',
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
    archive: 'Archive',
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
  const { containerRef, pillRef } = useSlidingPill<HTMLUListElement>(pathname);

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
            /*
              Порядок повторяет учебный путь: кабинет с прогрессом, план
              занятий, наставник, достижения, рейтинг. Раньше первой стояла
              лента школы — то есть на самом видном месте мобильной панели
              был раздел, к учёбе отношения не имеющий.
            */
            { href: '/dashboard', label: t.dashboard, icon: 'columns' },
            { href: '/archive', label: t.archive, icon: 'folder' },
            { href: '/chat', label: t.mentor, icon: 'chat' },
            { href: '/achievements', label: t.achievements, icon: 'trophy' },
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
        ref={containerRef}
        className="t-tabs mx-auto flex max-w-md items-stretch rounded-[var(--radius-pill)] border border-ink-200/70 bg-white/90 p-1.5 shadow-[var(--shadow-float)] backdrop-blur-xl"
      >
        {/*
          Пилюля переезжает между вкладками вместо того, чтобы гаснуть на
          одной и загораться на другой: на нижней панели переходы частые, и
          движение подсказывает, куда именно ушёл выбор.
        */}
        <span
          ref={pillRef}
          aria-hidden
          className="t-tabs-pill rounded-[var(--radius-pill)] shadow-[var(--shadow-rest)]"
          style={{ background: 'var(--surface-brand)' }}
        />
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className="flex flex-col items-center gap-1 rounded-[var(--radius-pill)] px-1 py-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                {/*
                  Метку для пилюли ставим на сам значок, а не на всю
                  колонку: фон должен обнимать иконку, а подпись под ним
                  остаётся на светлом и читается.
                */}
                <span
                  data-pill-active={active ? 'true' : undefined}
                  className={`flex h-9 w-full max-w-[3.5rem] items-center justify-center rounded-[var(--radius-pill)] transition-colors duration-200 ${
                    active ? 'text-white' : 'text-ink-400'
                  }`}
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
