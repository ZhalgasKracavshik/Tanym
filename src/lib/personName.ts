/**
 * Проверка настоящего имени.
 *
 * Зачем. Имя видно одноклассникам в рейтинге и в ленте достижений, и
 * пока проверка сводилась к «строка не пустая», в неё проходило что
 * угодно: одна буква, «ааа», набор цифр. Рейтинг с такими подписями
 * перестаёт быть школьным.
 *
 * Что считается именем. Минимум две части, разделённые пробелом, то есть
 * имя и фамилия: так и написано на самой форме. В каждой части минимум
 * две буквы. Из знаков внутри части разрешены дефис и апостроф, потому
 * что они встречаются в настоящих фамилиях. Цифр в имени не бывает.
 *
 * Чего эта проверка НЕ делает и делать не может: она не отличает
 * настоящего человека от выдуманного. «Иван Иванов» пройдёт. Задача
 * скромнее — отсечь заведомый мусор, а не подтвердить личность. Для
 * подтверждения нужен документ или школьный список, и это другая работа.
 */

/** Буква любого алфавита: имена в Казахстане пишут и кириллицей, и латиницей. */
const LETTER = /\p{L}/u;
const PART_ALLOWED = /^[\p{L}][\p{L}'’-]*$/u;

export const NAME_MIN_LENGTH = 3;
export const NAME_MAX_LENGTH = 120;

export type NameCheck = { ok: true; value: string } | { ok: false; reason: string };

/** Лишние пробелы схлопываются: «  Айсултан   Жакыпов » и «Айсултан Жакыпов» это одно имя. */
export function normalizePersonName(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

export function checkPersonName(input: unknown): NameCheck {
  if (typeof input !== 'string') return { ok: false, reason: 'Введите имя и фамилию.' };

  const value = normalizePersonName(input);

  if (value === '') return { ok: false, reason: 'Как вас зовут?' };
  if (value.length < NAME_MIN_LENGTH) return { ok: false, reason: 'Имя слишком короткое.' };
  if (value.length > NAME_MAX_LENGTH) return { ok: false, reason: 'Имя слишком длинное.' };
  if (/\d/.test(value)) return { ok: false, reason: 'В имени не должно быть цифр.' };

  const parts = value.split(' ');
  if (parts.length < 2) {
    return { ok: false, reason: 'Укажите имя и фамилию полностью, через пробел.' };
  }

  for (const part of parts) {
    if (part.length < 2 || !PART_ALLOWED.test(part) || !LETTER.test(part)) {
      return { ok: false, reason: 'Имя и фамилия пишутся буквами, каждое не короче двух букв.' };
    }
  }

  return { ok: true, value };
}
