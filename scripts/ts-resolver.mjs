/**
 * Резолвер импортов для скриптов проверки.
 *
 * Модули приложения импортируют друг друга без расширения («../grading»)
 * и через алиас «@/», как принято в Next. Node так не умеет, поэтому
 * скрипты до сих пор могли загружать только те модули, которые обходятся
 * импортом одних типов: типы стираются, и разрешать их не нужно.
 *
 * Оценка качества ответов модели должна идти через настоящий код сборки
 * промптов, а не через его копию в скрипте, иначе она проверяет не то,
 * что работает в продукте. Этот хук доучивает Node двум правилам Next, и
 * ничего больше: расширение подставляется, алиас разворачивается.
 */

import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

function withExtension(baseUrl) {
  for (const extension of EXTENSIONS) {
    const candidate = new URL(baseUrl.href + extension);
    if (existsSync(candidate)) return candidate.href;
  }
  return null;
}

export function resolve(specifier, context, next) {
  const hasExtension = /\.[a-z]+$/i.test(specifier);

  if (specifier.startsWith('@/')) {
    const base = pathToFileURL(join(root, 'src', specifier.slice(2)));
    const resolved = hasExtension ? base.href : withExtension(base);
    if (resolved) return next(resolved, context);
  }

  if (specifier.startsWith('.') && !hasExtension) {
    const resolved = withExtension(new URL(specifier, context.parentURL));
    if (resolved) return next(resolved, context);
  }

  return next(specifier, context);
}
