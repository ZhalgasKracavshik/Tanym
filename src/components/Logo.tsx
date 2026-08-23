/**
 * Монограмма и словесный знак Tanym.
 *
 * Прежняя версия ломалась по конкретной причине: значок был набран шрифтом
 * `Georgia, 'Times New Roman', serif` — системным, не подключённым через
 * next/font, — а буквы под ним вручную сдвинуты числами, подобранными на
 * глаз под метрику именно Georgia. На машине, где Georgia не установлена
 * (а гарантий этого нет нигде, кроме Windows и части macOS), браузер молча
 * подставлял другой засечный шрифт с другими пропорциями — и подогнанные
 * координаты переставали совпадать: буквы «кривые» ровно на тех
 * устройствах, где нет Georgia.
 *
 * Здесь значок и словесный знак используют один и тот же шрифт —
 * Playfair Display, подключённый через next/font (см. `layout.tsx`) — то
 * есть один и тот же файл шрифта у каждого посетителя, без подстановок.
 * Смещения между T и M не подобраны на глаз, а посчитаны по настоящим
 * метрикам этого файла (unitsPerEm, контуры глифов): стержень T специально
 * поставлен точно на левую стойку M, а не рядом с ней «примерно».
 */

interface LogoProps {
  size?: number;
  className?: string;
}

/** Единый шрифт значка и словесного знака — см. обоснование выше. */
const LOGO_FONT = 'var(--font-playfair), Georgia, serif';

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
      {/*
        M — снизу, ниже базовой линии T на 2 пункта: в образце заказчика M
        стоит на переднем плане, T — фоном за ней. Тот же приём, только на
        осмысленных числах.
      */}
      <text x="9.97" y="35" fontFamily={LOGO_FONT} fontWeight="800" fontSize="25" fill="currentColor">
        M
      </text>
      {/*
        T поверх M. Число x=3 подобрано не на глаз: стержень T (центр между
        x=254 и x=413 в собственных 1000 юнитах глифа при fontSize=30) при
        этом x ложится ровно на левую стойку M (центр между x=110 и x=133
        в 1000 юнитах M при fontSize=25) — они совпадают в одной точке на
        экране, а не просто «рядом». y=33, а не 32: при 32 засечка верхней
        перекладины T на пиксель заходила за верхний край viewBox.
      */}
      <text x="3" y="33" fontFamily={LOGO_FONT} fontWeight="800" fontSize="30" fill="currentColor">
        T
      </text>
      {/* Точка на пересечении стержня T и стойки M — акцент из образца. */}
      <circle cx="13" cy="21.3" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function Logo({ size = 32, className = '' }: LogoProps) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} className="text-accent-500" />
      {/*
        Прописные с разрядкой, а не «Tanym» строчными: в образце заказчика
        словесный знак набран капителью с широким трекингом — так читается
        как знак, а не как обычное слово в тексте интерфейса. Ý — буква
        казахского латинского алфавита, глиф для нее в файле Playfair
        Display проверен (есть в обеих начертаниях, 700 и 800).
      */}
      <span
        className="text-lg text-accent-500"
        style={{
          fontFamily: LOGO_FONT,
          fontWeight: 700,
          letterSpacing: '0.14em',
        }}
      >
        TANÝM
      </span>
    </span>
  );
}
