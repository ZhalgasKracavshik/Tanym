'use client';

/**
 * Кнопка профиля в шапке и выпадающее меню.
 *
 * Структура меню — по компоненту «User Profile Dropdown Menu» с 21st.dev
 * (shadcnspace/dropdown-menu-01): карточка пользователя сверху, группы
 * ссылок через разделители, выход отдельно внизу. Примитив — Radix
 * DropdownMenu: фокус, стрелки, Escape и клик вне меню работают сами,
 * на телефоне меню открывается по касанию.
 *
 * Что добавлено от нас (по разбору olimpiada.ru, Unstop, Instagram):
 * - инициалы на цвете вместо серого силуэта;
 * - точка на аватаре, если у сохранённого события регистрация закрывается
 *   в ближайшие 3 дня, — единственный повод открыть меню прямо сейчас;
 * - строка «сохранено · подана · участвовал» — личная история в одну строку.
 */

import Link from 'next/link';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useStore } from './StoreProvider';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { usePublishedEvents, useSavedEvents } from '@/lib/supabase/events';
import { avatarPhotoUrl } from '@/lib/supabase/avatarPhoto';
import { daysLeftUntil } from '@/lib/events';
import { LANGUAGES } from '@/lib/i18n-shared';
import type { Dict } from '@/lib/i18n';
import { Avatar } from './Avatar';
import { Icon, type IconName } from './Icon';

const TEXT: Dict<{
  open: string;
  grade: (n: number) => string;
  saved: (n: number) => string;
  applied: (n: number) => string;
  participated: (n: number) => string;
  nothingSaved: string;
  urgent: (n: number) => string;
  profile: string;
  myPath: string;
  propose: string;
  settings: string;
  language: string;
  signOut: string;
}> = {
  ru: {
    open: 'Меню профиля',
    grade: (n) => `${n} класс`,
    saved: (n) => `${n} сохранено`,
    applied: (n) => `${n} подана`,
    participated: (n) => `${n} участвовал`,
    nothingSaved: 'Пока ничего не сохранено',
    urgent: (n) => (n === 1 ? 'Регистрация закрывается через 3 дня или раньше' : `${n} регистрации закрываются в ближайшие 3 дня`),
    profile: 'Профиль',
    myPath: 'Мой путь и мои события',
    propose: 'Предложить событие',
    settings: 'Настройки',
    language: 'Язык',
    signOut: 'Выйти',
  },
  kk: {
    open: 'Профиль мәзірі',
    grade: (n) => `${n}-сынып`,
    saved: (n) => `${n} сақталды`,
    applied: (n) => `${n} өтінім`,
    participated: (n) => `${n} қатысты`,
    nothingSaved: 'Әзірге ештеңе сақталмаған',
    urgent: (n) => `${n} тіркеу 3 күн ішінде жабылады`,
    profile: 'Профиль',
    myPath: 'Менің жолым',
    propose: 'Іс-шара ұсыну',
    settings: 'Баптаулар',
    language: 'Тіл',
    signOut: 'Шығу',
  },
  en: {
    open: 'Profile menu',
    grade: (n) => `Grade ${n}`,
    saved: (n) => `${n} saved`,
    applied: (n) => `${n} applied`,
    participated: (n) => `${n} attended`,
    nothingSaved: 'Nothing saved yet',
    urgent: (n) => (n === 1 ? 'A registration closes within 3 days' : `${n} registrations close within 3 days`),
    profile: 'Profile',
    myPath: 'My path & events',
    propose: 'Suggest an event',
    settings: 'Settings',
    language: 'Language',
    signOut: 'Log out',
  },
};

const itemClass =
  'flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm font-medium text-ink-700 outline-none data-[highlighted]:bg-ink-50 data-[highlighted]:text-ink-900';

/** Сколько сохранённых (ещё не поданных) событий закрываются через 0–3 дня. */
function useUrgentCount(ids: Set<string> | null, statuses: Map<string, string> | null): number {
  const events = usePublishedEvents();
  if (!events || !ids || !statuses) return 0;
  return events.filter((event) => {
    if (!ids.has(event.id) || (statuses.get(event.id) ?? 'saved') !== 'saved') return false;
    const left = daysLeftUntil(event.registrationDeadline);
    return left >= 0 && left <= 3;
  }).length;
}

