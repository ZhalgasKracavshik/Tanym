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
import { Logo } from './Logo';
import { Avatar } from './Avatar';
import { useSidebarCollapsed } from '@/lib/localSetting';
import { MobileTabBar } from './MobileTabBar';
import { useSlidingPill } from './useSlidingPill';
import { avatarPhotoUrl } from '@/lib/supabase/avatarPhoto';

/**
 * Пункты, скрытые от роли.
 *
 * Действует только для вошедших через школьный Google-аккаунт с известной
 * ролью — гость (никто не вошёл) по-прежнему видит всё, как раньше. Учителю
 * не нужны инструменты ученика (план, кабинет, наставник), ученику не нужна
 * панель мониторинга класса.
 */
const HIDDEN_FOR_ROLE: Record<'student' | 'teacher' | 'admin' | 'center', string[]> = {
  student: ['/teacher', '/admin'],
  teacher: ['/plan', '/dashboard', '/chat', '/admin'],
  admin: ['/plan', '/dashboard', '/chat', '/teacher'],
  /*
    Внешнему центру оставлен один раздел — «Возможности», где живут его
    объявления. Остальное закрыто не только в меню, но и в самой базе
    (см. is_school_member), и показывать ссылки на страницы, которые
    всё равно ничего ему не покажут, незачем: пустая страница выглядит
    как поломка, а не как запрет.
  */
  center: [
    '/plan', '/dashboard', '/chat', '/teacher', '/admin',
    '/archive', '/achievements', '/leaderboard', '/events', '/announcements',
  ],
};

const TEXT: Dict<{
  plan: string;
  more: string;
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
  collapse: string;
  expand: string;
}> = {
  ru: {
    plan: 'Мой план',
    more: 'Ещё',
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
    collapse: 'Свернуть меню',
    expand: 'Развернуть меню',
  },
  kk: {
    plan: 'Жоспарым',
    more: 'Тағы',
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
    collapse: 'Мәзірді жию',
    expand: 'Мәзірді жаю',
  },
  en: {
    plan: 'My plan',
    more: 'More',
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
    collapse: 'Collapse menu',
    expand: 'Expand menu',
  },
};

/**
 * Список разделов с переезжающей подсветкой.
 *
 * Подсветка активного пункта — отдельная пилюля, которая едет между
 * пунктами, а не фон, мгновенно перекрашивающийся на новом месте: переезд
 * показывает, откуда и куда ушёл выбор.
 */
interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** 'more' — раздел школьной жизни, он идёт под подзаголовком. */
  section: 'study' | 'more';
}

