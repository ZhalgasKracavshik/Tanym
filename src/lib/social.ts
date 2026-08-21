/**
 * Ссылки на соцсети в профиле.
 *
 * Ученики просили возможность оставить рядом с портфолио свои контакты:
 * репетиторство и командные проекты начинаются с того, что человека
 * находят где-то ещё.
 *
 * Здесь же живёт проверка адреса, и это не формальность. Ссылку вводит
 * пользователь, а выводится она в атрибут href, который видят другие —
 * то есть строка вида javascript:... превратилась бы в исполняемый код
 * при клике по чужому профилю. Поэтому разрешены ровно две схемы,
 * http и https, а всё остальное отбрасывается.
 */

import type { IconName } from '@/components/Icon';

export type SocialPlatform =
  | 'instagram'
  | 'tiktok'
  | 'whatsapp'
  | 'telegram'
  | 'youtube'
  | 'website';

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
}

export const SOCIAL_PLATFORMS: {
  id: SocialPlatform;
  title: string;
  icon: IconName;
  /** Подсказка в поле ввода: показывает ожидаемый вид адреса. */
  placeholder: string;
  /** Фирменный цвет — по нему иконка узнаётся быстрее, чем по форме. */
  color: string;
}[] = [
  {
    id: 'instagram',
    title: 'Instagram',
    icon: 'instagram',
    placeholder: 'https://instagram.com/username',
    color: '#c13584',
  },
  {
    id: 'tiktok',
    title: 'TikTok',
    icon: 'tiktok',
    placeholder: 'https://tiktok.com/@username',
    color: '#111111',
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp',
    icon: 'whatsapp',
    placeholder: 'https://wa.me/77001234567',
    color: '#25d366',
  },
  {
    id: 'telegram',
    title: 'Telegram',
    icon: 'telegram',
    placeholder: 'https://t.me/username',
    color: '#2aabee',
  },
  {
    id: 'youtube',
    title: 'YouTube',
    icon: 'video',
    placeholder: 'https://youtube.com/@channel',
    color: '#ff0000',
  },
  {
    id: 'website',
    title: 'Сайт',
    icon: 'globe',
    placeholder: 'https://example.kz',
    color: '#4d6b85',
  },
];

export function platformMeta(platform: SocialPlatform) {
  return SOCIAL_PLATFORMS.find((item) => item.id === platform) ?? SOCIAL_PLATFORMS[5];
}

/**
 * Приводит введённый адрес к безопасному виду или возвращает null.
 *
 * Человек чаще всего печатает «instagram.com/name» без схемы — молча
 * отвергать такое было бы придиркой, поэтому https подставляется сам.
 * А вот всё, что после разбора оказалось не http(s), отбрасывается:
 * javascript:, data: и подобные схемы в href недопустимы.
 */
export function normalizeSocialUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  // Адрес без домена («https://») формально разбирается, но ведёт в никуда.
  if (!parsed.hostname.includes('.')) return null;

  return parsed.toString();
}

/** Короткая подпись под иконкой: домен и путь без схемы и лишних хвостов. */
export function shortenUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/$/, '');
    return `${parsed.hostname.replace(/^www\./, '')}${path}`;
  } catch {
    return url;
  }
}

/**
 * Разбирает то, что пришло из базы.
 *
 * Колонка jsonb хранит что угодно, а прочитанное сразу уходит в разметку,
 * поэтому доверять её содержимому нельзя: проверяем и форму, и адрес.
 */
export function parseSocialLinks(value: unknown): SocialLink[] {
  if (!Array.isArray(value)) return [];

  const known = new Set(SOCIAL_PLATFORMS.map((item) => item.id));

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const platform = (entry as { platform?: unknown }).platform;
    const url = (entry as { url?: unknown }).url;
    if (typeof platform !== 'string' || typeof url !== 'string') return [];
    if (!known.has(platform as SocialPlatform)) return [];

    const safe = normalizeSocialUrl(url);
    return safe ? [{ platform: platform as SocialPlatform, url: safe }] : [];
  });
}
