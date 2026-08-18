/**
 * Содержимое афиши.
 *
 * События вымышленные, но построены по образцу реального календаря казахстанского
 * школьника: республиканская олимпиада, «Зерде», пробное ЕНТ, вебинары о грантах.
 * Даты расставлены вокруг текущего момента так, чтобы на демонстрации были видны
 * все состояния сразу — открытая регистрация, закрывающаяся, закрытая и прошедшая.
 *
 * Когда появится настоящий бэкенд, этот файл заменяется таблицей в базе, а весь
 * остальной код остаётся прежним — он работает с типом SchoolEvent, а не с массивом.
 */

import type { SchoolEvent } from '@/lib/events';

export const EVENTS: SchoolEvent[] = [
  {
    id: 'rep-math-olympiad',
    type: 'olympiad',
    title: 'Республиканская олимпиада по математике, школьный этап',
    organizer: 'Министерство просвещения РК',
    description:
      'Первый отборочный этап. Победители школьного этапа проходят на городской, дальше на областной и республиканский.',
    startsAt: '2026-10-12',
    registrationDeadline: '2026-10-05',
    location: 'Ваша школа',
    online: false,
    grades: [9, 10, 11],
    subjectId: 'math',
    prize: 'Выход на городской этап, баллы в портфолио для гранта',
    free: true,
  },
  {
    id: 'zerde-projects',
    type: 'contest',
    title: 'Конкурс научных проектов «Зерде»',
    organizer: 'Республиканский научно-практический центр «Дарын»',
    description:
      'Защита исследовательских проектов по естественным и точным наукам. Нужна работа с научным руководителем и презентация.',
    startsAt: '2026-11-20',
    registrationDeadline: '2026-10-30',
    location: 'Астана, очно',
    online: false,
    grades: [8, 9, 10, 11],
    prize: 'Дипломы, рекомендации для поступления',
    free: true,
  },
  {
    id: 'trial-ent-autumn',
    type: 'school',
    title: 'Пробное ЕНТ: осенний поток',
    organizer: 'Национальный центр тестирования',
    description:
      'Полный формат настоящего тестирования: те же предметы, то же время, тот же бланк. Нужен, чтобы понять реальный уровень до весны.',
    startsAt: '2026-09-27',
    registrationDeadline: '2026-09-15',
    location: 'Пункт тестирования по месту жительства',
    online: false,
    grades: [11, 12],
    prize: 'Разбор результатов по каждому предмету',
    free: false,
  },
  {
    id: 'grant-webinar',
    type: 'course',
    title: 'Вебинар: как поступить на грант в 2027 году',
    organizer: 'Tanym',
    description:
      'Разбираем проходные баллы прошлых лет, квоты, сроки подачи документов и типичные ошибки в заявлении.',
    startsAt: '2026-08-28',
    registrationDeadline: '2026-08-27',
    location: 'Онлайн',
    online: true,
    grades: [10, 11, 12],
    prize: 'Запись вебинара и таблица проходных баллов',
    free: true,
  },
  {
    id: 'physics-bastau',
    type: 'olympiad',
    title: 'Олимпиада по физике «Бастау»',
    organizer: 'Назарбаев Интеллектуальные школы',
    description:
      'Открытая олимпиада с задачами повышенной сложности. Первый тур проходит дистанционно, поэтому участвовать можно из любого региона.',
    startsAt: '2026-09-14',
    registrationDeadline: '2026-08-21',
    location: 'Первый тур онлайн',
    online: true,
    grades: [9, 10, 11],
    subjectId: 'physics',
    prize: 'Приглашение на очный тур в Астану',
    free: true,
  },
  {
    id: 'history-olympiad',
    type: 'olympiad',
    title: 'Олимпиада по истории Казахстана',
    organizer: 'Областное управление образования',
    description:
      'Задания на знание хронологии, работу с историческими источниками и развёрнутый ответ по причинно-следственным связям.',
    startsAt: '2026-10-25',
    registrationDeadline: '2026-10-15',
    location: 'Областной центр',
    online: false,
    grades: [8, 9, 10, 11],
    subjectId: 'kazakh-history',
    prize: 'Дипломы I–III степени',
    free: true,
  },
  {
    id: 'english-essay',
    type: 'contest',
    title: 'Конкурс эссе на английском языке',
    organizer: 'British Council Kazakhstan',
    description:
      'Эссе на 300–400 слов по одной из предложенных тем. Оценивают структуру аргументации и точность языка, а не длину.',
    startsAt: '2026-09-30',
    registrationDeadline: '2026-09-20',
    location: 'Онлайн',
    online: true,
    grades: [9, 10, 11, 12],
    prize: 'Ваучер на сдачу IELTS для победителя',
    free: true,
  },
  {
    id: 'it-hackathon',
    type: 'contest',
    title: 'Школьный хакатон по программированию',
    organizer: 'Astana Hub',
    description:
      'Командная разработка за 48 часов. Нужна команда из 3–4 человек и базовое знание любого языка программирования.',
    startsAt: '2026-11-08',
    registrationDeadline: '2026-10-25',
    location: 'Астана, Astana Hub',
    online: false,
    grades: [9, 10, 11],
    prize: 'Призовой фонд и стажировки в IT-компаниях',
    free: true,
  },
  {
    id: 'summer-math-camp',
    type: 'school',
    title: 'Летняя математическая школа',
    organizer: 'Центр «Дарын»',
    description:
      'Двухнедельный интенсив по олимпиадной математике. Событие уже прошло, но оставлено в афише, чтобы можно было посмотреть формат и подготовиться к следующему набору.',
    startsAt: '2026-07-05',
    registrationDeadline: '2026-06-15',
    location: 'Алматинская область',
    online: false,
    grades: [8, 9, 10],
    subjectId: 'math',
    prize: 'Сертификат участника',
    free: false,
  },
];

/** Событие по идентификатору. */
export function getEvent(id: string | undefined): SchoolEvent | null {
  if (!id) return null;
  return EVENTS.find((event) => event.id === id) ?? null;
}
