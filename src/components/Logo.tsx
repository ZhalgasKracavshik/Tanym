/**
 * Монограмма Tanym.
 *
 * Буквы T и M нарисованы засечным шрифтом и наложены друг на друга, точка
 * между ними — фирменный акцент. Векторная форма, а не картинка, поэтому
 * не размывается на любом экране и красится в любой цвет через currentColor.
 */

interface LogoProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 32, className = '' }: LogoProps) {
  return (
    <svg
      viewBox="0 0 44 44"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <text
        x="6"
        y="30"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fontSize="30"
        fill="currentColor"
      >
        T
      </text>
      <text
        x="15"
        y="33"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fontSize="25"
        fill="currentColor"
      >
        M
      </text>
      <circle cx="13.2" cy="22.5" r="1.7" fill="currentColor" />
    </svg>
  );
}

export function Logo({ size = 32, className = '' }: LogoProps) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <LogoMark size={size} className="text-accent-500" />
      <span className="text-lg font-black tracking-tight text-ink-900">Tanym</span>
    </span>
  );
}
