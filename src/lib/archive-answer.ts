/**
 * Распознавание ответа ученика в свободном тексте.
 *
 * Вынесено из archive.ts отдельно, потому что здесь сосредоточена вся хитрость
 * модуля и её нужно было покрыть отдельно от типов.
 *
 * Наивная проверка «встречается ли нужное число в сообщении» не годится.
 * Реальный случай, на котором она сломалась: в задаче про подъём тела ответ
 * равен 20 метрам, но число 20 есть и в условии (начальная скорость 20 м/с).
 * Ученик писал «ну там сказано, что скорость 20 м/с» — и система засчитывала
 * решение, выдавая ему готовый разбор ни за что.
 *
 * Правило: если число ответа встречается и в условии, одного упоминания мало —
 * нужен явный признак, что ученик именно ОТВЕЧАЕТ, а не пересказывает данные.
 */

import { archiveTaskKind } from './archive';
import type { ArchiveTask } from './archive';

/** Слова, которыми ученик обозначает вывод, на трёх языках. */
const ANSWER_MARKERS = [
  'ответ',
  'получ',
  'итог',
  'равн',
  'значит',
  'выходит',
  'будет',
  'вышло',
  'жауап',
  'шығады',
  'болады',
  'answer',
  'equals',
  'result',
  'so it',
  'i get',
  '=',
];

/** Варианты ответа в заданиях IELTS — их легко процитировать из условия. */
const IELTS_OPTIONS = ['not given', 'true', 'false'];

/** Разделители в списке выбранных вариантов: запятая, точка с запятой, перенос строки. */
const SPLIT_CHOICES = /[,;\r\n]/;

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ').replace(/,/g, '.');
}

/** Все числа, встречающиеся в тексте, включая дробные и отрицательные. */
function numbersIn(text: string): number[] {
  return (text.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number).filter(Number.isFinite);
}

/**
 * Есть ли рядом с числом признак того, что это именно вывод ученика.
 *
 * Смотрим только на короткий отрезок текста ПЕРЕД числом, а не на всё
 * сообщение. Разница существенная: во фразе «скорость 20 м/с, а g равно 10»
 * слово-маркер есть, но относится оно к десятке, а не к двадцатке. Проверка
 * по всему сообщению засчитывала такой пересказ условия как решение.
 */
function markerNearNumber(text: string, expected: number): boolean {
  const pattern = /-?\d+(?:\.\d+)?/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (Math.abs(Number(match[0]) - expected) >= 0.01) continue;
    if (isCoefficient(text, match.index, match[0].length)) continue;

    // Тридцати символов хватает, чтобы захватить «получается высота» или «ответ»,
    // но не дотянуться до соседнего числа в другой части предложения.
    const window = text.slice(Math.max(0, match.index - 30), match.index);
    if (ANSWER_MARKERS.some((marker) => window.includes(marker))) return true;
  }

  return false;
}

/**
 * Стоит ли число в позиции коэффициента, а не ответа.
 *
 * Во фразе «получилось 5y = 10» пятёрка — множитель при переменной, а не итог.
 * Без этой проверки такой промежуточный шаг засчитывался бы как решение задачи,
 * ответ которой равен пяти.
 */
function isCoefficient(text: string, index: number, length: number): boolean {
  const next = text[index + length];
  return next !== undefined && /[a-zA-Zа-яё^]/.test(next);
}

/**
 * Состоит ли сообщение только из числа и, возможно, единицы измерения.
 *
 * Проверка строгая: сообщение обязано НАЧИНАТЬСЯ с числа. Прежняя версия просто
 * вырезала все нецифры, из-за чего фраза «у меня 1 вопрос: что делать?»
 * превращалась в «1» и засчитывалась как ответ на задачу, ответ которой равен
 * единице.
 */
function isBareNumber(text: string, expected: number): boolean {
  // Число, затем не больше короткого хвоста вроде «м», «тг», «км/ч».
  const match = text.trim().match(/^(-?\d+(?:\.\d+)?)\s*\D{0,12}$/);
  if (!match) return false;
  return Math.abs(Number(match[1]) - expected) < 0.01;
}

/**
 * Назвал ли ученик правильный ответ.
 *
 * Вердикт выносит эта функция на сервере, а не языковая модель: модель могла бы
 * засчитать неверный ответ из вежливости, а для учебного продукта это худшее
 * из возможного.
 */
export function matchesArchiveAnswer(task: ArchiveTask, message: string): boolean {
  /*
    Задание с вариантами проверяется сравнением наборов, а не поиском
    слов в тексте.

    Вся хитрость ниже написана для открытого ответа, где ученик
    рассуждает словами и число может случайно попасть в пересказ условия.
    С вариантами такой опасности нет: выбор — это список, и он либо
    совпадает с верным, либо нет. Прогонять его через поиск маркеров
    означало бы засчитывать «не знаю, может первый или второй» как
    правильный ответ, если верным был первый.
  */
  const kind = archiveTaskKind(task);
  if (kind !== 'open') {
    const chosen = new Set(
      message
        .split(SPLIT_CHOICES)
        .map((part) => normalize(part))
        .filter(Boolean),
    );
    const right = new Set(
      task.answer
        .split(SPLIT_CHOICES)
        .map((part) => normalize(part))
        .filter(Boolean),
    );
    if (chosen.size !== right.size) return false;
    return [...right].every((value) => chosen.has(value));
  }

  const expected = normalize(task.answer);
  const said = normalize(message);
  const prompt = normalize(task.prompt);

  const expectedNumber = Number(expected);

  /* --- Числовой ответ --- */
  if (Number.isFinite(expectedNumber)) {
    const close = (value: number) => Math.abs(value - expectedNumber) < 0.01;

    if (!numbersIn(said).some(close)) return false;

    /*
     * Когда одного упоминания числа мало и нужен явный признак ответа:
     *
     * 1. Число ответа есть и в условии — его могли просто переписать оттуда.
     * 2. Ответ — маленькое целое (до 10). Такие цифры попадаются в обычной речи
     *    сплошь и рядом: «у меня 1 вопрос», «не знаю, 5 минут думаю», «вижу цикл
     *    7, 9, 3, 1». Задача с ответом «1» засчитывалась по любой из этих фраз.
     */
    const ambiguous =
      numbersIn(prompt).some(close) || (Number.isInteger(expectedNumber) && Math.abs(expectedNumber) < 10);

    if (ambiguous) {
      return isBareNumber(said, expectedNumber) || markerNearNumber(said, expectedNumber);
    }

    return true;
  }

  /* --- Текстовый ответ (True / False / Not Given) --- */
  if (!said.includes(expected)) return false;

  // «Not Given» содержит в себе слово «given», а «true» — часть фразы условия,
  // поэтому проверяем, не перечислил ли ученик просто все варианты из вопроса.
  const mentioned = IELTS_OPTIONS.filter((option) => said.includes(option));
  const quotedAllOptions = mentioned.length > 1;

  return !quotedAllOptions;
}
