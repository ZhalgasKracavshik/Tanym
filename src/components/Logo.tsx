/**
 * Логотип и словесный знак Tanym в современном лаконичном стиле.
 *
 * Использует основной гротеск сайта (Inter / font-sans) и современный
 * геометричный знак с фирменным градиентом терракоты.
 */

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export function LogoMark({ size = 32, className = '' }: LogoProps) {
  return (
    <svg
      viewBox="0 0 36 36"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      focusable="false"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="tanym-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e57545" />
          <stop offset="55%" stopColor="#d85f2e" />
          <stop offset="100%" stopColor="#b34a1f" />
        </linearGradient>
      </defs>
      {/* Мягкий скругленный суперэллипс (squircle) */}
      <rect width="36" height="36" rx="10" fill="url(#tanym-logo-grad)" />
      {/* Современная стилизованная буква T со светящейся точкой познания */}
      <path
        d="M9 12C9 10.8954 9.89543 10 11 10H25C26.1046 10 27 10.8954 27 12C27 13.1046 26.1046 14 25 14H20V25C20 26.1046 19.1046 27 18 27C16.8954 27 16 26.1046 16 25V14H11C9.89543 14 9 13.1046 9 12Z"
        fill="white"
      />
      {/* Акцентная точка */}
      <circle cx="24.5" cy="18.5" r="2" fill="#ffd88e" />
    </svg>
  );
}

export function Logo({ size = 32, className = '', showText = true }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {showText && (
        <span className="flex items-baseline tracking-tight font-extrabold select-none">
          <span className="text-xl tracking-wider text-brand-600 font-black">TANÝM</span>
        </span>
      )}
    </span>
  );
}
