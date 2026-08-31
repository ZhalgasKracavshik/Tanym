/** Проверка пользовательских ссылок: npm run test:url */

import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (path) => import(pathToFileURL(join(root, path)).href);

const { safeExternalUrl, isSafeExternalUrl } = await load('src/lib/safeUrl.ts');

const problems = [];
const ok = (value) => {
  if (!isSafeExternalUrl(value)) problems.push(`${JSON.stringify(value)} должно приниматься`);
};
const bad = (value) => {
  if (isSafeExternalUrl(value)) problems.push(`${JSON.stringify(value)} НЕ должно приниматься`);
};

/* Обычные ссылки на видео. */
ok('https://www.youtube.com/watch?v=abc123');
ok('http://example.kz/video.mp4');
ok('  https://rutube.ru/video/xyz/  ');

/* Ради чего проверка и делается: такие ссылки выполняют код при нажатии. */
bad('javascript:alert(1)');
bad('JavaScript:alert(1)');
bad('  javascript:alert(1)  ');
bad('data:text/html,<script>alert(1)</script>');
bad('vbscript:msgbox(1)');
bad('file:///C:/Windows/system32');

/* Не ссылки вовсе. */
bad('');
bad('   ');
bad('просто текст');
bad('www.youtube.com');
bad(null);
bad(undefined);
bad(42);
bad({ toString: () => 'https://example.com' });

/* Нормализация: возвращается разобранный адрес без краевых пробелов. */
if (safeExternalUrl('  https://example.com/a  ') !== 'https://example.com/a') {
  problems.push('ссылка должна возвращаться нормализованной и без краевых пробелов');
}

if (problems.length > 0) {
  console.error('✗ Проверка ссылок работает неверно:');
  for (const problem of problems) console.error('  - ' + problem);
  process.exit(1);
}

console.log('✓ ссылки: только http и https, javascript и data отбиваются');
