/**
 * Проверка ссылки, которую написал пользователь.
 *
 * Зачем. Ученик прикладывает к записи ссылку на видео, и она попадает в
 * href в общей ленте. Без проверки туда проходит строка вида
 * `javascript:...`, и нажатие на такую ссылку выполняет чужой код на
 * странице у всех, кто её открыл. Это не теоретический риск: атрибут
 * href принимает такую схему по стандарту.
 *
 * Почему разбор через URL, а не регулярное выражение. Конструктор URL
 * разбирает адрес по тем же правилам, что и браузер, поэтому отбрасывает
 * и то, что лишь выглядит ссылкой: пробелы в схеме, «http:/x»,
 * управляющие символы внутри. Регулярное выражение здесь неизбежно
 * разошлось бы с браузером — и разошлось бы в опасную сторону.
 *
 * Модуль общий намеренно: та же проверка нужна и форме публикации, и
 * ленте, а две копии одного правила рано или поздно разъезжаются.
 */

const SAFE_PROTOCOLS = ['http:', 'https:'];

/** Нормализованная ссылка или null, если она небезопасна или не разбирается. */
export function safeExternalUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  try {
    const parsed = new URL(trimmed);
    return SAFE_PROTOCOLS.includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}

export function isSafeExternalUrl(value: unknown): boolean {
  return safeExternalUrl(value) !== null;
}
