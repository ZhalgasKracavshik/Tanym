'use client';

/**
 * «Этот раздел — ученический», для учителя и администратора.
 *
 * Кабинет, план, наставник и диагностика построены вокруг личной анкеты
 * ученика: класс, предметы, цель. У учителя её нет и быть не должно — он
 * не учится по программе, он смотрит за классом.
 *
 * Раньше эти страницы проверяли не роль, а наличие анкеты, и потому
 * встречали учителя заглушкой «Профиль ещё не создан» с кнопкой в мастер
 * онбординга. Мастер, увидев роль, тут же разворачивал его обратно — то
 * есть кнопка вела в никуда. Здесь вместо этого честно сказано, что
 * раздел не для него, и дана ссылка в его собственный.
 */

import { Icon } from './Icon';
import { ButtonLink, EmptyState } from './ui';

const TEXT = {
  teacher: {
    title: 'Это раздел для учеников',
    description:
      'Здесь ученик занимается по своему плану. Ваши инструменты — прогресс класса и код для подключения учеников.',
    action: 'В панель учителя',
    href: '/teacher',
  },
  admin: {
    title: 'Это раздел для учеников',
    description:
      'Раздел построен вокруг личного плана ученика. Управление школой и проверка публикаций — в панели администратора.',
    action: 'В панель администратора',
    href: '/admin',
  },
} as const;

export function StudentOnlyNotice({ role }: { role: 'teacher' | 'admin' }) {
  const t = TEXT[role];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="mb-3 flex justify-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-ink-200 bg-white text-ink-400">
          <Icon name={role === 'admin' ? 'building' : 'cap'} size={24} />
        </span>
      </div>
      <EmptyState
        title={t.title}
        description={t.description}
        action={<ButtonLink href={t.href}>{t.action}</ButtonLink>}
      />
    </div>
  );
}
