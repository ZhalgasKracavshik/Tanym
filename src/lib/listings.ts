/**
 * Маркетплейс возможностей: секции, курсы, репетиторство и волонтёрство.
 *
 * Четыре типа объявлений живут в одной ленте намеренно. Для ученика это один
 * вопрос — «чем ещё можно заняться и у кого поучиться», и разносить его по
 * четырём разделам значило бы заставить искать в четырёх местах. Разделение
 * даёт фильтр, а не отдельные страницы.
 *
 * Важная деталь: объявления от учеников и учителей помечаются как ожидающие
 * проверки. В школьной среде публикация без модерации — прямой путь к тому,
 * что через платформу начнут продавать что попало.
 */

import type { Language } from './types';
import type { IconName } from '@/components/Icon';

export type ListingType = 'school-club' | 'teacher-course' | 'student-service' | 'external-center';

export const LISTING_TYPES: {
  id: ListingType;
  icon: IconName;
  title: Record<Language, string>;
  description: Record<Language, string>;
}[] = [
  {
    id: 'school-club',
    icon: 'school',
    title: { ru: 'Секции школы', kk: 'Мектеп үйірмелері', en: 'School clubs' },
    description: {
      ru: 'Бесплатные кружки и клубы внутри школы',
      kk: 'Мектеп ішіндегі тегін үйірмелер мен клубтар',
      en: 'Free clubs and societies inside the school',
    },
  },
  {
    id: 'teacher-course',
    icon: 'presentation',
    title: { ru: 'Курсы учителей', kk: 'Мұғалім курстары', en: 'Teacher courses' },
    description: {
      ru: 'Дополнительные занятия, которые ведут школьные учителя',
      kk: 'Мектеп мұғалімдері жүргізетін қосымша сабақтар',
      en: 'Extra lessons run by school teachers',
    },
  },
  {
    id: 'student-service',
    icon: 'backpack',
    title: { ru: 'От учеников', kk: 'Оқушылардан', en: 'From students' },
    description: {
      ru: 'Помощь старшеклассников и волонтёрские команды',
      kk: 'Жоғары сынып оқушыларының көмегі және волонтёр командалары',
      en: 'Peer tutoring and volunteer teams',
    },
  },
  {
    id: 'external-center',
    icon: 'building',
    title: { ru: 'Внешние центры', kk: 'Сыртқы орталықтар', en: 'External centres' },
    description: {
      ru: 'Учебные центры города, на правах рекламы',
      kk: 'Қаладағы оқу орталықтары, жарнама ретінде',
      en: 'City learning centres, paid placements',
    },
  },
];

export interface Listing {
  id: string;
  type: ListingType;
  title: string;
  /** Кто ведёт: имя и роль. Для ученика указывается класс. */
  authorName: string;
  authorRole: string;
  description: string;
  /** Направление: предмет, спорт, творчество и т.д. */
  category: string;
  /** null — бесплатно, число — цена в тенге за занятие или курс. */
  price: number | null;
  priceNote?: string;
  format: 'online' | 'offline' | 'both';
  schedule: string;
  /** Где проходит: адрес или «онлайн». */
  location?: string | null;
  /** Как связаться: телефон, WhatsApp или адрес, который оставил автор. */
  contact: string;
  /** Свободных мест, если набор ограничен. */
  spots?: number;
  /**
   * Проверено ли объявление школой. Непроверенные показываются с плашкой:
   * ученик должен видеть разницу между секцией школы и чьим-то предложением.
   */
  verified: boolean;
  /** true — объявление создал пользователь и оно ждёт модерации. */
  pending?: boolean;
  /** Готовая ссылка на обложку. Нет — карточка рисует цветную плашку. */
  coverUrl?: string | null;
}
