/**
 * Содержимое маркетплейса.
 *
 * Объявления вымышленные, но собраны по образцу того, что реально существует
 * вокруг казахстанской школы: предметные кружки, подготовка к ЕНТ у своих же
 * учителей, помощь старшеклассников и городские учебные центры.
 *
 * Цены указаны в тенге и намеренно разного порядка — от бесплатных школьных
 * секций до центров. Ученик должен видеть, что бесплатные варианты есть.
 */

import type { Listing } from '@/lib/listings';

export const LISTINGS: Listing[] = [
  /* --- Секции школы --- */
  {
    id: 'club-robotics',
    type: 'school-club',
    title: 'Кружок робототехники',
    authorName: 'Ерлан Сағынов',
    authorRole: 'учитель информатики',
    description:
      'Собираем и программируем роботов на Arduino. Готовим команду на городские соревнования. Начинать можно с нуля.',
    category: 'Информатика',
    price: null,
    format: 'offline',
    schedule: 'Вторник и четверг, 15:30–17:00, кабинет 214',
    contact: 'Кабинет 214, после уроков',
    spots: 6,
    verified: true,
  },
  {
    id: 'club-debate',
    type: 'school-club',
    title: 'Дебатный клуб',
    authorName: 'Айгүл Нұрланова',
    authorRole: 'учитель истории',
    description:
      'Учимся строить аргумент и держать позицию под давлением. Формат парламентских дебатов на русском и казахском.',
    category: 'Риторика',
    price: null,
    format: 'offline',
    schedule: 'Среда, 16:00–17:30, актовый зал',
    contact: 'Кабинет 108',
    spots: 10,
    verified: true,
  },
  {
    id: 'club-volleyball',
    type: 'school-club',
    title: 'Секция волейбола',
    authorName: 'Дәурен Оспанов',
    authorRole: 'учитель физкультуры',
    description: 'Тренировки для 8–11 классов, подготовка к школьной лиге. Форма своя, мячи школьные.',
    category: 'Спорт',
    price: null,
    format: 'offline',
    schedule: 'Понедельник и пятница, 17:00–18:30, спортзал',
    contact: 'Спортзал',
    verified: true,
  },

  /* --- Курсы учителей --- */
  {
    id: 'course-ent-math',
    type: 'teacher-course',
    title: 'Интенсив по математике для ЕНТ',
    authorName: 'Гүлнара Әбенова',
    authorRole: 'учитель математики, 22 года стажа',
    description:
      'Разбор всех типов задач тестирования: от базовых процентов до параметров. Группы по 6 человек, каждому достаётся внимание.',
    category: 'Математика',
    price: 4000,
    priceNote: 'за занятие',
    format: 'both',
    schedule: 'Суббота, 10:00–12:00',
    contact: 'Через администрацию школы',
    spots: 2,
    verified: true,
  },
  {
    id: 'course-physics-olymp',
    type: 'teacher-course',
    title: 'Олимпиадная физика',
    authorName: 'Марат Жақсылықов',
    authorRole: 'учитель физики',
    description:
      'Задачи областного и республиканского уровня. Нужна твёрдая база за 9 класс — на входе короткое собеседование.',
    category: 'Физика',
    price: 5000,
    priceNote: 'за занятие',
    format: 'offline',
    schedule: 'Воскресенье, 11:00–13:30',
    contact: 'Кабинет 306',
    spots: 3,
    verified: true,
  },
  {
    id: 'course-english-speaking',
    type: 'teacher-course',
    title: 'Разговорный английский',
    authorName: 'Асель Тұрарова',
    authorRole: 'учитель английского языка',
    description:
      'Только speaking: дискуссии, презентации, подготовка к устной части IELTS. Русский на занятиях не используется.',
    category: 'Английский',
    price: 3500,
    priceNote: 'за занятие',
    format: 'online',
    schedule: 'Вторник и четверг, 19:00–20:00',
    contact: 'Онлайн, ссылка после записи',
    spots: 4,
    verified: true,
  },

  /* --- От учеников --- */
  {
    id: 'student-math-help',
    type: 'student-service',
    title: 'Помогу с алгеброй, 7–9 класс',
    authorName: 'Санжар Мукашев',
    authorRole: 'ученик 11 класса',
    description:
      'Призёр городской олимпиады. Объясню то, что не понял на уроке, помогу разобрать домашнюю работу. Беру недорого, потому что сам недавно это проходил.',
    category: 'Математика',
    price: 1500,
    priceNote: 'за час',
    format: 'both',
    schedule: 'По договорённости, будни после 18:00',
    contact: 'Через платформу',
    verified: false,
  },
  {
    id: 'student-volunteer-team',
    type: 'student-service',
    title: 'Набираю волонтёрскую команду для помощи младшим',
    authorName: 'Аружан Ким',
    authorRole: 'ученица 10 класса',
    description:
      'Хотим по субботам бесплатно заниматься с 5–6 классами, у которых проблемы с математикой. Нужны те, кто сам хорошо тянет предмет. Часы волонтёрства идут в портфолио.',
    category: 'Волонтёрство',
    price: null,
    format: 'offline',
    schedule: 'Суббота, 11:00–13:00, школьная библиотека',
    contact: 'Через платформу',
    spots: 5,
    verified: false,
  },
  {
    id: 'student-code-club',
    type: 'student-service',
    title: 'Учу основам Python, начинаем с нуля',
    authorName: 'Тимур Ахметов',
    authorRole: 'ученик 11 класса',
    description:
      'Прошёл два хакатона, знаю, с какими ошибками сталкиваются новички. Разберём переменные, циклы и первый маленький проект.',
    category: 'Программирование',
    price: null,
    priceNote: 'бесплатно, но нужен свой ноутбук',
    format: 'offline',
    schedule: 'Пятница, 16:00–17:30, кабинет 214',
    contact: 'Через платформу',
    spots: 8,
    verified: false,
  },

  /* --- Внешние центры --- */
  {
    id: 'center-ent-prep',
    type: 'external-center',
    title: 'Учебный центр «Білім+»: годовая подготовка к ЕНТ',
    authorName: 'Учебный центр «Білім+»',
    authorRole: 'внешний партнёр',
    description:
      'Полный курс по пяти предметам ЕНТ с сентября по май. Пробные тестирования каждый месяц, разбор результатов с преподавателем.',
    category: 'Подготовка к ЕНТ',
    price: 45000,
    priceNote: 'в месяц',
    format: 'both',
    schedule: 'Три раза в неделю, две группы на выбор',
    contact: 'Проспект Абая 45, запись по телефону',
    verified: false,
  },
  {
    id: 'center-ielts',
    type: 'external-center',
    title: 'Языковая школа Lingua: подготовка к IELTS',
    authorName: 'Языковая школа Lingua',
    authorRole: 'внешний партнёр',
    description:
      'Курс на 3 месяца до целевого балла 6.5+. Пробный экзамен в формате настоящего IELTS в начале и в конце курса.',
    category: 'Английский',
    price: 60000,
    priceNote: 'за курс',
    format: 'offline',
    schedule: 'Два раза в неделю, вечерние группы',
    contact: 'ул. Кенесары 12, офис 305',
    verified: false,
  },
];
