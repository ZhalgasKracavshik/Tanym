'use client';

/**
 * Аватар пользователя.
 *
 * Загруженная фотография, а без неё — первая буква имени на цветном фоне.
 *
 * Выбор символа и цвета отсюда убран: профиль опознают по лицу или по
 * имени, а набор смайликов превращал шапку в игрушку и занимал в
 * настройках больше места, чем контакты и учебные параметры вместе.
 * Цвет подложки остался, но выводится из имени — одинаковый у человека
 * всюду и не требует ещё одного решения от него.
 */

import type { CSSProperties } from 'react';

import { avatarBackground } from '@/lib/avatar';

export function Avatar({
  name,
  colorId,
  photoUrl,
  size = 40,
  className = '',
}: {
  name: string;
  colorId?: string | null;
  /** Готовая ссылка на фотографию. Без неё — буква имени. */
  photoUrl?: string | null;
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
    fontSize: Math.round(size * 0.4),
    lineHeight: 1,
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
