/**
 * Склонение по числу для русского: 1 событие, 2 события, 5 событий,
 * 11 событий, 21 событие. Казахский и английский проще — для них см.
 * pluralEn; в казахском существительное после числа не меняется.
 */
export function pluralRu(n: number, one: string, few: string, many: string): string {
  const lastTwo = Math.abs(n) % 100;
  const last = Math.abs(n) % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

export function pluralEn(n: number, one: string, other: string): string {
  return n === 1 ? one : other;
}
