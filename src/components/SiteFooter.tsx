'use client';

/**
 * Подвал сайта.
 *
 * Вынесен в отдельный клиентский компонент, потому что зависит от выбранного
 * языка, а layout.tsx остаётся серверным — так основная разметка страницы
 * по-прежнему собирается на сервере, а на клиент уходит только эта мелочь.
 */

import type { Dict } from '@/lib/i18n';
import { useLang } from '@/lib/i18n';

const TEXT: Dict<string> = {
  ru: 'Tanym: учебный проект для Future Minds Hackathon 2026, трек Social Impact.',
  kk: 'Tanym: Future Minds Hackathon 2026 байқауының Social Impact бағытына арналған оқу жобасы.',
  en: 'Tanym is a student project for Future Minds Hackathon 2026, Social Impact track.',
};

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-ink-400 sm:px-6">{TEXT[useLang()]}</div>
    </footer>
  );
}
