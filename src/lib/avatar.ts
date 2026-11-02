/**
 * Данные для аватара: палитра фонов и набор символов.
 *
 * Лежат отдельно от компонента Avatar намеренно. Тот помечен 'use client',
 * а серверный обработчик /api/profile обязан сверять присланный символ с
 * этим же набором — но импорт значения из клиентского модуля на сервере
 * даёт не массив, а ссылку-заглушку, и проверка молча падает с
 * «AVATAR_EMOJI.includes is not a function». Общий источник правды поэтому
 * должен быть модулем без 'use client'.
 */

/**
 * Палитра фонов.
 *
 * Восемь вариантов: меньше — выбор не ощущается выбором, больше — экран
 * настроек превращается в палитру художника. Все достаточно тёмные,
 * чтобы белый инициал читался на любом.
 */
export const AVATAR_COLORS: { id: string; value: string; title: string }[] = [
  /*
    Плоские цвета, а не градиенты: градиент-«леденец» на аватаре — первый
    признак шаблонного интерфейса. Плоский тон с инициалами читается как
    у живых продуктов (Codeforces, Linear, Telegram).
  */
  { id: 'brand', value: '#c4542a', title: 'Терракота' },
  { id: 'amber', value: '#c77a12', title: 'Янтарь' },
  { id: 'forest', value: '#2f7d62', title: 'Хвоя' },
  { id: 'ocean', value: '#24779a', title: 'Море' },
  { id: 'violet', value: '#6b4fa8', title: 'Ирис' },
  { id: 'rose', value: '#b8405a', title: 'Шиповник' },
  { id: 'slate', value: '#3d5870', title: 'Графит' },
  { id: 'gold', value: '#8c6a17', title: 'Золото' },
];

/**
 * Фон по сохранённому id.
 *
 * Если цвет не выбран, берём стабильный по имени, а не первый из списка:
 * так у разных людей в ленте разные аватары ещё до того, как кто-то
 * дошёл до настроек. Хеш простейший — это подпись, а не защита.
 */
export function avatarBackground(colorId: string | null, seed: string): string {
  const found = AVATAR_COLORS.find((item) => item.id === colorId);
  if (found) return found.value;

  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 1_000_000_007;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length].value;
}


/** Инициалы: первая буква имени и фамилии («Айгерим Тестова» → «АТ»). */
export function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => Array.from(part)[0] ?? '');
  return letters.join('').toLocaleUpperCase('ru-RU') || '?';
}
