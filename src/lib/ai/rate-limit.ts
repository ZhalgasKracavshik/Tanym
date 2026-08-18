/**
 * Простой ограничитель частоты запросов к AI-роутам.
 *
 * Зачем: ключ Google AI Studio работает на бесплатной квоте. Без ограничителя
 * один скрипт (или случайный цикл в интерфейсе) способен выжечь дневной лимит
 * за минуту, и живая демонстрация встанет.
 *
 * Честное ограничение: счётчик живёт в памяти процесса. На serverless-хостинге
 * у каждого инстанса он свой и обнуляется при «засыпании». Это защита от случайного
 * перерасхода, а не от целенаправленной атаки — для настоящей защиты нужен
 * общий счётчик во внешнем хранилище (Redis/Upstash).
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

const hits = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  /** Сколько секунд ждать до следующей попытки. Заполняется, когда allowed === false. */
  retryAfterSeconds?: number;
}

export function checkRateLimit(clientKey: string, now = Date.now()): RateLimitResult {
  const windowStart = now - WINDOW_MS;
  const previous = hits.get(clientKey) ?? [];
  const recent = previous.filter((timestamp) => timestamp > windowStart);

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldest = recent[0];
    hits.set(clientKey, recent);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000)),
    };
  }

  recent.push(now);
  hits.set(clientKey, recent);

  // Не даём карте расти бесконечно: периодически чистим пустые записи.
  if (hits.size > 500) {
    for (const [key, timestamps] of hits) {
      if (timestamps.every((t) => t <= windowStart)) hits.delete(key);
    }
  }

  return { allowed: true };
}

/** Ключ клиента: за прокси Vercel реальный адрес приходит в x-forwarded-for. */
export function clientKeyFromRequest(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}
