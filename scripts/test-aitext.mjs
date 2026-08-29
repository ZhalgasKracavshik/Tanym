/** Проверка разбора ответа модели: npm run test:aitext */

import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (path) => import(pathToFileURL(join(root, path)).href);

const { parseAiText, parseInline } = await load('src/lib/aiText.ts');

const problems = [];
const check = (condition, message) => {
  if (!condition) problems.push(message);
};

/* Заголовки: шесть уровней Markdown сводятся к двум. */
{
  const blocks = parseAiText('# Первый\n## Второй\n### Третий');
  check(blocks.length === 3, 'три заголовка должны дать три блока');
  check(blocks[0].kind === 'heading' && blocks[0].level === 2, '# → уровень 2');
  check(blocks[1].kind === 'heading' && blocks[1].level === 2, '## → уровень 2');
  check(blocks[2].kind === 'heading' && blocks[2].level === 3, '### → уровень 3');
}

/* Маркированный список собирается в один блок, а не в строку на абзац. */
{
  const blocks = parseAiText('Вот шаги:\n- первый\n- второй\n- третий');
  check(blocks.length === 2, 'абзац и список = два блока, получено ' + blocks.length);
  check(blocks[1].kind === 'bullets', 'второй блок — список');
  check(blocks[1].items.length === 3, 'в списке три пункта');
}

/* Нумерованный список: и «1.», и «1)». */
{
  const dot = parseAiText('1. раз\n2. два');
  const paren = parseAiText('1) раз\n2) два');
  check(dot[0].kind === 'numbers' && dot[0].items.length === 2, 'нумерация через точку');
  check(paren[0].kind === 'numbers' && paren[0].items.length === 2, 'нумерация через скобку');
}

/* Блок кода забирается целиком и внутри ничего не разбирается. */
{
  const blocks = parseAiText('До\n```py\nx = 1  # **не жирный**\n```\nПосле');
  const code = blocks.find((b) => b.kind === 'code');
  check(code !== undefined, 'блок кода распознан');
  check(code.lang === 'py', 'язык блока сохранён');
  check(code.text.includes('**не жирный**'), 'внутри кода разметка не трогается');
  check(blocks.filter((b) => b.kind === 'paragraph').length === 2, 'текст до и после остался абзацами');
}

/* Инлайн: код важнее жирного, иначе звёздочка внутри кода съедает разметку. */
{
  const spans = parseInline('вот `a * b` и **жирный** текст');
  const kinds = spans.map((s) => s.kind);
  check(kinds.includes('code'), 'обратные кавычки дают код');
  check(kinds.includes('bold'), 'двойные звёздочки дают жирный');
  const code = spans.find((s) => s.kind === 'code');
  check(code.text === 'a * b', 'звёздочка внутри кода осталась текстом, получено: ' + code.text);
}

/* Абзац склеивается из соседних строк, пустая строка их разделяет. */
{
  const blocks = parseAiText('строка один\nстрока два\n\nновый абзац');
  check(blocks.length === 2, 'две группы строк = два абзаца, получено ' + blocks.length);
  check(blocks[0].spans.map((s) => s.text).join('').includes('строка один строка два'), 'строки склеены пробелом');
}

/* Пустой и мусорный ввод не должен ронять разбор. */
{
  check(Array.isArray(parseAiText('')), 'пустая строка даёт массив');
  check(parseAiText('').length === 0, 'пустая строка даёт пустой список блоков');
  check(Array.isArray(parseAiText(null)), 'null не роняет разбор');
  const unclosed = parseAiText('```\nбез закрывающей ограды');
  check(unclosed[0].kind === 'code', 'незакрытый блок кода не теряет текст');
}

/* Ничего из ответа не должно потеряться: текст без разметки остаётся как есть. */
{
  const blocks = parseAiText('Обычный ответ без разметки.');
  check(blocks.length === 1 && blocks[0].kind === 'paragraph', 'простой текст — один абзац');
  check(blocks[0].spans[0].text === 'Обычный ответ без разметки.', 'текст не изменён');
}

if (problems.length > 0) {
  console.error('✗ Разбор ответа модели работает неверно:');
  for (const problem of problems) console.error('  - ' + problem);
  process.exit(1);
}

console.log('✓ разбор ответа модели: заголовки, списки, код, инлайн и пустой ввод');
