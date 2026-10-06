import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const nextConfig: NextConfig = {
  turbopack: {
    /**
     * Явно указываем корень проекта.
     *
     * Иначе Next.js поднимается вверх по дереву папок в поисках package-lock.json
     * и находит чужой файл в домашней директории пользователя — после чего
     * считает корнем проекта его, а не нашу папку.
     */
    root: dirname(fileURLToPath(import.meta.url)),
  },
  // Не сообщаем, на чём собран сайт: лишняя подсказка для сканеров уязвимостей.
  poweredByHeader: false,
  /**
   * Заголовки безопасности на все ответы (перенесено из Ulagat).
   * CSP ставится отдельно в proxy.ts: ей нужен nonce на каждый запрос.
   */
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            // Продукту не нужны камера, микрофон, геолокация и датчики —
            // будущая XSS не должна молча до них дотянуться.
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), payment=(), browsing-topics=()',
          },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
