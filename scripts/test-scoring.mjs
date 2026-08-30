/** Проверка правила начисления баллов: npm run test:scoring */

import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (path) => import(pathToFileURL(join(root, path)).href);

const { awardsPoints, pointsForAttempt } = await load('src/lib/personalization.ts');

const problems = [];
const check = (condition, message) => {
  if (!condition) problems.push(message);
};

const attempt = (taskId, correct) => ({
  taskId,
  topicId: 't',
  skillId: 's',
  subjectId: 'math',
  difficulty: 3,
  correct,
  answer: '',
  at: new Date(0).toISOString(),
});

/* Первое решение задания — баллы есть. */
check(awardsPoints([], 'task-1'), 'за первое решение баллы должны начисляться');

/* Повторное верное решение того же задания — баллов больше нет.
   Это и есть защита от накрутки: «Пройти ещё раз» с уже известными
   ответами не должен поднимать место в рейтинге. */
check(
  !awardsPoints([attempt('task-1', true)], 'task-1'),
  'повторное верное решение не должно приносить баллы',
);

/* Неудачная попытка не «сжигает» задание: решив его позже верно,
   ученик всё равно получит балл. */
check(
  awardsPoints([attempt('task-1', false)], 'task-1'),
  'после неверной попытки баллы за верное решение сохраняются',
);

/* Другое задание не затрагивается решённым соседом. */
check(
  awardsPoints([attempt('task-1', true)], 'task-2'),
  'решённое задание не должно блокировать баллы за другое',
);

/* Несколько неверных попыток подряд — задание всё ещё «оплачиваемое». */
check(
  awardsPoints([attempt('task-3', false), attempt('task-3', false)], 'task-3'),
  'серия неверных попыток не должна лишать баллов за будущее верное решение',
);

/* Порядок в истории значения не имеет. */
check(
  !awardsPoints([attempt('task-4', false), attempt('task-4', true), attempt('task-4', false)], 'task-4'),
  'верное решение где-то в истории закрывает начисление независимо от порядка',
);

/* Сама шкала: неверный ответ не приносит очков, верный — приносит. */
check(pointsForAttempt(false, 3) === 0, 'неверный ответ не приносит баллов');
check(pointsForAttempt(true, 3) === 30, 'верный ответ на сложности 3 даёт 30 баллов');
check(pointsForAttempt(true, 5) > pointsForAttempt(true, 1), 'сложное задание ценится выше лёгкого');

if (problems.length > 0) {
  console.error('✗ Правило начисления баллов нарушено:');
  for (const problem of problems) console.error('  - ' + problem);
  process.exit(1);
}

console.log('✓ баллы: только за первое верное решение задания');
