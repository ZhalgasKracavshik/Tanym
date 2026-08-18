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
};

export default nextConfig;
