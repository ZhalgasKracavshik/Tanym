/**
 * Демонстрационный состав школьного рейтинга.
 *
 * Ученики вымышленные, имена — казахские и русские, как в обычном классе
 * городской школы. Массив фиксированный и без Math.random: рейтинг обязан
 * выглядеть одинаково при каждом рендере, иначе строки прыгали бы местами
 * прямо на глазах у пользователя.
 *
 * Специально сделано две вещи: у двух учеников совпадают очки (проверка
 * соревновательного ранжирования 1, 2, 2, 4) и один ученик скрыл имя —
 * видно, что аноним остаётся в рейтинге, а не исчезает из него.
 *
 * С появлением бэкенда файл заменяется запросом к таблице, остальной код
 * не меняется: он работает с типом LeaderboardEntry, а не с массивом.
 */

import type { LeaderboardEntry } from '@/lib/leaderboard';

const SCHOOL_LEADERBOARD: LeaderboardEntry[] = [
  { id: 'lb-aisultan', name: 'Айсұлтан Жақыпов', grade: 11, points: 2380, topicsMastered: 24, streak: 18 },
  { id: 'lb-dana', name: 'Дана Серікқызы', grade: 10, points: 2145, topicsMastered: 21, streak: 12 },
  { id: 'lb-artem', name: 'Артём Ковалёв', grade: 11, points: 1980, topicsMastered: 19, streak: 7 },
  { id: 'lb-zhanel', name: 'Жанель Бекова', grade: 9, points: 1760, topicsMastered: 17, streak: 9 },
  { id: 'lb-nurislam', name: 'Нұрислам Ерғали', grade: 10, points: 1615, topicsMastered: 16, streak: 4 },
  // Ничья: две строки с 1480 очками должны получить одно и то же место.
  { id: 'lb-polina', name: 'Полина Мироненко', grade: 10, points: 1480, topicsMastered: 15, streak: 11 },
  { id: 'lb-alikhan', name: 'Әлихан Тұрсынов', grade: 11, points: 1480, topicsMastered: 14, streak: 3 },
  { id: 'lb-madina', name: 'Мадина Оспанова', grade: 9, points: 1240, topicsMastered: 12, streak: 6 },
  // Ученик выбрал анонимность: имя скрыто, но место и очки на виду.
  { id: 'lb-kirill', name: 'Кирилл Стеценко', grade: 8, points: 1075, topicsMastered: 11, streak: 2, anonymous: true },
  { id: 'lb-aruzhan', name: 'Аружан Қайрат', grade: 9, points: 860, topicsMastered: 9, streak: 5 },
  { id: 'lb-timur', name: 'Тимур Абдрахманов', grade: 10, points: 720, topicsMastered: 8, streak: 1 },
  { id: 'lb-sofia', name: 'София Левченко', grade: 8, points: 545, topicsMastered: 6, streak: 3 },
  { id: 'lb-daniyar', name: 'Данияр Сәтбаев', grade: 8, points: 310, topicsMastered: 4, streak: 2 },
  { id: 'lb-kamila', name: 'Камила Юсупова', grade: 9, points: 165, topicsMastered: 2, streak: 1 },
];

/**
 * Состав рейтинга без текущего пользователя.
 * Возвращаем копию: страница дописывает в список собственную строку,
 * и мутация исходного массива накапливала бы дубли при повторных заходах.
 */
export function buildSchoolLeaderboard(): LeaderboardEntry[] {
  return SCHOOL_LEADERBOARD.map((entry) => ({ ...entry }));
}
