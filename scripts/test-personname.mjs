/** Проверка имени при регистрации: npm run test:name */

import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (path) => import(pathToFileURL(join(root, path)).href);

const { checkPersonName, normalizePersonName } = await load('src/lib/personName.ts');

const problems = [];
const ok = (input, expected) => {
  const result = checkPersonName(input);
  if (!result.ok) return problems.push(`${JSON.stringify(input)} должно приниматься, а отклонено: ${result.reason}`);
  if (expected && result.value !== expected) {
    problems.push(`${JSON.stringify(input)} должно приводиться к ${JSON.stringify(expected)}, получено ${JSON.stringify(result.value)}`);
  }
};
const bad = (input) => {
  if (checkPersonName(input).ok) problems.push(`${JSON.stringify(input)} не должно приниматься`);
};

/* Настоящие имена, которые обязаны проходить. */
ok('Айсултан Жакыпов', 'Айсултан Жакыпов');
ok('Aisultan Zhakypov');
ok('Әсел Нұрланқызы');
ok('Анна-Мария Ковалёва');
ok('Жанна ОКоннор');
ok('  Данил   Жалгасов  ', 'Данил Жалгасов');
ok('Нурсултан Абишевич Назарбаев');

/* Мусор, ради которого проверка и делалась. */
bad('');
bad('   ');
bad('ы');
bad('ыы');
bad('Данил');
bad('12345');
bad('Данил 2');
bad('Иван И');
bad('!!! ???');
bad(null);
bad(undefined);
bad(42);

/* Схлопывание пробелов не зависит от результата проверки. */
if (normalizePersonName('  а   б  ') !== 'а б') problems.push('пробелы должны схлопываться');

if (problems.length > 0) {
  console.error('✗ Проверка имени работает неверно:');
  for (const problem of problems) console.error('  - ' + problem);
  process.exit(1);
}

console.log('✓ имя: две части, только буквы, без цифр и мусора');
