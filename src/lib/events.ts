/**
 * Афиша: олимпиады, конкурсы и школьные события.
 *
 * Зачем это в учебной платформе. Персональный план отвечает на вопрос «что
 * учить», но не отвечает на вопрос «ради чего». Ученику из области сложнее
 * всего не выучить материал, а вовремя узнать, что олимпиада вообще идёт и
 * что регистрация закрывается в пятницу. Афиша закрывает именно этот разрыв.
 */

import type { Grade, Language } from './types';
import type { IconName } from '@/components/Icon';
import { almatyDateIso, daysBetween } from './date';

export type EventType = 'olympiad' | 'contest' | 'school' | 'course';

export const EVENT_TYPES: {
  id: EventType;
  icon: IconName;
  title: Record<Language, string>;
}[] = [
  { id: 'olympiad', icon: 'medal', title: { ru: 'Олимпиады', kk: 'Олимпиадалар', en: 'Olympiads' } },
  { id: 'contest', icon: 'trophy', title: { ru: 'Конкурсы', kk: 'Байқаулар', en: 'Contests' } },
  { id: 'school', icon: 'school', title: { ru: 'Школьные', kk: 'Мектептік', en: 'School' } },
  { id: 'course', icon: 'video', title: { ru: 'Курсы и вебинары', kk: 'Курстар', en: 'Courses' } },
];

export interface SchoolEvent {
  id: string;
  type: EventType;
  title: string;
  organizer: string;
  description: string;
  /** Дата проведения в формате «ГГГГ-ММ-ДД». */
  startsAt: string;
  /** Последний день регистрации. */
  registrationDeadline: string;
  location: string;
  online: boolean;
  grades: Grade[];
  subjectId?: string;
  /** Награда или что даёт участие. */
  prize?: string;
  free: boolean;
  /** Готовые ссылки на изображения от организатора. Пусто — шапка без фото. */
  coverUrls?: string[];
  /**
   * Настоящий адрес записи, который дал организатор. Нет — на странице
   * события остаётся только личная отметка «иду», без перехода куда-либо.
   */
  registrationUrl?: string | null;
}

/**
 * Состояние события относительно сегодняшнего дня.
 * Считается по времени Астаны — иначе вечером последнего дня регистрации
 * сервер по UTC решил бы, что срок ещё не истёк.
 */
export type EventStatus = 'open' | 'closing-soon' | 'closed' | 'past';

export function eventStatus(event: SchoolEvent, today: string = almatyDateIso()): EventStatus {
  if (daysBetween(today, event.startsAt) < 0) return 'past';

  const daysLeft = daysBetween(today, event.registrationDeadline);
  if (daysLeft < 0) return 'closed';
  if (daysLeft <= 3) return 'closing-soon';
  return 'open';
}

/** Сколько дней осталось до даты. Отрицательное — дата уже прошла. */
export function daysLeftUntil(dateIso: string, today: string = almatyDateIso()): number {
  return daysBetween(today, dateIso);
}

/** Дата в читаемом виде: «12 октября». */
export function formatEventDate(dateIso: string, language: Language): string {
  const locale = language === 'kk' ? 'kk-KZ' : language === 'en' ? 'en-GB' : 'ru-RU';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Almaty',
  }).format(new Date(`${dateIso}T12:00:00+05:00`));
}

/** Ближайший открытый дедлайн: сначала среди сохранённых, затем среди всех. */
export function pickNearestDeadline(
  events: SchoolEvent[],
  savedIds: Set<string> | null,
  today: string = almatyDateIso(),
): { event: SchoolEvent; fromSaved: boolean } | null {
  const open = events
    .filter((event) => {
      const status = eventStatus(event, today);
      return status === 'open' || status === 'closing-soon';
    })
    .sort((a, b) => a.registrationDeadline.localeCompare(b.registrationDeadline));

  const saved = savedIds ? open.find((event) => savedIds.has(event.id)) : undefined;
  if (saved) return { event: saved, fromSaved: true };
  return open[0] ? { event: open[0], fromSaved: false } : null;
}

/**
 * Файл календаря (.ics) с дедлайном регистрации — для кнопки «В календарь».
 *
 * Напоминание в телефоне ученика срабатывает без нашей почты и без
 * интернета: событие на весь день в дату дедлайна плюс сигнал за сутки.
 * Строки экранируются по RFC 5545 (запятая, точка с запятой, перенос).
 */
export function deadlineIcs(event: Pick<SchoolEvent, 'id' | 'title' | 'registrationDeadline'>, url: string): string {
  const escape = (value: string) =>
    value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const day = event.registrationDeadline.replace(/-/g, '');
  const next = new Date(`${event.registrationDeadline}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const dayAfter = next.toISOString().slice(0, 10).replace(/-/g, '');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tanym//Events//RU',
    'BEGIN:VEVENT',
    `UID:deadline-${event.id}@tanym`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${day}`,
    `DTEND;VALUE=DATE:${dayAfter}`,
    `SUMMARY:${escape(`Дедлайн регистрации: ${event.title}`)}`,
    `DESCRIPTION:${escape(url)}`,
    `URL:${url}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escape(`Завтра последний день регистрации: ${event.title}`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
