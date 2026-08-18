/**
 * Проверка целостности учебного контента.
 *
 * Запуск:  npm run validate
 *
 * Это структурная проверка, а не смысловая: скрипт не знает, верно ли решена
 * задача, зато он гарантированно ловит то, что человек пропускает при вычитке
 * тысячи строк — битые ссылки на id, индекс правильного ответа за границей
 * массива вариантов, дубликаты, пропущенные поля.
 *
 * Node запускает .ts напрямую: в файлах контента только `import type`,
 * а такие импорты стираются при разборе и ничего не требуют во время выполнения.
 */

import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const FILES = [
  ['math', 'math'],
  ['physics', 'physics'],
  ['kazakh-history', 'kazakhHistory'],
];

const problems = [];
const stats = { subjects: 0, skills: 0, topics: 0, tasks: 0, diagnostics: 0 };

function complain(where, message) {
  problems.push(`${where}: ${message}`);
}

/** Проверяет одно задание. Общая для тем и диагностики. */
function checkTask(task, where, skillIds, topicIds, seenTaskIds) {
  if (!task.id) return complain(where, 'нет id');
  if (seenTaskIds.has(task.id)) complain(where, `дубликат id задания «${task.id}»`);
  seenTaskIds.add(task.id);

  const at = `${where} → ${task.id}`;

  if (!skillIds.has(task.skillId)) complain(at, `skillId «${task.skillId}» не существует`);
  if (!topicIds.has(task.topicId)) complain(at, `topicId «${task.topicId}» не существует`);

  if (!Number.isInteger(task.difficulty) || task.difficulty < 1 || task.difficulty > 5) {
    complain(at, `difficulty вне диапазона 1..5: ${task.difficulty}`);
  }

  for (const field of ['prompt', 'hint', 'explanation']) {
    if (typeof task[field] !== 'string' || task[field].trim().length < 5) {
      complain(at, `поле ${field} пустое или слишком короткое`);
    }
  }

  if (task.kind === 'single') {
    if (!Array.isArray(task.options) || task.options.length < 2) {
      complain(at, 'у задания с выбором нет вариантов ответа');
    } else {
      if (!Number.isInteger(task.correctIndex)) {
        complain(at, 'correctIndex не задан');
      } else if (task.correctIndex < 0 || task.correctIndex >= task.options.length) {
        complain(at, `correctIndex ${task.correctIndex} выходит за границы массива из ${task.options.length} вариантов`);
      }
      const unique = new Set(task.options.map((o) => String(o).trim()));
      if (unique.size !== task.options.length) complain(at, 'среди вариантов ответа есть одинаковые');
    }
    if (task.correctValue !== undefined) complain(at, 'у задания с выбором лишнее поле correctValue');
  } else if (task.kind === 'numeric') {
    if (typeof task.correctValue !== 'string' || task.correctValue.trim() === '') {
      complain(at, 'у числового задания нет correctValue');
    } else if (!Number.isFinite(Number(task.correctValue.replace(',', '.')))) {
      complain(at, `correctValue «${task.correctValue}» не является числом`);
    }
    if (task.options !== undefined) complain(at, 'у числового задания лишнее поле options');
  } else {
    complain(at, `неизвестный kind «${task.kind}»`);
  }

  // Разметка, которая сломает вывод: интерфейс показывает обычный текст.
  const text = `${task.prompt} ${task.explanation} ${task.hint}`;
  if (/\$|\\cdot|\\frac|\\sqrt|\\left|\\right/.test(text)) {
    complain(at, 'найдена LaTeX-разметка — интерфейс выводит простой текст');
  }
}

for (const [file, exportName] of FILES) {
  const url = pathToFileURL(join(root, 'src', 'data', 'subjects', `${file}.ts`)).href;
  let subject;
  try {
    const module = await import(url);
    subject = module[exportName];
  } catch (error) {
    complain(file, `файл не загрузился — ${error.message}`);
    continue;
  }

  if (!subject) {
    complain(file, `нет экспорта «${exportName}»`);
    continue;
  }

  stats.subjects += 1;
  const where = subject.title ?? file;

  const skillIds = new Set(subject.skills.map((s) => s.id));
  const topicIds = new Set(subject.topics.map((t) => t.id));
  stats.skills += skillIds.size;
  stats.topics += topicIds.size;

  if (skillIds.size !== subject.skills.length) complain(where, 'есть навыки с одинаковыми id');
  if (topicIds.size !== subject.topics.length) complain(where, 'есть темы с одинаковыми id');

  for (const skill of subject.skills) {
    if (skill.subjectId !== subject.id) complain(`${where} → ${skill.id}`, `subjectId «${skill.subjectId}» не совпадает с предметом`);
    if (!skill.id.startsWith(`${subject.id}.`)) complain(`${where} → ${skill.id}`, 'id навыка не начинается с id предмета');
  }

  const seenTaskIds = new Set();

  for (const topic of subject.topics) {
    const at = `${where} → ${topic.id}`;
    if (topic.subjectId !== subject.id) complain(at, 'subjectId темы не совпадает с предметом');

    for (const skillId of topic.skills) {
      if (!skillIds.has(skillId)) complain(at, `тема ссылается на несуществующий навык «${skillId}»`);
    }
    for (const prerequisite of topic.prerequisites) {
      if (!topicIds.has(prerequisite)) complain(at, `предпосылка «${prerequisite}» не существует`);
      if (prerequisite === topic.id) complain(at, 'тема указана предпосылкой самой себя');
    }

    const material = topic.material ?? {};
    if (!material.intro) complain(at, 'нет material.intro');
    if (!Array.isArray(material.keyPoints) || material.keyPoints.length === 0) {
      complain(at, 'нет material.keyPoints');
    }

    if (!Array.isArray(topic.tasks) || topic.tasks.length === 0) {
      complain(at, 'в теме нет заданий');
    } else {
      stats.tasks += topic.tasks.length;
      for (const task of topic.tasks) checkTask(task, at, skillIds, topicIds, seenTaskIds);
    }
  }

  if (!Array.isArray(subject.diagnostic) || subject.diagnostic.length === 0) {
    complain(where, 'нет диагностики');
  } else {
    stats.diagnostics += subject.diagnostic.length;
    for (const task of subject.diagnostic) {
      checkTask(task, `${where} → диагностика`, skillIds, topicIds, seenTaskIds);
    }
    const covered = new Set(subject.diagnostic.map((t) => t.skillId));
    if (covered.size < 4) {
      complain(where, `диагностика покрывает только ${covered.size} навыков — слишком мало для оценки уровня`);
    }
  }
}

console.log(
  `Проверено: ${stats.subjects} предмета, ${stats.skills} навыков, ${stats.topics} тем, ` +
    `${stats.tasks} заданий в темах, ${stats.diagnostics} диагностических.`,
);

if (problems.length === 0) {
  console.log('\n✓ Структурных дефектов не найдено.');
  process.exit(0);
}

console.error(`\n✗ Найдено дефектов: ${problems.length}\n`);
for (const problem of problems) console.error(`  • ${problem}`);
process.exit(1);
