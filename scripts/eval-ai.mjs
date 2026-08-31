/**
 * Замер качества ответов наставника на живой модели.
 *
 * Запуск: npm run eval:ai [число заданий]
 *
 * Зачем это нужно. Про AI легко сказать «работает хорошо», и проверить
 * это утверждение никак нельзя. Здесь оно превращается в числа.
 *
 * Что именно меряется. Мы сами задаём модели набор требований в системном
 * промпте: отвечать на языке ученика, не использовать LaTeX и markdown,
 * не ставить эмодзи и длинное тире, уложиться в лимит слов, опираться на
 * эталонное решение. Все эти требования проверяются механически, поэтому
 * «соблюдение инструкции» перестаёт быть впечатлением и становится долей.
 *
 * Честные оговорки, без которых числа врут:
 *
 * 1. Опора на эталон проверяется тем, упомянут ли в разборе правильный
 *    ответ. Это признак, а не доказательство: разбор может содержать
 *    верное число и всё равно объяснять плохо. Оценивать педагогическое
 *    качество автоматически мы не беремся и не делаем вид, что беремся.
 * 2. Выборка небольшая, и модель недетерминирована: два прогона дадут
 *    близкие, но не одинаковые числа.
 * 3. Прогон расходует квоту ключа. Поэтому объём задаётся параметром, а
 *    по умолчанию он маленький.
 *
 * Промпты берутся из рабочего кода, а не пересобираются здесь: иначе
 * проверялось бы не то, что уходит модели в продукте.
 */

import { register } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Ключи лежат в .env.local: Next читает его сам, а обычный Node нет. */
for (const line of readFileSync(join(root, '.env.local'), 'utf8').split('\n')) {
  const match = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
}

register(new URL('./ts-resolver.mjs', import.meta.url));

const load = (path) => import(pathToFileURL(join(root, path)).href);

const { generateText, isAiConfigured } = await load('src/lib/ai/gemini.ts');
const { feedbackSystem, feedbackPrompt } = await load('src/lib/ai/prompts.ts');
const { correctAnswerText } = await load('src/lib/grading.ts');
const { math } = await load('src/data/subjects/math.ts');
const { physics } = await load('src/data/subjects/physics.ts');
const { kazakhHistory } = await load('src/data/subjects/kazakh-history.ts');

