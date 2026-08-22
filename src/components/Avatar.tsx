'use client';

/**
 * Аватар пользователя.
 *
 * Три источника, в порядке убывания приоритета: загруженная фотография,
 * выбранный символ, первая буква имени на цветном фоне.
 *
 * Почему два способа, а не один. Фотография — самый узнаваемый вариант, и
 * тому, кто хочет показать лицо, незачем мешать. Но школьная платформа не
 * вправе требовать фотографию ребёнка: у кого-то её не разрешают ставить
 * дома, кому-то просто не хочется, а буква имени в этом случае читается
 * как «профиль недоделан». Символ закрывает этот разрыв — он такой же
 * осознанный выбор, как и снимок, и ничего о человеке не выдаёт.
 *
 * Символ рисуется шрифтом системы и потому выглядит по-разному на Windows,
 * Android и iPhone. Для иконок интерфейса это было бы браком (см. Icon.tsx),
 * а для аватара — нет: это личный знак, а не элемент навигации.
 */

import type { CSSProperties } from 'react';

import { avatarBackground } from '@/lib/avatar';

export function Avatar({
  name,
  colorId,
  photoUrl,
  emoji,
  size = 40,
  className = '',
}: {
  name: string;
  colorId?: string | null;
  /** Готовая ссылка на фотографию. Побеждает символ и букву. */
  photoUrl?: string | null;
  /** Символ, выбранный учеником. Без него — первая буква имени. */
  emoji?: string | null;
  size?: number;
  className?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- внешний бакет, домен для next/image не настроен
      <img
        src={photoUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        /*
          object-cover обязателен: фотографии приходят любых пропорций, и без
          него портрет расплющило бы по ширине круга. Серый фон виден, пока
          картинка грузится, — иначе на её месте мигает дыра в вёрстке.
        */
        className={`shrink-0 rounded-full bg-ink-100 object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

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
