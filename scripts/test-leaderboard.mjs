/**
 * Проверка лидерборда.
 *
 * Запуск:  npm run test:leaderboard
 *
 * Два свойства, которые легко сломать незаметно:
 *   1. Псевдоним обязан быть постоянным. Если он считается случайно, ученик
 *      при каждой перерисовке страницы будет становиться то Барсом, то Волком —
 *      и смысл анонимности пропадёт вместе с узнаваемостью.
 *   2. При равных очках место должно совпадать. Наивная нумерация по индексу
 *      выдала бы двум ученикам с одинаковым счётом разные места.
 */

import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (path) => import(pathToFileURL(join(root, path)).href);

const { pseudonym, rankEntries } = await load('src/lib/leaderboard.ts');
const { buildSchoolLeaderboard } = await load('src/data/leaderboard.ts');

const problems = [];
const check = (condition, message) => {
  if (!condition) problems.push(message);
};

/* --- 1. Псевдоним постоянен --- */

const first = pseudonym('user_abc123', 'ru');
for (let i = 0; i < 50; i += 1) {
  if (pseudonym('user_abc123', 'ru') !== first) {
    problems.push('псевдоним меняется между вызовами — где-то случайность');
    break;
  }
}
check(typeof first === 'string' && first.length > 0, 'псевдоним пустой');

// Разные пользователи должны в среднем получать разные псевдонимы.
const variety = new Set(
  Array.from({ length: 30 }, (_, i) => pseudonym(`user_${i}`, 'ru')),
);
check(variety.size > 1, 'все пользователи получают один и тот же псевдоним');

// Язык влияет на текст псевдонима.
check(
  pseudonym('user_abc123', 'kk') !== first || pseudonym('user_abc123', 'en') !== first,
  'псевдоним не переводится: во всех языках одна и та же строка',
);

/* --- 2. Ранжирование при равных очках --- */

const ranked = rankEntries([
  { id: 'a', name: 'A', grade: 9, points: 500, topicsMastered: 3, streak: 1 },
  { id: 'b', name: 'B', grade: 9, points: 300, topicsMastered: 2, streak: 0 },
  { id: 'c', name: 'C', grade: 10, points: 300, topicsMastered: 2, streak: 4 },
  { id: 'd', name: 'D', grade: 11, points: 100, topicsMastered: 1, streak: 0 },
]);

const places = ranked.map((entry) => entry.rank);
check(
  JSON.stringify(places) === JSON.stringify([1, 2, 2, 4]),
  `при равных очках места посчитаны неверно: получили ${JSON.stringify(places)}, ожидали [1,2,2,4]`,
);
check(ranked[0].points >= ranked[1].points, 'список не отсортирован по убыванию очков');

/* --- 3. Демонстрационные данные постоянны --- */

const runA = buildSchoolLeaderboard().map((entry) => `${entry.id}:${entry.points}`).join('|');
const runB = buildSchoolLeaderboard().map((entry) => `${entry.id}:${entry.points}`).join('|');
check(runA === runB, 'список учеников меняется между вызовами — рейтинг будет прыгать');

const school = buildSchoolLeaderboard();
check(school.length >= 10, `учеников в демо-классе слишком мало: ${school.length}`);

const pointsList = school.map((entry) => entry.points);
check(
  new Set(pointsList).size < pointsList.length,
  'ни у кого не совпадают очки — случай равных мест не проверяется данными',
);

/* --- Итог --- */

console.log(`Учеников в демо-рейтинге: ${school.length}. Псевдоним примера: ${first}`);

if (problems.length === 0) {
  console.log('\n✓ Лидерборд работает верно.');
  process.exit(0);
}

console.error(`\n✗ Найдено проблем: ${problems.length}\n`);
for (const problem of problems) console.error(`  • ${problem}`);
process.exit(1);
