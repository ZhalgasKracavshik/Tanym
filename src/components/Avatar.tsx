'use client';

/**
 * Аватар пользователя.
 *
 * Не загрузка фотографии, а инициал на выбранном фоне. Причина не в
 * экономии: школьная платформа с загружаемыми фото детей — это модерация
 * изображений, жалобы и ответственность, которых MVP не потянет. Выбор
 * из палитры даёт то же ощущение «это моё», но без этой цены.
 */

import type { CSSProperties } from 'react';

/**
 * Палитра фонов.
 *
 * Восемь вариантов: меньше — выбор не ощущается выбором, больше — экран
 * настроек превращается в палитру художника. Все достаточно тёмные,
 * чтобы белый инициал читался на любом.
 */
export const AVATAR_COLORS: { id: string; value: string; title: string }[] = [
  { id: 'brand', value: 'linear-gradient(135deg, #e57545, #b34a1f)', title: 'Терракота' },
  { id: 'amber', value: 'linear-gradient(135deg, #ffa62b, #dd6302)', title: 'Янтарь' },
  { id: 'forest', value: 'linear-gradient(135deg, #2f9e78, #1f6f5c)', title: 'Хвоя' },
  { id: 'ocean', value: 'linear-gradient(135deg, #3aa5c9, #1c6f8c)', title: 'Море' },
  { id: 'violet', value: 'linear-gradient(135deg, #8f6bd0, #5b3f96)', title: 'Ирис' },
  { id: 'rose', value: 'linear-gradient(135deg, #e8657f, #b3324c)', title: 'Шиповник' },
  { id: 'slate', value: 'linear-gradient(135deg, #4d6b85, #24425c)', title: 'Графит' },
  { id: 'gold', value: 'linear-gradient(135deg, #d4a83a, #9a7314)', title: 'Золото' },
];

/**
 * Фон по сохранённому id.
 *
 * Если цвет не выбран, берём стабильный по имени, а не первый из списка:
 * так у разных людей в ленте разные аватары ещё до того, как кто-то
 * дошёл до настроек. Хеш простейший — это подпись, а не защита.
 */
export function avatarBackground(colorId: string | null, seed: string): string {
  const found = AVATAR_COLORS.find((item) => item.id === colorId);
  if (found) return found.value;

  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 1_000_000_007;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length].value;
}

export function Avatar({
  name,
  colorId,
  size = 40,
  className = '',
}: {
  name: string;
  colorId?: string | null;
  size?: number;
  className?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const style: CSSProperties = {
    width: size,
    height: size,
    background: avatarBackground(colorId ?? null, name),
    fontSize: Math.round(size * 0.4),
  };

  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${className}`}
      style={style}
    >
      {initial}
    </span>
  );
}
