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
  ru: 'Tanym — персональный AI-наставник для школьников Казахстана.',
  kk: 'Tanym — Қазақстан оқушыларына арналған жеке AI-тәлімгер.',
  en: 'Tanym — a personal AI mentor for students in Kazakhstan.',
};

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-ink-400 sm:px-6">{TEXT[useLang()]}</div>
    </footer>
  );
}
