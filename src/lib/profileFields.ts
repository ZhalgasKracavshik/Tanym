/**
 * Справочники профиля: уровень подготовки, интересы, расписание.
 *
 * Списки закрытые, а не свободный ввод. Свободные теги в школе быстро
 * превращаются в «матеша», «Матем.» и «математика» — тремя разными
 * строками, по которым уже ничего не порекомендуешь. Закрытый список
 * заодно позволяет серверу отвергнуть всё, чего в нём нет.
 */

/**
 * Уровень подготовки — самооценка ученика.
 *
 * Не Junior/Middle/Senior: эта шкала пришла из переподготовки взрослых и
 * девятикласснику ничего не говорит — он не «джун по физике». Формулировки
 * описывают отношение к предмету, а не должность.
 */
export const KNOWLEDGE_LEVELS = [
  { id: 'beginner', title: 'Начинаю', hint: 'Только знакомлюсь с темой' },
  { id: 'growing', title: 'Разбираюсь', hint: 'Понимаю основы, нужна практика' },
  { id: 'confident', title: 'Уверенно', hint: 'Решаю большинство задач сам' },
  { id: 'advanced', title: 'Углублённо', hint: 'Готовлюсь к олимпиадам' },
] as const;

export type KnowledgeLevel = (typeof KNOWLEDGE_LEVELS)[number]['id'];

/**
 * Направления интересов.
 *
 * Шире школьных предметов намеренно: `subject_ids` отвечает за то, по чему
 * строится учебный план, а здесь — за то, что человеку интересно вообще,
 * включая внешкольное. По этому подбираются кружки, олимпиады и события.
 */
export const INTERESTS = [
  { id: 'programming', title: 'Программирование' },
  { id: 'math', title: 'Математика' },
  { id: 'physics', title: 'Физика' },
  { id: 'chemistry', title: 'Химия' },
  { id: 'biology', title: 'Биология и медицина' },
  { id: 'robotics', title: 'Робототехника' },
  { id: 'design', title: 'Дизайн' },
  { id: 'languages', title: 'Языки' },
  { id: 'history', title: 'История и право' },
  { id: 'economics', title: 'Экономика' },
  { id: 'ecology', title: 'Экология' },
  { id: 'media', title: 'Журналистика и медиа' },
  { id: 'music', title: 'Музыка' },
  { id: 'sport', title: 'Спорт' },
  { id: 'entrepreneurship', title: 'Предпринимательство' },
] as const;

export type InterestId = (typeof INTERESTS)[number]['id'];

/** Дни недели: 1 — понедельник, 0 — воскресенье, как в JS `getDay()`. */
export const WEEKDAYS = [
  { id: 1, short: 'Пн' },
  { id: 2, short: 'Вт' },
  { id: 3, short: 'Ср' },
  { id: 4, short: 'Чт' },
  { id: 5, short: 'Пт' },
  { id: 6, short: 'Сб' },
  { id: 0, short: 'Вс' },
] as const;

export const STUDY_TIMES = [
  { id: 'morning', title: 'Утром', hint: 'до уроков' },
  { id: 'afternoon', title: 'Днём', hint: 'сразу после школы' },
  { id: 'evening', title: 'Вечером', hint: 'после 18:00' },
] as const;

export type StudyTime = (typeof STUDY_TIMES)[number]['id'];

/** За сколько минут напоминать. null — не напоминать вовсе. */
export const REMINDER_LEADS = [15, 60, 180, 1440] as const;

export function reminderLabel(minutes: number): string {
  if (minutes < 60) return `за ${minutes} минут`;
  if (minutes < 1440) {
    const hours = minutes / 60;
    return hours === 1 ? 'за час' : `за ${hours} часа`;
  }
  return 'за сутки';
}

/**
 * Приводит телефон к хранимому виду или отвергает.
 *
 * Не строгая проверка казахстанского формата: ученик может дать номер
 * родителя, номер другой страны или записать его как привык. Смысл здесь
 * только в том, чтобы в колонку не попал абзац текста, — поэтому оставляем
 * цифры и плюс и смотрим на длину.
 */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  /*
    Сначала проверяем, из чего вообще состоит строка, и только потом
    вынимаем цифры. Обратный порядок молча склеивал «+7 (700) 123-45-67
    доб. 12» в +7700123456712 — четырнадцать цифр, длина в допустимых
    границах, номер выглядит настоящим и при этом неверен. Отказать
    честнее, чем испортить: человек поправит ввод, а неправильный номер
    он бы не заметил никогда.
  */
  if (!/^[+\d\s()-]+$/.test(trimmed)) return null;

  // Плюс имеет смысл только первым символом — это код страны.
  if (trimmed.slice(1).includes('+')) return null;

  const bare = trimmed.replace(/\D/g, '');
  if (bare.length < 10 || bare.length > 15) return null;

  return trimmed.startsWith('+') ? `+${bare}` : bare;
}
