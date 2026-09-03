/**
 * Сквозной прогон ключевого сценария: npm run test:scenario
 *
 * Диагностика → план → тема → задание → проверка ответа, на настоящем
 * контенте всех предметов.
 *
 * Зачем отдельно от остальных тестов. Те проверяют функции поштучно, а
 * ломается обычно стык: тема без заданий подходящей сложности, предмет
 * без диагностики, задание без эталонного ответа. Поштучные тесты такой
 * тупик пропускают — каждая функция по отдельности исправна, а пройти
 * путь ученик не может.
 *
 * Браузер здесь не нужен: вся цепочка — чистые функции.
 */

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Импорты внутри проекта идут без расширений — Node так не умеет.
register(new URL('./ts-resolver.mjs', import.meta.url));
const load = (p) => import(pathToFileURL(join(root, p)).href);

const P = await load('src/lib/personalization.ts');
const G = await load('src/lib/grading.ts');
const D = await load('src/data/index.ts');


/*
  Что вообще считается «правильным вводом» — зависит от вида задания.
  Для варианта ответа checkAnswer ждёт ИНДЕКС строкой, а не текст варианта;
  для числового — саму строку значения. Подставлять текст варианта в
  проверку бессмысленно: она сравнит «x = 5» с числом 2 и, разумеется,
  не сойдётся. Это не дефект проверки, а два разных представления.
*/
const rightInput = (task) =>
  task.kind === 'single'
    ? (task.correctIndex === undefined ? null : String(task.correctIndex))
    : (task.correctValue ?? null);

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const subjects = D.SUBJECTS;
console.log(`Предметов: ${subjects.length} — ${subjects.map((s) => s.id).join(', ')}\n`);

for (const subject of subjects) {
  console.log(`══ ${subject.title} ══`);

  /* --- Шаг 1. Диагностика --- */
  const diag = subject.diagnostic;
  check(diag.length > 0, `${subject.id}: диагностика пуста`);

  // Ученик отвечает верно только на самые лёгкие задания — так проверяем,
  // что движок увидит настоящие пробелы, а не выдаст ровный результат.
  const answers = diag.map((task) => ({
    task,
    answer: '',
    correct: task.difficulty <= 2,
  }));
  const result = P.scoreDiagnostic(subject, answers);

  const skillsCovered = new Set(diag.map((t) => t.skillId));
  console.log(`  1. Диагностика: ${diag.length} заданий на ${skillsCovered.size} навыков` +
              ` → уровень «${result.level}», старт сложности ${result.startingDifficulty}`);
  check(result.score >= 0 && result.score <= 1, `${subject.id}: score вне 0..1 (${result.score})`);
  check([1, 2, 3, 4, 5].includes(result.startingDifficulty),
        `${subject.id}: недопустимая стартовая сложность ${result.startingDifficulty}`);

  /* --- Шаг 2. Состояние ученика после диагностики --- */
  const state = {
    version: 1,
    language: 'ru',
    profile: { name: 'Тест', grade: 10, subjectIds: [subject.id], goal: 'ent', targetDate: undefined },
    diagnostics: { [subject.id]: result },
    attempts: [],
    topicProgress: {},
    difficulty: { [subject.id]: result.startingDifficulty },
    points: 0,
    streak: { current: 0, longest: 0, lastActiveDate: null },
    seenAchievements: [],
  };

  /* --- Шаг 3. План: ранжирование тем --- */
  const ranked = P.rankTopics(subject, state);
  check(ranked.length > 0, `${subject.id}: план пуст — учить нечего`);
  const top = ranked[0];
  console.log(`  2. План: ${ranked.length} тем, первой идёт «${top.topic.title}»`);

  // План обязан ставить слабое вперёд: владение первой темой не должно быть
  // выше, чем последней. Иначе ученику предлагают то, что он уже умеет.
  const last = ranked[ranked.length - 1];
  const firstM = P.topicMastery(top.topic, P.computeSkillMastery(state));
  const lastM = P.topicMastery(last.topic, P.computeSkillMastery(state));
  console.log(`     владение первой темой ${firstM.toFixed(2)}, последней ${lastM.toFixed(2)}`);
  check(firstM <= lastM,
        `${subject.id}: план ставит вперёд тему, которой ученик владеет лучше (${firstM} > ${lastM})`);

  /* --- Шаг 4. Тема → задания --- */
  const difficulty = P.nextDifficulty(subject.id, state);
  const tasks = P.selectTasks(top.topic, difficulty, state, 5);
  check(tasks.length > 0, `${subject.id}/${top.topic.id}: тема без заданий — тупик сценария`);
  console.log(`  3. Тема даёт ${tasks.length} заданий на сложности ${difficulty}`);

  /* --- Шаг 5. Проверка ответа сервером --- */
  let graded = 0;
  let selfCheckFailed = 0;
  for (const task of tasks) {
    const right = rightInput(task);
    // Эталон обязан проходить собственную проверку. Если нет — ученик
    // отвечает верно, а система говорит «неверно».
    if (right !== null) {
      graded += 1;
      if (!G.checkAnswer(task, right)) {
        selfCheckFailed += 1;
        problems.push(`${task.id}: эталон «${G.correctAnswerText(task)}» не проходит проверку`);
      }
    }
  }
  console.log(`  4. Проверка: ${graded} заданий с эталоном, не сошлось — ${selfCheckFailed}\n`);
}

/* --- Отдельно: эталон каждого задания во всём реестре --- */
let total = 0, failed = 0;
for (const subject of subjects) {
  for (const topic of subject.topics) {
    for (const task of topic.tasks) {
      const right = rightInput(task);
      if (right !== null) {
        total += 1;
        if (!G.checkAnswer(task, right)) {
          failed += 1;
          if (failed <= 8) problems.push(`${task.id}: эталон «${G.correctAnswerText(task)}» не проходит проверку`);
        }
      } else {
        problems.push(`${task.id}: у задания нет ни варианта, ни эталонного значения — проверить нечем`);
      }
    }
  }
}
console.log(`Реестр целиком: ${total} заданий с эталонным ответом, не проходят собственную проверку — ${failed}`);

console.log(problems.length ? `\n❌ ПРОБЛЕМЫ (${problems.length}):\n` + problems.map((p) => '  · ' + p).join('\n')
                            : '\n✓ Сценарий проходит целиком, тупиков нет');

if (problems.length) process.exit(1);
