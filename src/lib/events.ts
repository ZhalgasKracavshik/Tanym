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
