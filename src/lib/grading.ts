/**
 * Проверка ответов ученика.
 *
 * Вынесено в отдельный модуль, потому что проверка нужна в трёх местах:
 * в диагностике, в модуле заданий и на сервере (AI-объяснение должно знать,
 * ошибся ученик или нет, и не может доверять этому флагу от клиента).
 */

import type { Task } from './types';

/**
 * Приводит числовой ответ к каноническому виду, чтобы «0,5», «0.50» и « .5 »
 * считались одним и тем же ответом. Ученик не должен терять балл из-за запятой.
 */
export function normalizeNumeric(raw: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/,/g, '.')
    // минусы бывают разных видов: обычный дефис, en dash, минус-знак
    .replace(/[‐-―−]/g, '-');

  const asNumber = Number(cleaned);
  if (Number.isFinite(asNumber)) {
    // Убираем «хвост» плавающей точки: 0.30000000000000004 → 0.3
    return String(Number(asNumber.toFixed(6)));
  }
  return cleaned;
}

/** Проверяет ответ на задание. `answer` — индекс варианта (для single) или строка (для numeric). */
export function checkAnswer(task: Task, answer: string): boolean {
  if (task.kind === 'single') {
    const index = Number(answer);
    return Number.isInteger(index) && index === task.correctIndex;
  }
  if (task.correctValue === undefined) return false;
  return normalizeNumeric(answer) === normalizeNumeric(task.correctValue);
}

/** Человекочитаемый правильный ответ — для показа после ошибки. */
export function correctAnswerText(task: Task): string {
  if (task.kind === 'single') {
    if (task.options && task.correctIndex !== undefined) {
      return task.options[task.correctIndex] ?? '–';
    }
    return '–';
  }
  return task.correctValue ?? '–';
}

/** Как ученик ответил — в читаемом виде (для истории и для промпта AI). */
export function studentAnswerText(task: Task, answer: string): string {
  if (task.kind === 'single') {
    const index = Number(answer);
    if (task.options && Number.isInteger(index) && task.options[index] !== undefined) {
      return task.options[index];
    }
    return 'ответ не выбран';
  }
  return answer.trim() === '' ? 'ответ не введён' : answer.trim();
}
