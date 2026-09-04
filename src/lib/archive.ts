/**
 * Архив заданий: материалы прошлых лет и подготовка к экзаменам.
 *
 * Отличие от обычных тем: здесь задание не решается выбором варианта, а
 * разбирается в диалоге с наставником по методу Сократа. Поэтому у задания
 * есть только текстовый ответ и эталонное решение — вариантов ответа нет
 * намеренно, иначе ученик угадывал бы вместо рассуждения.
 */

import type { Difficulty, Grade, Language } from './types';
import type { IconName } from '@/components/Icon';

export type ArchiveCategory = 'ent' | 'olympiad' | 'ielts' | 'sat' | 'sor-soch';

export const ARCHIVE_CATEGORIES: {
  id: ArchiveCategory;
  icon: IconName;
  title: Record<Language, string>;
}[] = [
  { id: 'ent', icon: 'cap', title: { ru: 'ЕНТ', kk: 'ҰБТ', en: 'National exam' } },
  { id: 'olympiad', icon: 'medal', title: { ru: 'Олимпиады', kk: 'Олимпиадалар', en: 'Olympiads' } },
  { id: 'ielts', icon: 'globe', title: { ru: 'IELTS', kk: 'IELTS', en: 'IELTS' } },
  { id: 'sat', icon: 'chart', title: { ru: 'SAT', kk: 'SAT', en: 'SAT' } },
  { id: 'sor-soch', icon: 'clipboard', title: { ru: 'ТЖБ / БЖБ', kk: 'ТЖБ / БЖБ', en: 'Term assessments' } },
];

/**
 * Вид задания архива.
 *
 * 'open' — ученик пишет ответ словами, и разговор ведётся по методу
 * Сократа. Это исходный и главный вид: он учит рассуждать.
 *
 * 'single' и 'multiple' — выбор варианта и выбор нескольких. Нужны там,
 * где проверяется знание, а не ход решения: даты, термины, формулировки
 * правил. Загонять такое в диалог бессмысленно — подводить не к чему.
 */
export type ArchiveTaskKind = 'open' | 'single' | 'multiple';

export interface ArchiveTask {
  id: string;
  materialId: string;
  /**
   * Вид задания. Поле необязательное: материалы, созданные до его
   * появления, его не имеют, и все они по смыслу открытые. Читать
   * значение следует через archiveTaskKind() ниже, а не напрямую.
   */
  kind?: ArchiveTaskKind;
  /** Варианты ответа — только для 'single' и 'multiple'. */
  options?: string[];
  /** Номера верных вариантов. Для 'single' в списке ровно один. */
  correctIndexes?: number[];
  /** Условие. Для IELTS сюда же входит короткий отрывок текста. */
  prompt: string;
  /**
   * Правильный ответ в виде строки. Для числовых заданий — чистое число
   * без единиц измерения, чтобы сравнение было однозначным.
   */
  answer: string;
  /** Единица измерения — показывается ученику, но в сравнении не участвует. */
  unit?: string;
  /** Полное решение. Наставник видит его, но ученику пересказывать не должен. */
  explanation: string;
  /** Первый наводящий вопрос — с него начинается диалог, без обращения к модели. */
  opening: string;
}

/**
 * Вид задания с учётом старых материалов.
 *
 * Отдельная функция, а не `task.kind ?? 'open'` по месту: обращений к
 * виду задания много, и стоит забыть подстановку в одном из них, как
 * старый материал начнёт вести себя как задание без вариантов ответа —
 * то есть покажет ученику пустой список.
 */
export function archiveTaskKind(task: ArchiveTask): ArchiveTaskKind {
  return task.kind ?? 'open';
}

export interface ArchiveMaterial {
  id: string;
  title: string;
  category: ArchiveCategory;
  /** Предмет из основного каталога, если материал к нему относится. */
  subjectId?: string;
  grades: Grade[];
  year: number;
  difficulty: Difficulty;
  /** Откуда материал — честно указываем происхождение. */
  source: string;
  description: string;
  tasks: ArchiveTask[];
  /**
   * Приложенный файл. Материал может быть без него (набор задач,
   * составленный в форме) или наоборот состоять только из него —
   * подборка PDF без разбора тоже полезна.
   */
  filePath?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Проверка ответа                                                    */
/* ------------------------------------------------------------------ */

// Логика распознавания ответа живёт в отдельном модуле: она оказалась
// заметно тоньше, чем «сравнить две строки». Подробности — там.
export { matchesArchiveAnswer } from './archive-answer';
