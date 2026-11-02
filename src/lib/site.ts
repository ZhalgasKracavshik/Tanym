/**
 * Адрес и имя сайта для SEO, писем и ссылок «поделиться».
 *
 * NEXT_PUBLIC_SITE_URL задаётся в Vercel. Пока своего домена нет — адрес
 * Vercel. Когда появится домен, достаточно поменять переменную: canonical,
 * sitemap, Open Graph и письма возьмут новый адрес сами.
 */

import { createClient } from '@supabase/supabase-js';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tanym-alpha.vercel.app').replace(/\/+$/, '');

export const SITE_NAME = 'Taným';

/**
 * Все написания, которыми название ищут: с «ý», без, кириллицей и
 * по-казахски. Google склеивает их не всегда, поэтому они есть в тексте
 * страниц и в alternateName разметки.
 */
export const SITE_ALIASES = ['Taným', 'Tanym', 'Таным', 'Таным афиша', 'Tanym афиша'];

/**
 * Клиент Supabase без кук — для sitemap и метаданных на сервере.
 * Ходит с публичным ключом и видит ровно то же, что гость: одобренные события.
 */
export function publicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
