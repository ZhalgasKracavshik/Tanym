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

    // Тридцати символов хватает, чтобы захватить «получается высота» или «ответ»,
    // но не дотянуться до соседнего числа в другой части предложения.
    const window = text.slice(Math.max(0, match.index - 30), match.index);
    if (ANSWER_MARKERS.some((marker) => window.includes(marker))) return true;
  }

  return false;
}

/** Состоит ли сообщение только из числа и единиц измерения. */
function isBareNumber(text: string, expected: number): boolean {
  // Убираем всё, кроме цифр, точки и минуса: остаться должно ровно одно число.
  const digitsOnly = text.replace(/[^\d.\-]/g, '');
  return digitsOnly !== '' && Math.abs(Number(digitsOnly) - expected) < 0.01;
}

/**
 * Назвал ли ученик правильный ответ.
 *
 * Вердикт выносит эта функция на сервере, а не языковая модель: модель могла бы
 * засчитать неверный ответ из вежливости, а для учебного продукта это худшее
 * из возможного.
 */
export function matchesArchiveAnswer(task: ArchiveTask, message: string): boolean {
  const expected = normalize(task.answer);
  const said = normalize(message);
  const prompt = normalize(task.prompt);

  const expectedNumber = Number(expected);

  /* --- Числовой ответ --- */
  if (Number.isFinite(expectedNumber)) {
    const close = (value: number) => Math.abs(value - expectedNumber) < 0.01;

    if (!numbersIn(said).some(close)) return false;

    // Число ответа встречается и в условии — значит его могли просто переписать.
    // В этом случае требуем подтверждение, что ученик именно отвечает.
    if (numbersIn(prompt).some(close)) {
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
