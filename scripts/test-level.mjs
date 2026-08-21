/**
 * Проверка шкалы уровней.
 *
 * Уровень видят на своей карточке и в рейтинге, поэтому ошибка здесь — это
 * не кривая вёрстка, а «у меня уровень упал», хотя баллы только росли.
 * Тест поэтому проверяет прежде всего монотонность и границы, а не
 * конкретные красивые числа.
 */

import { strict as assert } from 'node:assert';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Тот же способ загрузки, что и в остальных сьютах: node сам снимает
// аннотации типов, отдельный сборочный шаг ради теста не нужен.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { levelFromPoints, pointsForLevel, pointsWord, MAX_LEVEL } = await import(
  pathToFileURL(join(root, 'src/lib/level.ts')).href
);

// 1. Ноль баллов — это первый уровень, а не нулевой и не ошибка.
assert.equal(levelFromPoints(0).level, 1, '0 баллов должен давать уровень 1');
assert.equal(levelFromPoints(-5).level, 1, 'отрицательные баллы не должны ломать шкалу');
assert.equal(levelFromPoints(Number.NaN).level, 1, 'NaN не должен давать NaN-уровень');

// 2. Уровень никогда не падает при росте баллов.
let previous = 0;
for (let points = 0; points <= 4000; points += 1) {
  const { level } = levelFromPoints(points);
  assert.ok(level >= previous, `уровень упал на ${points} баллах: ${previous} → ${level}`);
  previous = level;
}

// 3. Порог уровня — ровно та точка, где уровень меняется.
for (let level = 2; level <= MAX_LEVEL; level += 1) {
  const threshold = pointsForLevel(level);
  assert.equal(
    levelFromPoints(threshold).level,
    level,
    `на пороге ${threshold} должен быть уровень ${level}`,
  );
  assert.equal(
    levelFromPoints(threshold - 1).level,
    level - 1,
    `за балл до порога ${threshold} должен быть уровень ${level - 1}`,
  );
}

// 4. Шкала не растёт выше потолка.
assert.equal(levelFromPoints(10_000_000).level, MAX_LEVEL, 'уровень должен упираться в MAX_LEVEL');
assert.equal(levelFromPoints(10_000_000).nextAt, null, 'на максимуме не должно быть следующего порога');
assert.equal(levelFromPoints(10_000_000).progress, 1, 'на максимуме прогресс — единица');

// 5. Прогресс до следующего уровня остаётся в границах.
for (let points = 0; points <= 4000; points += 7) {
  const { progress } = levelFromPoints(points);
  assert.ok(progress >= 0 && progress <= 1, `прогресс вне 0…1 на ${points} баллах: ${progress}`);
}

// 6. Ранг «алмаз» достижим и не выдаётся новичку.
assert.equal(levelFromPoints(0).tier, 'bronze', 'новичок не должен быть алмазным');
assert.equal(levelFromPoints(pointsForLevel(20)).tier, 'diamond', 'уровень 20 — алмаз');

// 7. Склонение «балл» — строка видна в профиле у каждого ученика.
for (const [n, want] of [
  [1, 'балл'],
  [2, 'балла'],
  [4, 'балла'],
  [5, 'баллов'],
  [11, 'баллов'],
  [14, 'баллов'],
  [21, 'балл'],
  [22, 'балла'],
  [25, 'баллов'],
  [101, 'балл'],
  [112, 'баллов'],
]) {
  assert.equal(pointsWord(n), want, `${n} ${want}`);
}

console.log('✓ уровни: пороги, монотонность, границы и ранги');
