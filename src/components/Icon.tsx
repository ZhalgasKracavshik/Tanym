/**
 * Набор иконок Tanym.
 *
 * Почему свои контурные иконки, а не эмодзи. Эмодзи рисуются шрифтом
 * операционной системы: на Windows, Android и iPhone они выглядят по-разному,
 * не подчиняются цвету текста и сбивают вертикальный ритм строки. Для продукта,
 * который открывают с чего угодно, это означает разный внешний вид у разных
 * учеников.
 *
 * Все фигуры нарисованы на одной сетке 24 на 24 контуром одинаковой толщины,
 * поэтому в строке они смотрятся как единое семейство. Цвет берётся из
 * currentColor, то есть иконка всегда совпадает по цвету с соседним текстом.
 */

import type { SVGProps } from 'react';

export type IconName =
  | 'math'
  | 'physics'
  | 'history'
  | 'cap'
  | 'medal'
  | 'globe'
  | 'chart'
  | 'clipboard'
  | 'trophy'
  | 'school'
  | 'video'
  | 'presentation'
  | 'backpack'
  | 'building'
  | 'health'
  | 'flag'
  | 'clock'
  | 'alert'
  | 'megaphone'
  | 'steps'
  | 'compass'
  | 'target'
  | 'weight'
  | 'flame'
  | 'bolt'
  | 'crosshair'
  | 'bookCheck'
  | 'brain'
  | 'gem'
  | 'check'
  | 'close'
  | 'sparkles'
  | 'book'
  | 'bell'
  | 'star'
  | 'pin'
  | 'image'
  | 'pencil'
  | 'bulb'
  | 'columns'
  | 'plus'
  | 'arrow-left'
  | 'shield'
  | 'crown'
  | 'users'
  | 'user'
  | 'folder'
  | 'calendar'
  | 'rocket'
  | 'chat'
  | 'menu'
  | 'arrowRight'
  | 'settings'
  | 'instagram'
  | 'tiktok'
  | 'whatsapp'
  | 'telegram'
  | 'link'
  | 'eye'
  | 'eyeOff'
  | 'lock'
  | 'mail';

/**
 * Контуры иконок. Каждая нарисована в квадрате 24 на 24 без заливки,
 * чтобы толщина линии совпадала во всём наборе.
 */
