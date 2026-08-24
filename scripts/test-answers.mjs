/** Проверка распознавания ответов в архиве Запуск - npm run test:answers Каждый случай здесь взят из реального поведения, а не придуман: главный — тоже 20). 
* Наивная проверка засчитывала его как решение и выдавала ученику разбор ни за что. */

import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (path) => import(pathToFileURL(join(root, path)).href);

const { matchesArchiveAnswer } = await load('src/lib/archive-answer.ts');
const { ARCHIVE } = await load('src/data/archive.ts');

const task = (id) => {
  for (const material of ARCHIVE) {
    const found = material.tasks.find((item) => item.id === id);
    if (found) return found;
  }
  throw new Error(`Задание ${id} не найдено`);
};

/** [задание, сообщение ученика, ожидаем ли "решено", пояснение] */
const CASES = [
  // Ответ 20 м, но число 20 есть и в условии — главный источник ложных срабатываний.
  ['ent-physics-2024.t1', 'Ну там сказано что скорость 20 м/с, а g равно 10', false, 'пересказ условия'],
  ['ent-physics-2024.t1', 'Получается высота 20 метров', true, 'настоящий ответ'],
  ['ent-physics-2024.t1', 'Ответ 20', true, 'короткий ответ с маркером'],
  ['ent-physics-2024.t1', 'h = 20 м', true, 'ответ через знак равенства'],
  ['ent-physics-2024.t1', 'Не знаю, там что-то про 10 и 20', false, 'перечисление данных без вывода'],

  // Ответ 48 в условии не встречается значит маркер не нужен.
  ['ent-math-2024.t2', '48', true, 'голое число, которого нет в условии'],
  ['ent-math-2024.t2', 'Наверное 50, среднее из 60 и 40', false, 'типичная ошибка'],
  ['ent-math-2024.t2', 'Весь путь 240 км', false, 'промежуточная величина'],

  // Текстовые ответы IELTS: варианты перечислены прямо в условии.
  ['ielts-reading.t2', 'Not Given', true, 'верный вариант'],
  ['ielts-reading.t2', 'True, False или Not Given?', false, 'переписал вопрос целиком'],
  ['ielts-reading.t2', 'Думаю это False', false, 'неверный вариант'],
  ['ielts-reading.t1', 'False, текст говорит обратное', true, 'верный вариант с обоснованием'],

  ['olympiad-math-school.t3', 'у меня 1 вопрос: что делать?', false, 'цифра в бытовой фразе'],
  ['olympiad-math-school.t3', 'вижу цикл: 7, 9, 3, 1', false, 'перечисление наблюдений, не вывод'],
  ['olympiad-math-school.t3', '7^1 = 7, дальше не знаю', false, 'показатель степени, а не ответ'],
  ['olympiad-math-school.t3', 'значит последняя цифра 1', true, 'настоящий вывод'],
  ['olympiad-math-school.t3', '1', true, 'голая цифра как ответ'],
  ['sat-math-nc.t2', 'не знаю, 5 минут думаю', false, 'число в бытовой фразе'],
  ['sat-math-nc.t2', 'получилось 5y = 10', false, 'коэффициент при переменной'],
  ['sat-math-nc.t2', 'итого x + y = 5', true, 'настоящий вывод'],

  // Дробные и округлённые значения.
  ['ent-math-2024.t1', 'итого 11520 тенге', true, 'ответ с единицами'],
  ['ent-math-2024.t1', '12000', false, 'исходная цена из условия'],
  ['ent-math-2024.t1', '14400', false, 'цена после наценки, но не итог'],
];

let failed = 0;

for (const [taskId, message, expected, note] of CASES) {
  const actual = matchesArchiveAnswer(task(taskId), message);
  if (actual === expected) continue;

  failed += 1;
  console.error(
    `✗ ${taskId} — ${note}\n  сообщение: «${message}»\n  ожидали: ${expected}, получили: ${actual}\n`,
  );
}

console.log(`Проверено случаев: ${CASES.length}`);

if (failed === 0) {
  console.log('\n✓ Распознавание ответов работает верно.');
  process.exit(0);
}

console.error(`\n✗ Провалено: ${failed}`);
process.exit(1);
