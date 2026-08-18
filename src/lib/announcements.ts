/**
 * Объявления школьной администрации.
 *
 * Зачем это в учебной платформе. Сегодня школа объявляет всё через WhatsApp:
 * сообщение о медосмотре тонет между стикерами и фотографиями, а ученик узнаёт
 * про перенос уроков от одноклассника. Здесь у объявлений есть адресат (класс),
 * срок жизни и приоритет — то, чего в мессенджере нет в принципе.
 *
 * Ключевое отличие от афиши: событие можно пропустить, объявление — нет.
 * Поэтому у объявления нет регистрации, зато есть «прочитано» и «закреплено».
 */

import type { Grade, Language } from './types';
import type { IconName } from '@/components/Icon';
import { almatyDateIso, daysBetween } from './date';

export type AnnouncementCategory = 'medical' | 'assembly' | 'schedule' | 'important' | 'general';

export const ANNOUNCEMENT_CATEGORIES: {
  id: AnnouncementCategory;
  icon: IconName;
  title: Record<Language, string>;
}[] = [
  { id: 'important', icon: 'alert', title: { ru: 'Важное', kk: 'Маңызды', en: 'Important' } },
  {
    id: 'schedule',
    icon: 'clock',
    title: { ru: 'Расписание', kk: 'Сабақ кестесі', en: 'Timetable' },
  },
  {
    id: 'medical',
    icon: 'health',
    title: { ru: 'Медосмотр', kk: 'Медициналық тексеру', en: 'Health checks' },
  },
  {
    id: 'assembly',
    icon: 'flag',
    title: { ru: 'Линейки', kk: 'Салтанатты жиын', en: 'Assemblies' },
  },
  { id: 'general', icon: 'megaphone', title: { ru: 'Общее', kk: 'Жалпы', en: 'General' } },
];

export interface Announcement {
  id: string;
  category: AnnouncementCategory;
  title: string;
  body: string;
  /** Кто опубликовал: должность, а не имя — так понятнее, насколько это официально. */
  author: string;
  /** Дата публикации в формате «ГГГГ-ММ-ДД». */
  publishedAt: string;
  /**
   * Последний день, когда объявление ещё актуально.
   * Без срока объявление висит вечно — это и есть главная болезнь школьных чатов.
   */
  expiresAt?: string;
  /** Закреплённые всегда идут первыми, независимо от даты. */
  pinned: boolean;
  /** Классы-адресаты. null — объявление касается всей школы. */
  targetGrades: Grade[] | null;
}

/**
 * Истекло ли объявление.
 *
 * Считается по времени Астаны: иначе объявление «действует до 20 августа»
 * пропало бы у ученика ещё вечером 19-го, когда по UTC уже наступило 20-е,
 * либо наоборот — висело бы лишние сутки.
 */
export function isExpired(announcement: Announcement, today: string = almatyDateIso()): boolean {
  if (!announcement.expiresAt) return false;
  // Последний день срока считается актуальным, поэтому сравнение строгое.
  return daysBetween(today, announcement.expiresAt) < 0;
}

/**
 * Касается ли объявление этого класса.
 *
 * Когда класс неизвестен (профиль ещё не создан), адресные объявления
 * считаем не относящимися к ученику: лучше показать меньше, чем уверенно
 * сказать «это для тебя» человеку, про которого мы ничего не знаем.
 * Общешкольные объявления при этом видны всегда.
 */
export function isRelevantFor(announcement: Announcement, grade: Grade | null): boolean {
  if (announcement.targetGrades === null) return true;
  if (grade === null) return false;
  return announcement.targetGrades.includes(grade);
}

/** Дата в читаемом виде: «17 августа 2026». */
export function formatAnnouncementDate(dateIso: string, language: Language): string {
  const locale = language === 'kk' ? 'kk-KZ' : language === 'en' ? 'en-GB' : 'ru-RU';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Almaty',
    // Полдень по Астане: любая другая точка суток при пересчёте часовых поясов
    // могла бы сместить дату на сутки назад.
  }).format(new Date(`${dateIso}T12:00:00+05:00`));
}