if (!isAiConfigured()) {
  console.error('✗ GEMINI_API_KEY не задан — замерять нечего.');
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/*  Проверки                                                           */
/* ------------------------------------------------------------------ */

const LATEX = /\$|\\cdot|\\frac|\\sqrt|\\left|\\right|\\begin/;
const MARKDOWN_HEADING = /^\s*#{1,6}\s/m;
const MARKDOWN_BULLET = /^\s*\*\s/m;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const CYRILLIC = /[Ѐ-ӿ]/g;
const LATIN = /[A-Za-z]/g;

const words = (text) => text.trim().split(/\s+/).filter(Boolean).length;

/** Доля букв нужного алфавита среди всех букв ответа. */
function alphabetShare(text, alphabet) {
  const cyrillic = (text.match(CYRILLIC) ?? []).length;
  const latin = (text.match(LATIN) ?? []).length;
  const total = cyrillic + latin;
  if (total === 0) return 0;
  return alphabet === 'cyrillic' ? cyrillic / total : latin / total;
}

/*
  Ответ задания в свободном тексте.

  Для числового задания ищем само число, для задания с выбором — текст
  верного варианта. Сравнение идёт по нормализованной строке: разделитель
  дробной части в ответе модели может отличаться от того, что записан в
  контенте, и это не ошибка.
*/
function mentionsAnswer(text, task) {
  const normalize = (value) => value.toLowerCase().replace(/\s+/g, ' ').replace(',', '.').trim();
  const haystack = normalize(text);
  if (task.kind === 'numeric') return haystack.includes(normalize(task.correctValue));
  const option = task.options?.[task.correctIndex ?? 0] ?? '';
  const core = normalize(option);
  if (haystack.includes(core)) return true;
  /* Вариант вида «x = 5» модель часто пишет как «x равен 5»: проверяем по числу. */
  const number = /-?\d+(?:[.,]\d+)?/.exec(option);
  return number ? haystack.includes(normalize(number[0])) : false;
}

/* ------------------------------------------------------------------ */
/*  Выборка                                                            */
/* ------------------------------------------------------------------ */

const SUBJECTS = [math, physics, kazakhHistory];
const requested = Number(process.argv[2]);
const SAMPLE_SIZE = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 6;

/*
  Задания берутся вперемешку по предметам и по возрастанию сложности, а
  не подряд из одной темы: иначе замер описывал бы одну тему, а не курс.
  Порядок фиксированный, без случайности, чтобы прогоны можно было
  сравнивать между собой.
*/
function buildSample() {
  const pool = [];
  const perSubject = SUBJECTS.map((subject) =>
    subject.topics.flatMap((topic) => topic.tasks.map((task) => ({ subject, topic, task }))),
  );
  let index = 0;
  while (pool.length < SAMPLE_SIZE * 4 && perSubject.some((list) => index < list.length)) {
    for (const list of perSubject) if (index < list.length) pool.push(list[index]);
    index += 7;
  }
  return pool.slice(0, SAMPLE_SIZE);
}

/** Заведомо неверный ответ: разбор ошибки — половина работы наставника. */
function wrongAnswer(task) {
  if (task.kind === 'numeric') return String(Number(task.correctValue.replace(',', '.')) + 1);
  const wrongIndex = (task.correctIndex + 1) % task.options.length;
  return String(wrongIndex);
}

/* ------------------------------------------------------------------ */
/*  Прогон                                                             */
/* ------------------------------------------------------------------ */

const sample = buildSample();
const results = [];

console.log(`Замер на живой модели: ${sample.length} заданий, по два обращения на каждое (верный и неверный ответ).`);
console.log(`Модель: ${process.env.GEMINI_MODEL ?? 'по умолчанию из кода'}\n`);

for (const { subject, topic, task } of sample) {
  for (const correct of [true, false]) {
    const answer = correct
      ? task.kind === 'numeric'
        ? task.correctValue
        : String(task.correctIndex)
      : wrongAnswer(task);

    const input = {
      task,
      topic,
      subject,
      answer,
      correct,
      profile: { grade: 9, goal: 'ent' },
      skillMastery: correct ? 0.7 : 0.3,
    };

    const startedAt = Date.now();
    let text = null;
    let failure = null;
    try {
      const result = await generateText({
        system: feedbackSystem('ru'),
        prompt: feedbackPrompt(input),
        temperature: 0.3,
        maxOutputTokens: 2500,
        timeoutMs: 20_000,
      });
      text = result.text;
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }
    const ms = Date.now() - startedAt;

    results.push({ taskId: task.id, subject: subject.shortTitle, correct, text, failure, ms });
    process.stdout.write(failure ? 'x' : '.');
  }
}

console.log('\n');

/* ------------------------------------------------------------------ */
/*  Отчёт                                                              */
/* ------------------------------------------------------------------ */

const answered = results.filter((item) => item.text && item.text.trim() !== '');
const share = (count) => (answered.length === 0 ? 0 : Math.round((count / answered.length) * 100));

const checks = [
  ['ответ получен', results.filter((r) => r.text && r.text.trim()).length, results.length],
  ['без LaTeX и знаков доллара', answered.filter((r) => !LATEX.test(r.text)).length, answered.length],
  ['без markdown-заголовков', answered.filter((r) => !MARKDOWN_HEADING.test(r.text)).length, answered.length],
  ['без списков со звёздочками', answered.filter((r) => !MARKDOWN_BULLET.test(r.text)).length, answered.length],
  ['без длинного тире', answered.filter((r) => !r.text.includes('—')).length, answered.length],
  ['без эмодзи', answered.filter((r) => !EMOJI.test(r.text)).length, answered.length],
  ['на русском языке', answered.filter((r) => alphabetShare(r.text, 'cyrillic') > 0.8).length, answered.length],
  ['в пределах 90 слов', answered.filter((r) => words(r.text) <= 90).length, answered.length],
];

const byTask = new Map(sample.map(({ task }) => [task.id, task]));
const grounded = answered.filter((r) => mentionsAnswer(r.text, byTask.get(r.taskId)));
checks.push(['разбор называет верный ответ', grounded.length, answered.length]);

const latencies = answered.map((r) => r.ms).sort((a, b) => a - b);
const median = latencies.length ? latencies[Math.floor(latencies.length / 2)] : 0;

console.log('МЕТРИКИ КАЧЕСТВА ОТВЕТОВ НАСТАВНИКА');
console.log('='.repeat(52));
for (const [label, passed, total] of checks) {
  const percent = total === 0 ? 0 : Math.round((passed / total) * 100);
  const bar = '#'.repeat(Math.round(percent / 5)).padEnd(20, '.');
  console.log(`${label.padEnd(30)} ${bar} ${String(percent).padStart(3)}%  (${passed} из ${total})`);
}
console.log('='.repeat(52));
console.log(`Задержка: медиана ${median} мс, максимум ${latencies.at(-1) ?? 0} мс`);
console.log(`Длина ответа: медиана ${answered.length ? words(answered[Math.floor(answered.length / 2)].text) : 0} слов`);

const failures = results.filter((r) => r.failure);
if (failures.length > 0) {
  console.log(`\nОтказов модели: ${failures.length}`);
  for (const item of failures.slice(0, 3)) console.log(`  ${item.taskId}: ${item.failure}`);
}

const problems = checks.filter(([, passed, total]) => total > 0 && passed < total);
if (problems.length > 0) {
  console.log('\nГде инструкция соблюдена не полностью:');
  for (const [label, passed, total] of problems) console.log(`  ${label}: ${total - passed} из ${total}`);
  /*
    Непройденные случаи печатаются целиком и с условием задания.

    Без этого доля вроде «89 процентов» бесполезна: непонятно, ошиблась ли
    модель или ошибается сама проверка. Такие случаи нужно разбирать
    глазами, иначе метрика выглядит точнее, чем она есть.
  */
  const failed = answered.filter((r) => {
    const task = byTask.get(r.taskId);
    return (
      LATEX.test(r.text) ||
      MARKDOWN_HEADING.test(r.text) ||
      MARKDOWN_BULLET.test(r.text) ||
      r.text.includes('—') ||
      EMOJI.test(r.text) ||
      words(r.text) > 90 ||
      !mentionsAnswer(r.text, task)
    );
  });
  for (const item of failed) {
    const task = byTask.get(item.taskId);
    console.log('\n  [' + item.taskId + '] ответ ученика ' + (item.correct ? 'верный' : 'неверный'));
    console.log('  условие: ' + task.prompt);
    console.log('  эталонный ответ: ' + correctAnswerText(task));
    console.log('  ответ модели: ' + item.text.slice(0, 400).replace(/\n/g, ' '));
  }
}

console.log(`\nВыборка: ${sample.length} заданий из ${SUBJECTS.length} предметов, ${results.length} обращений к модели.`);
console.log('Оговорка: «называет верный ответ» это признак опоры на эталон, а не оценка педагогического качества.');
