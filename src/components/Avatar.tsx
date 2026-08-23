'use client';

/**
 * Аватар пользователя в стиле WhatsApp / современных мессенджеров.
 *
 * Если загружена фотография — отображает её.
 * По умолчанию — аккуратное стоковое изображение (узнаваемый силуэт пользователя
 * на нейтральном или выбранном фоне, как в WhatsApp).
 */

export function DefaultUserIcon({ className = 'text-white' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="currentColor"
      className={`w-full h-full ${className}`}
      aria-hidden="true"
    >
      {/* Голова */}
      <circle cx="20" cy="14" r="6.5" />
      {/* Плечи / бюст */}
      <path d="M7 36C7.5 26.5 13.5 23.5 20 23.5C26.5 23.5 32.5 26.5 33 36Z" />
    </svg>
  );
}

export function Avatar({
  name = '',
  colorId,
  photoUrl,
  size = 40,
  className = '',
}: {
  name?: string;
  colorId?: string | null;
  /** Готовая ссылка на фотографию. Без неё — стоковое изображение силуэта. */
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
        className={`shrink-0 rounded-full bg-ink-100 object-cover border border-black/5 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/5 bg-[#cfd7df] text-white shadow-inner ${className}`}
      style={{
        width: size,
        height: size,
        background: colorId ? undefined : '#d0d7de',
      }}
    >
      <span className="w-[82%] h-[82%] flex items-end justify-center translate-y-[8%] text-[#f0f3f6]">
        <DefaultUserIcon />
      </span>
    </span>
  );
}
