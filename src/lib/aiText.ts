/**
 * Разбор ответа модели в структуру блоков.
 *
 * Зачем вообще разбирать. Модель отвечает размеченным текстом: заголовки,
 * списки, формулы в обратных кавычках, шаги решения. Раньше всё это
 * выводилось одним <p> с whitespace-pre-line — то есть звёздочки, решётки
 * и дефисы показывались как есть, сплошной стеной. Отсюда ощущение
 * «документации»: у текста не было ни ритма, ни уровней.
 *
 * Почему свой разбор, а не библиотека Markdown. Нужна ровно горстка
 * конструкций, зато с гарантией: результат — дерево React-элементов, а не
 * строка HTML. Ответ модели — это недоверенные данные (в них попадает и
 * то, что написал сам ученик), и любой путь через dangerouslySetInnerHTML
 * означал бы возможность выполнить чужой скрипт на странице. Здесь такой
 * возможности нет по построению: строки попадают в текстовые узлы.
 */

export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'italic'; text: string }
  | { kind: 'code'; text: string };

export type Block =
  | { kind: 'heading'; level: 2 | 3; spans: Inline[] }
  | { kind: 'paragraph'; spans: Inline[] }
  | { kind: 'bullets'; items: Inline[][] }
  | { kind: 'numbers'; items: Inline[][] }
  | { kind: 'quote'; spans: Inline[] }
  | { kind: 'code'; text: string; lang: string | null };

/**
 * Инлайновая разметка внутри строки.
 *
 * Разбор идёт одним проходом по регулярному выражению, а не вложенными
 * заменами: вложенные замены на `**a `b` c**` дают перекрывающиеся куски и
 * ломают текст. Порядок в чередовании важен — код первым, иначе звёздочка
 * внутри обратных кавычек будет принята за жирный шрифт.
 */
const INLINE_RE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(_[^_\n]+_)/g;

export function parseInline(line: string): Inline[] {
  const spans: Inline[] = [];
  let last = 0;

  for (const match of line.matchAll(INLINE_RE)) {
    const start = match.index ?? 0;
    if (start > last) spans.push({ kind: 'text', text: line.slice(last, start) });

    const token = match[0];
    if (token.startsWith('`')) {
      spans.push({ kind: 'code', text: token.slice(1, -1) });
    } else if (token.startsWith('**')) {
      spans.push({ kind: 'bold', text: token.slice(2, -2) });
    } else {
      spans.push({ kind: 'italic', text: token.slice(1, -1) });
    }
    last = start + token.length;
  }

  if (last < line.length) spans.push({ kind: 'text', text: line.slice(last) });
  // Пустая строка тоже должна дать хотя бы один узел, иначе абзац исчезнет.
  return spans.length > 0 ? spans : [{ kind: 'text', text: line }];
}

const BULLET_RE = /^\s*[-*•]\s+(.*)$/;
const NUMBER_RE = /^\s*\d+[.)]\s+(.*)$/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const QUOTE_RE = /^\s*>\s?(.*)$/;

export function parseAiText(input: string): Block[] {
  const blocks: Block[] = [];
  const lines = (input ?? '').replace(/\r\n/g, '\n').split('\n');

  let paragraph: string[] = [];

  function flushParagraph() {
    if (paragraph.length === 0) return;
    blocks.push({ kind: 'paragraph', spans: parseInline(paragraph.join(' ').trim()) });
    paragraph = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Блок кода: забираем всё до закрывающей ограды, ничего внутри не разбирая.
    if (/^\s*```/.test(line)) {
      flushParagraph();
      const lang = line.replace(/^\s*```/, '').trim() || null;
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      blocks.push({ kind: 'code', text: body.join('\n'), lang });
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      flushParagraph();
      // Уровней всего два: у ответа в чате нет глубины настоящего документа,
      // а шесть размеров заголовка сделали бы из него оглавление.
      blocks.push({
        kind: 'heading',
        level: heading[1].length <= 2 ? 2 : 3,
        spans: parseInline(heading[2].trim()),
      });
      continue;
    }

    const quote = QUOTE_RE.exec(line);
    if (quote) {
      flushParagraph();
      blocks.push({ kind: 'quote', spans: parseInline(quote[1].trim()) });
      continue;
    }

    const bullet = BULLET_RE.exec(line);
    if (bullet) {
      flushParagraph();
      const items: Inline[][] = [parseInline(bullet[1].trim())];
      while (i + 1 < lines.length) {
        const next = BULLET_RE.exec(lines[i + 1]);
        if (!next) break;
        items.push(parseInline(next[1].trim()));
        i++;
      }
      blocks.push({ kind: 'bullets', items });
      continue;
    }

    const numbered = NUMBER_RE.exec(line);
    if (numbered) {
      flushParagraph();
      const items: Inline[][] = [parseInline(numbered[1].trim())];
      while (i + 1 < lines.length) {
        const next = NUMBER_RE.exec(lines[i + 1]);
        if (!next) break;
        items.push(parseInline(next[1].trim()));
        i++;
      }
      blocks.push({ kind: 'numbers', items });
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  return blocks;
}
