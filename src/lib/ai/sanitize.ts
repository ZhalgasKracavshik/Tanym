/**
 * Обрезка и проверка того, что клиент присылает в промпт.
 *
 * Зачем это отдельным файлом. Роуты по-разному собирают запрос к модели, но
 * попадает в промпт всегда одно и то же: текст от браузера. Проверять его в
 * каждом роуте по-своему означает, что рано или поздно один роут проверку
 * забудет — так уже и вышло: в чате длина вопроса ограничена, а в плане
 * причины отбора тем и названия навыков уходили в промпт как есть.
 *
 * От чего защищает.
 *
 * 1. Стоимость и отказ в обслуживании. Ограничитель частоты считает запросы,
 *    а не их размер: двадцати разрешённых запросов с мегабайтом текста в
 *    каждом достаточно, чтобы выжечь бесплатную квоту ключа и уронить живую
 *    демонстрацию. Длина ограничивается здесь.
 *
 * 2. Подмена указаний модели. Всё, что приходит от браузера, — это данные, а
 *    не команды. Числа приводятся к числам, класс — к одному из существующих,
 *    роль реплики — к одной из двух известных. Строку, которой полагается
 *    быть числом, модель уже не прочитает как предложение.
 *
 * Ограничение честно назвать: обрезка не делает текст ученика доверенным.
 * Вопрос в чате по своей природе произвольный, и увести им разговор в
 * сторону ученик может — но это его собственный разговор: чужих данных в
 * промпте нет, инструментов у модели нет, а ответ возвращается ему же.
 */

import type { ChatMessage, Grade, Profile } from '../types';

/*
  Список классов продублирован из types.ts намеренно.

  Тесты в этом проекте загружают модуль напрямую через Node, а он не умеет
  разрешать импорт без расширения файла — поэтому все проверяемые модули
  здесь обходятся импортом одних типов, они стираются при выполнении.

  Дублирование не разъедется незаметно: две проверки ниже сверяют список с
  типом Grade в обе стороны, и при его изменении проект перестанет
  собираться.
*/
const GRADE_VALUES = [7, 8, 9, 10, 11, 12] as const;
const _noExtraGrades: readonly Grade[] = GRADE_VALUES;
type _NoMissingGrades = Exclude<Grade, (typeof GRADE_VALUES)[number]> extends never ? true : never;
const _gradesComplete: _NoMissingGrades = true;

/** Пределы длины. Взяты с запасом к живому тексту: разбор задания укладывается в 2000. */
export const LIMITS = {
  message: 600,
  historyMessages: 6,
  historyMessage: 1000,
  taskField: 2000,
  option: 300,
  options: 8,
  reason: 300,
  reasons: 6,
  title: 200,
  topics: 8,
} as const;

/** Строка не длиннее max. Не строка — пустая строка, а не «undefined» в промпте. */
export function clampText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

export function clampTextList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map((item) => clampText(item, maxLength)).filter((item) => item !== '');
}

/** Число в границах. Нечисло, NaN и бесконечность отбрасываются к запасному значению. */
export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/** Класс — только один из существующих, иначе его в промпте не будет вовсе. */
export function clampGrade(value: unknown): Grade | null {
  return (GRADE_VALUES as readonly number[]).includes(value as number) ? (value as Grade) : null;
}

/**
 * Профиль для промпта.
 *
 * В промпт из профиля идут только класс и цель, поэтому возвращается не
 * весь профиль, а ровно эти поля. Имя, идентификатор и путь к фотографии
 * модели не нужны: чем меньше личного уезжает во внешний сервис, тем лучше.
 */
export function sanitizeProfile(value: unknown): Profile | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Partial<Profile>;
  const grade = clampGrade(source.grade);
  if (grade === null && typeof source.goal !== 'string') return null;
  return {
    ...(source as Profile),
    id: '',
    name: '',
    grade: (grade ?? 0) as Grade,
    goal: clampText(source.goal, 60) as Profile['goal'],
    avatarPhotoPath: null,
    avatarPhotoUrl: null,
  };
}

/** Последние реплики диалога, каждая обрезана по длине. */
export function clampHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is ChatMessage => Boolean(item) && typeof item === 'object')
    .slice(-LIMITS.historyMessages)
    .map((message) => ({
      role: message.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: clampText(message.content, LIMITS.historyMessage),
      at: clampText(message.at, 40),
    }))
    .filter((message) => message.content !== '');
}