const PATHS: Record<IconName, React.ReactNode> = {
  math: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M7 8h4M9 6v4M14 8h3M14 15h3M14.5 17.5 17 15M14.5 15l2.5 2.5M7 16h4" />
    </>
  ),
  physics: (
    <>
      <circle cx="12" cy="12" r="2" />
      <ellipse cx="12" cy="12" rx="9.5" ry="4" />
      <ellipse cx="12" cy="12" rx="9.5" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9.5" ry="4" transform="rotate(120 12 12)" />
    </>
  ),
  history: (
    <>
      <path d="M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10" />
      <path d="M12 3 3 8h18l-9-5Z" />
    </>
  ),
  cap: (
    <>
      <path d="M12 4 2 9l10 5 10-5-10-5Z" />
      <path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" />
    </>
  ),
  medal: (
    <>
      <circle cx="12" cy="15" r="5.5" />
      <path d="M8.5 10 6 3M15.5 10 18 3M9 3h6" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9S14.5 18.3 12 21c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4M4 20h16" />
      <path d="M8 20v-6M12.5 20V8M17 20v-9" />
    </>
  ),
  clipboard: (
    <>
      <path d="M9 4h6v3H9V4Z" />
      <path d="M15 5.5h2.5A1.5 1.5 0 0 1 19 7v12.5A1.5 1.5 0 0 1 17.5 21h-11A1.5 1.5 0 0 1 5 19.5V7a1.5 1.5 0 0 1 1.5-1.5H9" />
      <path d="M8.5 12h7M8.5 16h4" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4.5v1.5A3.5 3.5 0 0 0 8 11M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11" />
      <path d="M12 14v3M9 21h6l-1-4h-4l-1 4Z" />
    </>
  ),
  school: (
    <>
      <path d="M3 21h18M4 21V9l8-5 8 5v12" />
      <path d="M9.5 21v-5.5h5V21" />
    </>
  ),
  video: (
    <>
      <rect x="2.5" y="5" width="13" height="14" rx="2.5" />
      <path d="M15.5 10.5 21.5 7v10l-6-3.5v-3Z" />
    </>
  ),
  presentation: (
    <>
      <rect x="3" y="4" width="18" height="11" rx="2" />
      <path d="M12 15v3M8.5 21 12 18l3.5 3" />
    </>
  ),
  backpack: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0v10.5A1.5 1.5 0 0 1 16.5 21h-9A1.5 1.5 0 0 1 6 19.5V9Z" />
      <path d="M9.5 9V5.5a2.5 2.5 0 0 1 5 0V9M9 14h6" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8.5 7.5h2M13.5 7.5h2M8.5 12h2M13.5 12h2M10 21v-4h4v4" />
    </>
  ),
  health: (
    <>
      <path d="M3 12h3l2-4 3 8 2.5-6 1.5 2h6" />
    </>
  ),
  flag: (
    <>
      <path d="M6 21V4M6 4h11l-2.5 4L17 12H6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.5l3.5 2" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5 21.5 20h-19L12 3.5Z" />
      <path d="M12 10v4.5M12 17.5v.01" />
    </>
  ),
  megaphone: (
    <>
      <path d="M4 10v4a1.5 1.5 0 0 0 1.5 1.5H8l8 4.5V5.5L8 10H5.5A1.5 1.5 0 0 0 4 11.5Z" />
      <path d="M19 9.5a4 4 0 0 1 0 5" />
    </>
  ),
  steps: (
    <>
      <rect x="4" y="3" width="5.5" height="8" rx="2.75" />
      <rect x="14.5" y="13" width="5.5" height="8" rx="2.75" />
      <path d="M6.75 13v3.5M17.25 7.5V11" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5.5-5.5 2 2-5.5 5.5-2Z" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
    </>
  ),
  weight: (
    <>
      <path d="M3 10v4M6 8v8M18 8v8M21 10v4M6 12h12" />
    </>
  ),
  flame: (
    <>
      <path d="M12 3c.5 3 2 4 3.5 5.5A6.5 6.5 0 1 1 6 13.5C6 10 9.5 9 12 3Z" />
      <path d="M12 20a3 3 0 0 1-1-5.5c1-.7 1.5-1.5 1.7-2.5.9.8 2.3 2.2 2.3 4.2A3 3 0 0 1 12 20Z" />
    </>
  ),
  bolt: (
    <>
      <path d="M13.5 2 4 13.5h6L9.5 22 20 10h-6.5L13.5 2Z" />
    </>
  ),
  crosshair: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      <circle cx="12" cy="12" r="1.5" />
    </>
  ),
  bookCheck: (
    <>
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15Z" />
      <path d="M5 19.5A1.5 1.5 0 0 1 6.5 18H19v3H6.5A1.5 1.5 0 0 1 5 19.5Z" />
      <path d="m9 9.5 2 2 4-4" />
    </>
  ),
  brain: (
    <>
      <path d="M9.5 4a3 3 0 0 0-3 3 3 3 0 0 0-1.5 5.5A3 3 0 0 0 7 18a3 3 0 0 0 5 2V4.5A2 2 0 0 0 9.5 4Z" />
      <path d="M14.5 4a3 3 0 0 1 3 3 3 3 0 0 1 1.5 5.5A3 3 0 0 1 17 18a3 3 0 0 1-5 2" />
    </>
  ),
  gem: (
    <>
      <path d="M6 3h12l3.5 6L12 21 2.5 9 6 3Z" />
      <path d="M2.5 9h19M9 3l-1.5 6L12 21l4.5-12L15 3" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5 10-11" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  sparkles: (
    <>
      <path d="M12 3.5 13.8 9l5.5 1.8-5.5 1.8L12 18l-1.8-5.4L4.7 10.8 10.2 9 12 3.5Z" />
      <path d="M18.5 16.5 19.3 19l2.2.8-2.2.8-.8 2.2" />
    </>
  ),
  book: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z" />
      <path d="M4 19a2 2 0 0 1 2-2h13v4H6a2 2 0 0 1-2-2Z" />
    </>
  ),
  bell: (
    <>
      <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9Z" />
      <path d="M10.5 19a1.8 1.8 0 0 0 3 0" />
    </>
  ),
  star: <path d="m12 3 2.7 5.9 6.3.7-4.7 4.3 1.3 6.1L12 17l-5.6 3 1.3-6.1L3 9.6l6.3-.7L12 3Z" />,
  pin: (
    <>
      <path d="M9 3h6l-1 6 3.5 3H6.5L10 9 9 3Z" />
      <path d="M12 12v9" />
    </>
  ),
  // Рамка, солнце и линия горизонта — знак изображения, узнаваемый
  // без подписи. Рисуется тем же контуром, что и остальной набор.
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m4 17 4.5-4.5a2 2 0 0 1 2.8 0L16 17" />
      <path d="m14 15 1.6-1.6a2 2 0 0 1 2.8 0L20 15" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20h4L20 8l-4-4L4 16v4Z" />
      <path d="m14.5 5.5 4 4" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 17a6 6 0 1 1 6 0v2H9v-2Z" />
      <path d="M10 21h4" />
    </>
  ),
  columns: (
    <>
      <path d="M3 21h18M4 21V8M10 21V8M14 21V8M20 21V8" />
      <path d="M2.5 8h19L12 2.5 2.5 8Z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  'arrow-left': <path d="M19 12H5m0 0 6-6m-6 6 6 6" />,
  shield: <path d="M12 3 5 6v5.5c0 4 2.8 7.6 7 9.5 4.2-1.9 7-5.5 7-9.5V6l-7-3Z" />,
  crown: (
    <>
      <path d="M3 8.5 6 15h12l3-6.5-4.6 2.6L12 4l-4.4 7.1L3 8.5Z" />
      <path d="M6 18h12" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.8 20a6.2 6.2 0 0 1 12.4 0" />
      <path d="M16 5.4a3.4 3.4 0 0 1 0 5.2M17.5 14.4A6.2 6.2 0 0 1 21.2 20" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  folder: <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4L11 8h8.5A1.5 1.5 0 0 1 21 9.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-12Z" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  rocket: (
    <>
      <path d="M12 2.5c3.5 2.5 5 6 5 9.5l-2.5 3h-5L7 12c0-3.5 1.5-7 5-9.5Z" />
      <circle cx="12" cy="10" r="1.8" />
      <path d="M9.5 15 8 21l4-2.5 4 2.5-1.5-6" />
    </>
  ),
  chat: (
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-5 4V5.5Z" />
      <path d="M8.5 8h7M8.5 11.5h4" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="1.2" />
    </>
  ),
  tiktok: (
    <>
      <path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5" />
      <path d="M14 4c.5 2.2 2.2 3.8 4.5 4" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M3.5 20.5 5 16.5a8 8 0 1 1 3 3l-4.5 1Z" />
      <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5.6 0 1-.5 1-1l-1.5-1-1 1c-1-.4-2.1-1.5-2.5-2.5l1-1-1-1.5c-.5 0-1 .4-1 1Z" />
    </>
  ),
  telegram: <path d="M21 4 3 11l5 2 2 6 3-4 5 3 3-14Zm-13 9 10-6-7 8" />,
  link: (
    <>
      <path d="M10 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7l-1.5 1.5" />
      <path d="M14 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1.5-1.5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M10.6 6.2A9.9 9.9 0 0 1 12 6c6.4 0 10 6 10 6a17.6 17.6 0 0 1-3.4 4M6.6 6.7A17.4 17.4 0 0 0 2 12s3.6 6 10 6a9.7 9.7 0 0 0 4-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
};

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  /** Размер стороны в пикселях. По умолчанию совпадает с высотой строки. */
  size?: number;
}

export function Icon({ name, size = 20, className = '', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      // Иконка сопровождает текст, а не заменяет его, поэтому для программ
      // чтения с экрана она скрыта: рядом всегда есть подпись.
      aria-hidden="true"
      focusable="false"
      className={`inline-block shrink-0 ${className}`}
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
