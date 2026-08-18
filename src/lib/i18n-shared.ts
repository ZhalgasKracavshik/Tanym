/**
 * Языковые константы, нужные и на сервере, и на клиенте.
 *
 * Отдельный файл нужен потому, что i18n.ts содержит React-хук useLang и из-за
 * этого работает только в браузере. Серверные AI-роуты обязаны знать название
 * языка для промпта, но не могут импортировать хуки — иначе сборка упадёт.
 */

import type { Language } from './types';

export const LANGUAGES: { id: Language; label: string; title: string }[] = [
  { id: 'ru', label: 'RU', title: 'Русский' },
  { id: 'kk', label: 'KZ', title: 'Қазақша' },
  { id: 'en', label: 'EN', title: 'English' },
];

/** Название языка для промпта — на нём модель обязана отвечать. */
export const LANGUAGE_NAME: Record<Language, string> = {
  ru: 'русском',
  kk: 'казахском (қазақ тілінде)',
  en: 'английском (English)',
};
