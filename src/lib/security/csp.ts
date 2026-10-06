/**
 * Content-Security-Policy с nonce — перенесено из Ulagat (lib/security/csp.ts).
 *
 * Зачем. Любая XSS — подставленный в карточку события <script>, ссылка
 * javascript: в описании — без CSP исполняется с правами вошедшего
 * пользователя и может читать его сессию Supabase. С nonce браузер
 * исполняет только те скрипты, которые сервер сам отметил на этом запросе.
 *
 * proxy генерирует nonce на каждый запрос и кладёт политику и в заголовок
 * запроса (по нему Next.js проставляет nonce своим инлайн-скриптам), и в
 * заголовок ответа (его исполняет браузер). Работает только на динамически
 * отрендеренных страницах — корневой layout читает сессию из куки, поэтому
 * динамические у нас все.
 *
 * Про директивы:
 * - 'strict-dynamic' отключает allowlist по хостам для скриптов: чанки,
 *   которые подгружает доверенный скрипт Next.js, доверены автоматически.
 * - Стили инлайн разрешены: их проставляют Tailwind и framer-motion через
 *   атрибут style, а nonce на стилях ломает вставку правил при гидратации.
 *   Скриптов через style не исполнить, это стандартный компромисс.
 * - AI ходит в Google только с сервера, поэтому Gemini здесь нет.
 */

/** 128-битный случайный nonce в base64 (Web Crypto — работает в любом рантайме). */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function buildCsp(nonce: string): string {
  const dev = process.env.NODE_ENV === 'development';

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
  const supabaseWs = supabaseUrl.startsWith('https://') ? supabaseUrl.replace(/^https:/, 'wss:') : '';

  const directives = [
    `default-src 'self'`,
    // Dev: React Refresh требует eval.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline'`,
    // Обложки и аватары — публичные ссылки Supabase Storage; обложки
    // событий — ещё и готовые https-ссылки организатора.
    `img-src 'self' blob: data: https:`,
    // Аудио постов достижений лежит в Supabase Storage.
    `media-src 'self' blob: ${supabaseUrl}`.trim(),
    `font-src 'self' data:`,
    // REST и Realtime Supabase; в dev — вебсокет HMR.
    `connect-src 'self' ${supabaseUrl} ${supabaseWs}${dev ? ' ws: wss:' : ''}`.replace(/\s+/g, ' ').trim(),
    `frame-src 'none'`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `report-uri /api/csp-report`,
  ];

  if (!dev) directives.push('upgrade-insecure-requests');

  return directives.join('; ');
}
