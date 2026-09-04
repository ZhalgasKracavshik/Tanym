/** Проверка заданий учителя: npm run test:taskvalidation */

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
register(new URL('./ts-resolver.mjs', import.meta.url));
const load = (p) => import(pathToFileURL(join(root, p)).href);

const { validateTask, draftToTask } = await load('src/lib/taskValidation.ts');
const { checkAnswer } = await load('src/lib/grading.ts');

const problems = [];
const check = (ok, message) => { if (!ok) problems.push(message); };
const codes = (draft) => validateTask(draft).map((p) => p.code);

/** Заведомо исправное задание с вариантами — от него отталкиваются остальные. */
const goodChoice = {
  kind: 'single',
  prompt: 'Чему равен корень уравнения 2x + 6 = 14?',
  options: ['2', '4', '6', '8'],
  correctIndex: 1,
  correctValue: '',
  hint: 'Перенеси 6 вправо.',
  explanation: 'Переносим 6 вправо: 2x = 8. Делим обе части на 2, получаем x = 4.',
  skillId: 'math.linear-equations',
  difficulty: 2,
};

/** Заведомо исправное числовое задание. */
const goodNumeric = {
  ...goodChoice,
  kind: 'numeric',
  options: ['', '', '', ''],
  correctValue: '4',
};

check(codes(goodChoice).length === 0, `исправное задание с вариантами забраковано: ${codes(goodChoice)}`);
check(codes(goodNumeric).length === 0, `исправное числовое задание забраковано: ${codes(goodNumeric)}`);

/* --- Ради чего модуль написан: эталон, не проходящий собственную проверку --- */
const writtenAsEquation = { ...goodNumeric, correctValue: 'x = 4' };
check(
  codes(writtenAsEquation).includes('value-not-number'),
  'ответ «x = 4» в числовом задании должен быть отклонён: ученик введёт 4 и получит «неверно»',
);

const withUnits = { ...goodNumeric, correctValue: '4 см' };
check(codes(withUnits).includes('value-not-number'), 'ответ с единицами измерения должен быть отклонён');

/* Запятая как разделитель — наоборот, допустима: её нормализует проверка. */
const comma = { ...goodNumeric, correctValue: '0,5' };
check(codes(comma).length === 0, `«0,5» — допустимый ответ, забраковано: ${codes(comma)}`);
check(
  checkAnswer(draftToTask(comma, 'topic', 0), '0.5'),
  'ученик, ответивший 0.5, должен получить «верно» на эталон «0,5»',
);

/* --- Варианты ответа --- */
check(codes({ ...goodChoice, correctIndex: 9 }).includes('correct-index-out-of-range'),
      'указание на несуществующий вариант должно быть отклонено');
check(codes({ ...goodChoice, options: ['4', '', '', ''] }).includes('options-few'),
      'одного варианта мало');
check(codes({ ...goodChoice, options: ['4', '4', '', ''] }).includes('options-duplicate'),
      'два одинаковых варианта делают задание нечестным');

/* --- Обязательные поля --- */
check(codes({ ...goodChoice, prompt: '' }).includes('prompt-empty'), 'пустое условие должно быть отклонено');
check(codes({ ...goodChoice, prompt: 'Что?' }).includes('prompt-short'), 'слишком короткое условие');
check(codes({ ...goodChoice, explanation: '' }).includes('explanation-empty'), 'задание без разбора');
check(codes({ ...goodChoice, skillId: '' }).includes('skill-missing'), 'задание без навыка');

/* --- Собранное задание должно быть решаемым по-настоящему --- */
const task = draftToTask(goodChoice, 'topic.custom', 0);
check(task.id === 'topic.custom.t1', `неверный идентификатор задания: ${task.id}`);
check(checkAnswer(task, '1'), 'верный вариант должен засчитываться');
check(!checkAnswer(task, '0'), 'неверный вариант не должен засчитываться');

console.log(
  problems.length
    ? `❌ ПРОБЛЕМЫ (${problems.length}):\n` + problems.map((p) => '  · ' + p).join('\n')
    : '✓ Проверка заданий учителя работает',
);
if (problems.length) process.exit(1);
