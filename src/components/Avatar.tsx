'use client';

/**
 * Аватар: фотография, а без неё — инициалы на плоском цвете.
 *
 * Раньше без фото рисовался серый силуэт на сером фоне, одинаковый у всех,
 * и выбранный в профиле цвет не применялся вовсе. Безликий кружок — это
 * то, что пользователь назвал «скучной иконкой профиля»: ни у одного живого
 * продукта в нише (olimpiada.ru, Codeforces, Telegram, Instagram) его нет —
 * там фото, инициалы или фирменный рисунок.
 *
 * Цвет — сохранённый в профиле, а если не выбран, стабильный по имени: у
 * разных людей разные цвета ещё до того, как кто-то дошёл до настроек.
 */

import { avatarBackground, avatarInitials } from '@/lib/avatar';

export function Avatar({
  name = '',
  colorId,
  photoUrl,
  size = 40,
  className = '',
}: {
  name?: string;
  colorId?: string | null;
  /** Готовая ссылка на фотографию. Без неё — инициалы. */
  photoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- внешний бакет
      <img
        src={photoUrl}
        alt={name || 'Аватар'}
        width={size}
        height={size}
        loading="lazy"
        className={`shrink-0 rounded-full bg-ink-100 object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`relative flex shrink-0 select-none items-center justify-center rounded-full font-semibold leading-none tracking-[-0.02em] text-white ${className}`}
      style={{
        width: size,
        height: size,
        background: avatarBackground(colorId ?? null, name || '?'),
        // Две буквы занимают ~40% диаметра: крупнее — упираются в край на 24px.
        fontSize: Math.max(10, Math.round(size * 0.4)),
      }}
    >
      {avatarInitials(name)}
    </span>
  );
}
