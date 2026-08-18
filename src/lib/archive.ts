/**
 * Архив заданий: материалы прошлых лет и подготовка к экзаменам.
 *
 * Отличие от обычных тем: здесь задание не решается выбором варианта, а
 * разбирается в диалоге с наставником по методу Сократа. Поэтому у задания
 * есть только текстовый ответ и эталонное решение — вариантов ответа нет
 * намеренно, иначе ученик угадывал бы вместо рассуждения.
 */

import type { Difficulty, Grade, Language } from './types';

export type ArchiveCategory = 'ent' | 'olympiad' | 'ielts' | 'sat' | 'sor-soch';

export const ARCHIVE_CATEGORIES: {
  id: ArchiveCategory;
  icon: string;
  title: Record<Language, string>;
}[] = [
  { id: 'ent', icon: '🎓', title: { ru: 'ЕНТ', kk: 'ҰБТ', en: 'National exam' } },
  { id: 'olympiad', icon: '🏅', title: { ru: 'Олимпиады', kk: 'Олимпиадалар', en: 'Olympiads' } },
  { id: 'ielts', icon: '🌍', title: { ru: 'IELTS', kk: 'IELTS', en: 'IELTS' } },
  { id: 'sat', icon: '📊', title: { ru: 'SAT', kk: 'SAT', en: 'SAT' } },
  { id: 'sor-soch', icon: '📝', title: { ru: 'ТЖБ / БЖБ', kk: 'ТЖБ / БЖБ', en: 'Term assessments' } },
];

export interface ArchiveTask {
  id: string;
  materialId: string;
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
}

/* ------------------------------------------------------------------ */
/*  Проверка ответа                                                    */
/* ------------------------------------------------------------------ */

// Логика распознавания ответа живёт в отдельном модуле: она оказалась
// заметно тоньше, чем «сравнить две строки». Подробности — там.
export { matchesArchiveAnswer } from './archive-answer';
