/**
 * Логотип и словесный знак Tanym.
 *
 * Знак собран как SVG, а не подключён присланным PNG, по двум причинам.
 * У файла белый фон, а не прозрачный: на тёмной панели входа он дал бы
 * белый прямоугольник вокруг знака. И это растр — в шапке знак рисуется
 * на 26–30 пикселях, а на экране с удвоенной плотностью такой PNG
 * заметно мылит края. Векторный знак масштабируется без потерь и красится
 * токенами.
 *
 * Словесный знак берёт цвет от родителя (currentColor), а не задаёт свой:
 * он стоит и на белой шапке, и на тёмной колонке входа, и вшитый цвет
 * пришлось бы каждый раз переопределять.
 */

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export function LogoMark({ size = 32, className = '' }: LogoProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/*
          Градиент идёт сверху-справа вниз-влево, повторяя наклон самого
          знака: так переход от оранжевого к малиновому читается вдоль
          штриха, а не поперёк него.
        */}
        <linearGradient id="tanym-mark-back" x1="72%" y1="0%" x2="18%" y2="100%">
          <stop offset="0%" stopColor="#E4552A" />
          <stop offset="52%" stopColor="#C93327" />
          <stop offset="100%" stopColor="#AF2038" />
        </linearGradient>
        <linearGradient id="tanym-mark-front" x1="65%" y1="0%" x2="25%" y2="100%">
          <stop offset="0%" stopColor="#F0802B" />
          <stop offset="100%" stopColor="#D63F26" />
        </linearGradient>
      </defs>

      {/*
        Две наклонные капсулы: длинная снизу-слева вверх и короткая поверх
        неё справа. Наклон задан одним поворотом на всю группу — так обе
        части гарантированно лежат под одним углом.
      */}
      <g transform="rotate(20 20 20)">
        <rect x="11" y="6" width="11" height="29" rx="5.5" fill="url(#tanym-mark-back)" />
        <rect x="18.5" y="3" width="10" height="18" rx="5" fill="url(#tanym-mark-front)" />
      </g>
    </svg>
  );
}

export function Logo({ size = 32, className = '', showText = true }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      {showText && (
        <span
          className="select-none text-[1.35rem] font-black leading-none tracking-[-0.02em]"
          style={{ fontSize: size * 0.72 }}
        >
          Taným
        </span>
      )}
    </span>
  );
}
