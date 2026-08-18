/**
 * Работа с датами в часовом поясе Астаны (UTC+5).
 *
 * Почему это отдельный модуль и почему нельзя просто new Date():
 * сервер Vercel живёт по UTC. Если считать «сегодня» наивно, то с полуночи
 * до 05:00 по Астане сервер думает, что ещё вчера. Для стриков это критично:
 * ученик занимался вечером и утром, а система решила бы, что это один день,
 * либо наоборот — засчитала пропуск и обнулила серию.
 */

const TIME_ZONE = 'Asia/Almaty';

/** Дата в виде «ГГГГ-ММ-ДД» по времени Астаны. */
export function almatyDateIso(date: Date = new Date()): string {
  // en-CA даёт формат «2026-08-18» — ровно то, что нужно, без ручной сборки.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Вчерашняя дата по времени Астаны. */
export function almatyYesterdayIso(date: Date = new Date()): string {
  const yesterday = new Date(date.getTime() - 24 * 60 * 60 * 1000);
  return almatyDateIso(yesterday);
}

/** Сколько дней прошло между двумя датами формата «ГГГГ-ММ-ДД». */
export function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const to = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}
