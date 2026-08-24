// Проверка шкалы баллов за достижения.

import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (path) => import(pathToFileURL(join(root, path)).href);

const { achievementPoints, LEVELS, PLACES } = await load('src/lib/portfolio.ts');

const problems = [];
const check = (condition, message) => {
  if (!condition) problems.push(message);
};

/* 1. Опорная точка из требований*/


check(
  achievementPoints('city', 'first') === 10,
  `городская олимпиада, 1 место должна давать 10 баллов, получили ${achievementPoints('city', 'first')}`,
);
check(
  achievementPoints('city', 'second') === 7,
  `городская олимпиада, 2 место должна давать 7 баллов, получили ${achievementPoints('city', 'second')}`,
);
check(
  achievementPoints('national', 'third') === 40,
  `республика, 3 место должна давать 40 баллов, получили ${achievementPoints('national', 'third')}`,
);


for (let i = 1; i < LEVELS.length; i += 1) {
  const lower = achievementPoints(LEVELS[i - 1], 'first');
  const higher = achievementPoints(LEVELS[i], 'first');
  check(
    higher > lower,
    `${LEVELS[i]} должен стоить дороже, чем ${LEVELS[i - 1]}: ${higher} против ${lower}`,
  );
}



for (let i = 1; i < PLACES.length; i += 1) {
  const better = achievementPoints('national', PLACES[i - 1]);
  const worse = achievementPoints('national', PLACES[i]);
  check(
    better > worse,
    `${PLACES[i - 1]} должно стоить дороже, чем ${PLACES[i]}: ${better} против ${worse}`,
  );
}

/* Ничто не стоит ноль */

for (const level of LEVELS) {
  for (const place of PLACES) {
    const points = achievementPoints(level, place);
    check(
      points > 0,
      `${level}/${place} даёт ${points} баллов - участие тоже должно чего-то стоить, иначе его незачем заявлять`,
    );
    check(Number.isInteger(points), `${level}/${place} даёт дробное число баллов: ${points}`);
  }
}


console.log(
  `Городская/1 место: ${achievementPoints('city', 'first')}. ` +
    `Международная/1 место: ${achievementPoints('international', 'first')}. ` +
    `Школьная/участие: ${achievementPoints('school', 'participant')}.`,
);

if (problems.length === 0) {
  console.log('\n✓ Шкала баллов за достижения верна.');
  process.exit(0);
}

console.error(`\n✗ Найдено проблем: ${problems.length}\n`);
for (const problem of problems) console.error(`  • ${problem}`);
process.exit(1);
