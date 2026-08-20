'use client';

import Link from 'next/link';
import type { Language } from '@/lib/types';

const TEXT = {
  ru: { stock: 'Архив заданий', community: 'От учителей и админов' },
  kk: { stock: 'Тапсырмалар мұрағаты', community: 'Мұғалімдер мен админдерден' },
  en: { stock: 'Task archive', community: 'From teachers and admins' },
} as const;

export function ArchiveTabs({ active, language }: { active: 'stock' | 'community'; language: Language }) {
  const t = TEXT[language];
  const tabCls = (isActive: boolean) =>
    `rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-150 ${
      isActive ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300'
    }`;

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      <Link href="/archive" className={tabCls(active === 'stock')}>
        {t.stock}
      </Link>
      <Link href="/archive/community" className={tabCls(active === 'community')}>
        {t.community}
      </Link>
    </div>
  );
}
