/**
 * Ограничитель частоты для записывающих API — по образцу Ulagat
 * (lib/security/rate-limit.ts).
 *
 * Почему не только lib/ai/rate-limit.ts. Тот счётчик живёт в памяти
 * процесса: на Vercel у каждого инстанса свой, и после «засыпания» он
 * обнуляется — это защита от случайного цикла, а не от скрипта. Общий
 * счётчик нужен во внешнем хранилище, поэтому здесь Upstash Redis (чистый
 * REST, работает в любом рантайме).
 *
 * Контракт:
 * - нет UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN — работает
 *   счётчик в памяти (лучше, чем ничего, и локальная разработка не требует
 *   аккаунта Upstash);
 * - Upstash недоступен — пропускаем запрос (fail open): ограничитель —
 *   тормоз от злоупотреблений, а не проверка доступа; доступ решают сессия
 *   и RLS.
 *
 * Вход и регистрация идут из браузера напрямую в Supabase Auth, мимо
 * нашего сервера, — их ограничивает сам Supabase (Auth → Rate Limits).
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { checkRateLimit } from '@/lib/ai/rate-limit';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * 30 записывающих запросов в минуту с одного адреса. С запасом для
 * школьного NAT, где за одним IP сидит целый класс, и всё равно делает
 * перебор и спам публикациями непрактичными.
 */
const WRITE_LIMIT = 30;

const limiter =
  url && token
    ? new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(WRITE_LIMIT, '60 s'),
        prefix: 'tanym:rl:write',
      })
    : null;

export interface RateLimitVerdict {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** Адрес клиента: на Vercel первым в x-forwarded-for стоит настоящий клиент. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export async function checkWriteRateLimit(request: Request): Promise<RateLimitVerdict> {
  const key = clientIp(request);

  if (!limiter) {
    const local = checkRateLimit(`write:${key}`);
    return { allowed: local.allowed, retryAfterSeconds: local.retryAfterSeconds ?? 0 };
  }

  try {
    const { success, reset } = await limiter.limit(key);
    return {
      allowed: success,
      retryAfterSeconds: success ? 0 : Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
    };
  } catch (error) {
    console.error('[rate-limit] Upstash недоступен, запрос пропущен:', error);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}
