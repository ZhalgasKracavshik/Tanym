import { strict as assert } from 'node:assert';
import { storageObjectName } from '../src/lib/storageKey.ts';

/*
  Проверяется одно: что бы ни принесли, ключ состоит из символов, которые
  хранилище принимает. Именно на этом ломались настоящие файлы —
  «taným (1).pdf» и «Алгебра 7 класс.pdf».
*/
const SAFE = /^[a-z0-9._-]+$/;

const cases = [
  'taným (1).pdf',
  'Алгебра 7 класс.docx',
  'Контрольная работа №2.pdf',
  'scan.PDF',
  'файл',
  '.gitignore',
  'a'.repeat(300) + '.png',
  '🏆 диплом.jpg',
];

for (const name of cases) {
  const key = storageObjectName(name);
  assert.ok(SAFE.test(key), `небезопасный ключ для «${name}»: ${key}`);
  assert.ok(key.length <= 80, `слишком длинный ключ для «${name}»: ${key.length}`);
}

// Расширение сохраняется: по нему браузер решает, показать файл или скачать.
assert.ok(storageObjectName('диплом.pdf').endsWith('.pdf'));
assert.ok(storageObjectName('scan.PDF').endsWith('.pdf'));

// Два одинаковых имени не дают один ключ — иначе второй файл затирал бы первый.
assert.notEqual(storageObjectName('скан.pdf'), storageObjectName('скан.pdf'));

console.log('✓ Ключ файла в хранилище безопасен для любого имени');
