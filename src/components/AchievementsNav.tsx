'use client';

/**
 * Переключатель между своим портфолио и достижениями школы.
 *
 * Раньше и то и другое лежало на одной странице друг под другом, и
 * разница между ними читалась только по подписям разделов: сверху «Моё
 * портфолио» с формой подачи, ниже «Достижения учеников» — общая лента.
 * Два списка достижений на одном экране путались между собой: человек
 * искал в ленте своё, не находил (оно ещё на проверке) и добавлял второй
 * раз.
 *
 * Разделено на две страницы, а не на вкладки внутри одной: у своего
 * портфолио и у школьной ленты разные адреса, и ссылку на ленту можно
 * отправить, не открывая чужому человеку форму подачи.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/achievements', label: 'Достижения школы' },
  { href: '/achievements/my', label: 'Моё портфолио' },
] as const;

export function AchievementsNav({ showMine }: { showMine: boolean }) {
  const pathname = usePathname();
  /*
    Учителю и администрации второй пункт не показывается: портфолио они
    не ведут, и вкладка вела бы их на страницу, где нечего добавить.
  */
  const links = showMine ? LINKS : LINKS.slice(0, 1);
  if (links.length < 2) return null;

  return (
    <nav className="mt-6 inline-flex rounded-[var(--radius-pill)] border border-ink-200 bg-white p-1">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-[var(--radius-pill)] px-4 py-2 text-sm font-medium transition-colors ${
              active ? 'bg-ink-900 text-white' : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
