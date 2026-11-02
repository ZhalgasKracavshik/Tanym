/**
 * Куда вернуть человека после входа: только внутренний путь сайта.
 *
 * Мало проверить «начинается с /». Браузер читает «\» как «/», поэтому
 * «/\evil.com» превращается в «//evil.com» — адрес чужого сайта. Там же
 * отсекаем управляющие символы: табуляцию и перевод строки браузер из URL
 * выбрасывает, и «/\t/evil.com» тоже стал бы «//evil.com».
 */
export function safeNextPath(raw: string | null | undefined, fallback = '/'): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return fallback;
  return raw;
}
