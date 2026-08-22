/**
 * Проверка полей профиля: телефон и справочники.
 *
 * Телефон — единственное поле профиля со свободным вводом, которое потом
 * показывают другому человеку как способ связи. Ошибка здесь не роняет
 * страницу, а тихо подсовывает куратору неверный номер, и заметить это
 * некому: и ученик, и куратор увидят правдоподобные цифры.
 */

import { strict as assert } from 'node:assert';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { normalizePhone, KNOWLEDGE_LEVELS, INTERESTS, STUDY_TIMES, WEEKDAYS, REMINDER_LEADS, reminderLabel } =
  await import(pathToFileURL(join(root, 'src/lib/profileFields.ts')).href);

/* --- 1. Телефон: что принимаем --- */

assert.equal(normalizePhone('+7 700 123 45 67'), '+77001234567', 'пробелы убираются, плюс остаётся');
assert.equal(normalizePhone('8 (700) 123-45-67'), '87001234567', 'скобки и дефисы убираются');
assert.equal(normalizePhone('  +77001234567  '), '+77001234567', 'края обрезаются');

/* --- 2. Телефон: что отвергаем --- */

// Главный случай, ради которого написан тест: добавочный номер раньше
// молча приклеивался к основному и давал правдоподобный неверный номер.
assert.equal(
  normalizePhone('+7 (700) 123-45-67 доб. 12'),
  null,
  'добавочный не должен приклеиваться к номеру',
);
assert.equal(normalizePhone('позвони маме'), null, 'текст — не номер');
assert.equal(normalizePhone('+7700123456 7abc'), null, 'буквы в конце не отбрасываются молча');
assert.equal(normalizePhone('123'), null, 'слишком короткий');
assert.equal(normalizePhone('1234567890123456'), null, 'слишком длинный');
assert.equal(normalizePhone('+7+7001234567'), null, 'два плюса — не номер');
assert.equal(normalizePhone(''), null, 'пустая строка — это «нет номера»');
assert.equal(normalizePhone('   '), null, 'пробелы — тоже «нет номера»');

/* --- 3. Справочники: уникальность идентификаторов --- */

for (const [label, list] of [
  ['уровни', KNOWLEDGE_LEVELS],
  ['интересы', INTERESTS],
  ['время занятий', STUDY_TIMES],
  ['дни недели', WEEKDAYS],
]) {
  const ids = list.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length, `${label}: идентификаторы должны быть уникальны`);
}

// Сервер отбраковывает всё, чего нет в справочнике, — значит пустой
// справочник тихо запретил бы сохранять что угодно.
assert.ok(KNOWLEDGE_LEVELS.length > 0 && INTERESTS.length > 0, 'справочники не должны быть пустыми');

/* --- 4. Дни недели совпадают с нумерацией JS --- */

const dayIds = WEEKDAYS.map((day) => day.id).sort((a, b) => a - b);
assert.deepEqual(dayIds, [0, 1, 2, 3, 4, 5, 6], 'дни должны покрывать 0…6, как getDay()');

/* --- 5. Подписи напоминаний --- */

assert.equal(reminderLabel(15), 'за 15 минут');
assert.equal(reminderLabel(60), 'за час');
assert.equal(reminderLabel(180), 'за 3 часа');
assert.equal(reminderLabel(1440), 'за сутки');
for (const minutes of REMINDER_LEADS) {
  assert.ok(reminderLabel(minutes).length > 0, `подпись для ${minutes} не должна быть пустой`);
}

console.log('✓ поля профиля: телефон, справочники, подписи напоминаний');
