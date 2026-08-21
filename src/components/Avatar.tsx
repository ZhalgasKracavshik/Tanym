'use client';

/**
 * Аватар пользователя.
 *
 * Не загрузка фотографии, а символ или инициал на выбранном фоне.
 * Причина не в экономии: школьная платформа с загружаемыми фото детей —
 * это модерация изображений, жалобы и ответственность, которых MVP
 * не потянет. Выбор символа и цвета даёт ту же свободу «поставлю что
 * хочу», но проверять там нечего.
 *
 * Символ рисуется шрифтом системы и потому выглядит по-разному на
 * Windows, Android и iPhone. Для иконок интерфейса это было бы браком
 * (см. Icon.tsx), а для аватара — нет: это личный знак, а не элемент
 * навигации, и небольшая разница в начертании ему не вредит.
 */

import type { CSSProperties } from 'react';

import { avatarBackground } from '@/lib/avatar';

export function Avatar({
  name,
  colorId,
  emoji,
  size = 40,
  className = '',
}: {
  name: string;
  colorId?: string | null;
  /** Символ, выбранный учеником. Без него — первая буква имени. */
  emoji?: string | null;
  size?: number;
  className?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const style: CSSProperties = {
    width: size,
    height: size,
    background: avatarBackground(colorId ?? null, name),
    // Символ крупнее буквы: у эмодзи вокруг рисунка есть собственные поля,
    // и при одинаковом кегле он выглядит заметно мельче инициала.
    fontSize: Math.round(size * (emoji ? 0.52 : 0.4)),
    lineHeight: 1,
  };

  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${className}`}
      style={style}
    >
      {emoji || initial}
    </span>
  );
}