export function ProfileMenu({ size = 36, showName = false }: { size?: number; showName?: boolean }) {
  const { state, setLanguage } = useStore();
  const { profile, email, signOut } = useSchoolAuth();
  const { ids, statuses } = useSavedEvents();
  const urgent = useUrgentCount(ids, statuses);
  const t = TEXT[state.language];

  const name = profile?.name ?? state.profile?.name ?? '';
  const photo = state.profile?.avatarPhotoUrl || avatarPhotoUrl(profile?.avatar_photo_path);
  const counts = { saved: 0, applied: 0, participated: 0 };
  for (const id of ids ?? []) counts[(statuses?.get(id) ?? 'saved') as keyof typeof counts] += 1;
  const summary = [
    counts.saved && t.saved(counts.saved),
    counts.applied && t.applied(counts.applied),
    counts.participated && t.participated(counts.participated),
  ].filter(Boolean);

  const links: { href: string; label: string; icon: IconName }[] = [
    { href: '/profile', label: t.profile, icon: 'user' },
    { href: '/dashboard', label: t.myPath, icon: 'columns' },
    { href: '/events/new', label: t.propose, icon: 'plus' },
    { href: '/profile?tab=settings', label: t.settings, icon: 'settings' },
  ];

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={urgent ? `${t.open}. ${t.urgent(urgent)}` : t.open}
        className={`group flex shrink-0 items-center gap-2 rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
          showName ? 'border border-ink-200 bg-white py-1 pl-1 pr-3 hover:border-ink-300 data-[state=open]:border-ink-400' : 'p-0.5'
        }`}
      >
        <span className="relative">
          <Avatar
            name={name}
            colorId={profile?.avatar_color}
            photoUrl={photo}
            size={size}
            className="ring-2 ring-white transition-shadow group-data-[state=open]:ring-ink-900/10"
          />
          {urgent > 0 && (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white"
            >
              {urgent}
            </span>
          )}
        </span>
        {showName && (
          <>
            <span className="hidden max-w-[9rem] truncate text-sm font-semibold text-ink-800 sm:block">
              {name.split(' ')[0]}
            </span>
            <Icon name="chevron-down" size={14} className="hidden text-ink-400 transition-transform group-data-[state=open]:rotate-180 sm:block" />
          </>
        )}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 w-[min(18rem,calc(100vw-24px))] rounded-2xl border border-ink-200 bg-white p-1.5 shadow-[var(--shadow-float)] data-[state=open]:animate-[menu-in_140ms_ease-out]"
        >
          {/* Карточка: кто я и что у меня в «Моих событиях». */}
          <div className="flex items-center gap-3 px-3 pb-3 pt-2.5">
            <Avatar name={name} colorId={profile?.avatar_color} photoUrl={photo} size={44} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-900">{name || email}</p>
              <p className="truncate text-xs text-ink-500">
                {profile?.grade ? t.grade(profile.grade) : email}
              </p>
            </div>
          </div>
          <p className="mx-3 mb-2 rounded-lg bg-ink-50 px-2.5 py-2 text-xs font-medium text-ink-600">
            {summary.length ? summary.join(' · ') : t.nothingSaved}
          </p>
          {urgent > 0 && (
            <DropdownMenu.Item asChild className={`${itemClass} text-danger-700 data-[highlighted]:bg-danger-50 data-[highlighted]:text-danger-700`}>
              <Link href="/dashboard">
                <Icon name="clock" size={18} />
                <span className="text-[13px] leading-snug">{t.urgent(urgent)}</span>
              </Link>
            </DropdownMenu.Item>
          )}

          <DropdownMenu.Separator className="my-1 h-px bg-ink-100" />

          {links.map((link) => (
            <DropdownMenu.Item key={link.href} asChild className={itemClass}>
              <Link href={link.href}>
                <Icon name={link.icon} size={18} className="text-ink-400" />
                {link.label}
              </Link>
            </DropdownMenu.Item>
          ))}

          <DropdownMenu.Separator className="my-1 h-px bg-ink-100" />

          {/* Язык — тремя кнопками в одну строку: переключение без подменю. */}
          <div className="flex items-center justify-between gap-2 px-3 py-1.5">
            <span className="text-xs font-semibold text-ink-500">{t.language}</span>
            <div className="flex rounded-lg border border-ink-200 p-0.5" role="group" aria-label={t.language}>
              {LANGUAGES.map((item) => (
                <DropdownMenu.Item
                  key={item.id}
                  onSelect={(event) => {
                    event.preventDefault();
                    setLanguage(item.id);
                  }}
                  aria-checked={state.language === item.id}
                  role="menuitemradio"
                  className={`min-w-9 cursor-pointer rounded-md px-2 py-1.5 text-center text-xs font-semibold outline-none data-[highlighted]:ring-2 data-[highlighted]:ring-brand-300 ${
                    state.language === item.id ? 'bg-ink-900 text-white' : 'text-ink-500'
                  }`}
                >
                  {item.label}
                </DropdownMenu.Item>
              ))}
            </div>
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-ink-100" />

          <DropdownMenu.Item
            className={`${itemClass} text-danger-600 data-[highlighted]:bg-danger-50 data-[highlighted]:text-danger-700`}
            // signOut сам уводит на лендинг (useSchoolAuth).
            onSelect={() => void signOut()}
          >
            <Icon name="arrow-left" size={18} />
            {t.signOut}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