function NavList({
  items,
  pathname,
  moreLabel,
  collapsed = false,
}: {
  items: NavItem[];
  pathname: string;
  moreLabel: string;
  /** Свёрнутая колонка: остаются только значки, подпись уходит в подсказку. */
  collapsed?: boolean;
}) {
  // Ключ — текущий путь: по нему хук понимает, что пора двигать пилюлю.
  const { containerRef, pillRef } = useSlidingPill<HTMLUListElement>(pathname);

  return (
    <ul ref={containerRef} className="t-tabs flex flex-col gap-0.5">
      <span ref={pillRef} aria-hidden className="t-tabs-pill rounded-lg bg-brand-50" />
      {items.map((item, index) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        /*
          Подзаголовок ставится там, где список переходит от учёбы к
          школьной жизни. Отдельным <ul> эти группы не разнесены нарочно:
          пилюля подсветки привязана к своему контейнеру, и второй список
          завёл бы вторую пилюлю, которой не за что зацепиться.
        */
        const startsMore = item.section === 'more' && items[index - 1]?.section !== 'more';
        return (
          <li key={item.href}>
            {/*
              В свёрнутом виде вместо подзаголовка остаётся черта: место
              под слово «Ещё» есть только в развёрнутой колонке, но
              граница между учёбой и школьной жизнью нужна в обоих.
            */}
            {startsMore &&
              (collapsed ? (
                <span aria-hidden className="mx-auto my-2 block h-px w-6 bg-ink-200" />
              ) : (
                <p className="px-3 pb-1 pt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-400">
                  {moreLabel}
                </p>
              ))}
            <Link
              href={item.href}
              aria-current={active ? 'page' : undefined}
              data-pill-active={active ? 'true' : undefined}
              /* Подпись скрыта визуально, но title и aria-label оставляют
                 раздел доступным и с клавиатуры, и для скринридера. */
              title={collapsed ? item.label : undefined}
              aria-label={collapsed ? item.label : undefined}
              className={`flex items-center rounded-lg py-2.5 text-sm font-semibold outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
                collapsed ? 'justify-center px-0' : 'gap-3 px-3'
              } ${active ? 'text-brand-700' : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800'}`}
            >
              <Icon name={item.icon} size={19} className={active ? 'text-brand-600' : 'text-ink-400'} />
              {!collapsed && item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SiteSidebar() {
  const pathname = usePathname();
  const { state, hydrated, setLanguage } = useStore();
  const { profile: schoolProfile } = useSchoolAuth();
  const t = TEXT[state.language];
  const profile = state.profile;
  const [open, setOpen] = useState(false);
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();

  /*
    Закрываем drawer при переходе на другой маршрут, иначе следующая
    страница открылась бы с уже нажатым меню поверх себя.

    Правка во время рендера, а не в эффекте. Эффект здесь означал бы
    лишний кадр: страница успевала отрисоваться с открытым меню поверх
    себя, и только следующим проходом оно закрывалось. React такую
    правку поддерживает специально — увидев setState того же компонента
    во время рендера, он перезапускает рендер до того, как что-либо
    попадёт в DOM, и промежуточное состояние на экран не выходит.
  */
  const [renderedPath, setRenderedPath] = useState(pathname);
  if (renderedPath !== pathname) {
    setRenderedPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  /*
    Порядок повторяет учебный путь: кабинет с прогрессом, план занятий,
    наставник, материалы, достижения, рейтинг — и только потом школьная
    жизнь под подзаголовком «Ещё».

    Раньше первыми в меню стояли лента и объявления, то есть продукт
    открывался разделами, к обучению отношения не имеющими, и читался
    как школьная соцсеть.
  */
  const ALL_NAV: NavItem[] = [
    /* Плана отдельным пунктом больше нет: он живёт внутри кабинета,
       потому что отвечает на вторую половину того же вопроса. */
    { href: '/dashboard', label: t.dashboard, icon: 'columns', section: 'study' },
    { href: '/chat', label: t.mentor, icon: 'chat', section: 'study' },
    { href: '/archive', label: t.archive, icon: 'folder', section: 'study' },
    { href: '/achievements', label: t.achievements, icon: 'trophy', section: 'study' },
    { href: '/leaderboard', label: t.leaderboard, icon: 'medal', section: 'study' },
    { href: '/teacher', label: t.teacher, icon: 'cap', section: 'study' },
    { href: '/admin', label: t.admin, icon: 'building', section: 'study' },
    { href: '/announcements', label: t.announcements, icon: 'megaphone', section: 'more' },
    { href: '/events', label: t.events, icon: 'calendar', section: 'more' },
    { href: '/marketplace', label: t.marketplace, icon: 'backpack', section: 'more' },
  ];
  /*
    Роль, которой нет в таблице, не должна ронять приложение.

    Здесь стояло HIDDEN_FOR_ROLE[role].includes(...) без запасного
    значения. Стоило роли оказаться пустой — и обращение к .includes у
    несуществующего списка валило РЕНДЕР ВСЕЙ СТРАНИЦЫ: меню рисуется в
    общей оболочке, поэтому падал не сайдбар, а любая страница целиком,
    включая форму регистрации. Пользователь видел «This page couldn't
    load» и не мог даже выйти из аккаунта.

    Пустой список означает «ничего не прятать»: показать лишний пункт
    меню несравнимо лучше, чем не показать ничего.
  */
  const hidden = schoolProfile ? (HIDDEN_FOR_ROLE[schoolProfile.role] ?? []) : [];
  const NAV = ALL_NAV.filter((item) => !hidden.includes(item.href));

  /*
    Отдельным компонентом, а не общей переменной с разметкой: список
    рисуется дважды — в постоянной колонке и в мобильном drawer, — а у
    пилюли есть ref на контейнер. Одна переменная означала бы один ref на
    два элемента: он достался бы тому, который отрисован последним, и во
    втором списке пилюля осталась бы неразмещённой.
  */
  /*
    Два отдельных вызова, а не одна переменная: у пилюли подсветки есть
    ссылка на контейнер, и одна разметка на два места означала бы одну
    ссылку на два элемента — она досталась бы отрисованному последним, и
    во втором списке пилюля осталась бы неразмещённой. В выезжающем меню
    на телефоне колонка всегда развёрнута: там она и так занимает экран.
  */
  const navList = <NavList items={NAV} pathname={pathname} moreLabel={t.more} collapsed={collapsed} />;
  const drawerNavList = <NavList items={NAV} pathname={pathname} moreLabel={t.more} />;

  const languageSwitcher = (
    <div className="flex rounded-lg border border-ink-200 p-0.5" role="group" aria-label={t.language}>
      {LANGUAGES.map((item) => (
        <button
          key={item.id}
          onClick={() => setLanguage(item.id)}
          title={item.title}
          aria-pressed={state.language === item.id}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
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
          photoUrl={state.profile?.avatarPhotoUrl || avatarPhotoUrl(schoolProfile?.avatar_photo_path)}
          size={32}
        />
        <span className="truncate text-sm font-semibold text-ink-700">
          {displayName.split(' ')[0]}
        </span>
      </Link>

      <Link
        href="/profile?tab=settings"
        title={t.settings}
        aria-label={t.settings}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-ink-200 text-ink-400 outline-none transition-all duration-150 hover:border-brand-300 hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <Icon name="settings" size={17} />
      </Link>
    </div>
  );

  /** Та же строка для свёрнутой колонки: только аватар, он же ссылка в профиль. */
  const compactProfileRow = displayName && (
    <Link
      href="/profile"
      title={displayName}
      aria-label={displayName}
      className="mx-auto flex h-10 w-10 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <Avatar
        name={displayName}
        colorId={schoolProfile?.avatar_color}
        photoUrl={state.profile?.avatarPhotoUrl || avatarPhotoUrl(schoolProfile?.avatar_photo_path)}
        size={34}
      />
    </Link>
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
          {/* Общий компонент, а не своя копия словесного знака: две копии
              уже расходились по регистру и разрядке, и на телефоне бренд
              выглядел другим. */}
          <Logo size={26} className="min-w-0 text-ink-900" />
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
          photoUrl={state.profile?.avatarPhotoUrl || avatarPhotoUrl(schoolProfile?.avatar_photo_path)}
          size={32}
        />
          </Link>
        )}
      </div>

      {/* Нижняя панель под палец — заменила выезжающее меню как основной путь */}
      <MobileTabBar onMore={() => setOpen(true)} />

      {/*
        Постоянная колонка: видна только от md и выше.

        Свёрнутая колонка не прячется совсем, а сжимается до значков: если
        убрать её целиком, пропадает и понимание, где ты находишься, а
        разворачивать пришлось бы каждый раз ради одного перехода. Ширина
        меняется с переходом, чтобы содержимое рядом не прыгало рывком.
      */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col gap-6 overflow-y-auto overflow-x-hidden border-r border-ink-200 bg-white py-6 transition-[width] duration-200 md:flex ${
          collapsed ? 'w-[68px] px-2' : 'w-60 px-4'
        }`}
      >
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between gap-2'}`}>
          {!collapsed && (
            <Link
              href="/dashboard"
              className="min-w-0 rounded-lg px-1 outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <Logo size={28} />
            </Link>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? t.expand : t.collapse}
            aria-label={collapsed ? t.expand : t.collapse}
            aria-expanded={!collapsed}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-400 outline-none transition-all duration-150 hover:bg-ink-50 hover:text-ink-700 focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={18} />
          </button>
        </div>

        <nav aria-label={t.nav} className="flex-1">
          {navList}
        </nav>

        {/*
          Внизу в свёрнутом виде остаётся только аватар: он же ссылка в
          профиль. Переключатель языка прячется — три подписи в колонку
          шириной с иконку не помещаются, а в профиле язык тоже есть.
        */}
        <div className="flex flex-col gap-3">
          {collapsed ? compactProfileRow : profileRow}
          {!collapsed && languageSwitcher}
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
              {drawerNavList}
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
