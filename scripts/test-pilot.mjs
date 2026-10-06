/** Проверка состава пилота и политики безопасности: npm run test:pilot */

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
register(new URL('./ts-resolver.mjs', import.meta.url));
const load = (path) => import(pathToFileURL(join(root, path)).href);

const { isDisabledPath, isAiLive } = await load('src/lib/pilot.ts');
const { buildCsp, generateNonce } = await load('src/lib/security/csp.ts');
const { pickNearestDeadline } = await load('src/lib/events.ts');

const problems = [];
const expect = (condition, message) => {
  if (!condition) problems.push(message);
};

/* Выключенные разделы — вместе с вложенными страницами и API. */
for (const path of [
  '/announcements',
  '/announcements/new',
  '/center',
  '/for-centers',
  '/register/center',
  '/chat',
  '/api/ai/chat',
  '/diagnostics/math',
  '/plan',
  '/learn/topic-1',
  '/teacher',
  '/achievements',
  '/achievements/my',
  '/leaderboard',
  '/api/ai/feedback',
  '/api/ai/plan',
  '/api/sync',
]) {
  expect(isDisabledPath(path), `${path} должен быть закрыт на пилот`);
}

/* Открытые разделы, в том числе с похожим началом пути. */
for (const path of [
  '/',
  '/events',
  '/events/123',
  '/register',
  '/archive',
  '/archive/ent-math-2024',
  '/marketplace',
  '/dashboard',
  '/profile',
  '/centers-of-excellence',
  '/chatroom',
  '/planet',
  '/api/ai/socratic',
  '/api/profile',
]) {
  expect(!isDisabledPath(path), `${path} НЕ должен закрываться`);
}

/* Живая модель включается только явным AI_LIVE=true. */
delete process.env.AI_LIVE;
expect(!isAiLive(), 'без AI_LIVE модель должна быть выключена');
process.env.AI_LIVE = 'true';
expect(isAiLive(), 'AI_LIVE=true должен включать модель');
delete process.env.AI_LIVE;

/* CSP: nonce уникален, опасные источники запрещены. */
const nonceA = generateNonce();
const nonceB = generateNonce();
expect(nonceA !== nonceB && nonceA.length >= 22, 'nonce должен быть случайным и не короче 128 бит');

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
const csp = buildCsp(nonceA);
expect(csp.includes(`'nonce-${nonceA}'`), 'политика должна содержать nonce запроса');
expect(csp.includes("'strict-dynamic'"), "script-src должен быть 'strict-dynamic'");
expect(!/script-src[^;]*'unsafe-inline'/.test(csp), "script-src не должен разрешать 'unsafe-inline'");
expect(csp.includes("object-src 'none'"), "object-src должен быть 'none'");
expect(csp.includes("frame-ancestors 'none'"), 'страницу нельзя встраивать во фреймы');
expect(csp.includes('wss://example.supabase.co'), 'Realtime Supabase должен быть разрешён в connect-src');

/* Ближайший дедлайн: сохранённое важнее общего, закрытое не берётся. */
const event = (id, deadline, startsAt = '2026-12-31') => ({
  id,
  type: 'olympiad',
  title: id,
  organizer: '',
  description: '',
  startsAt,
  registrationDeadline: deadline,
  location: '',
  online: true,
  grades: [],
  free: true,
});
const today = '2026-10-06';
const events = [event('closed', '2026-10-01'), event('soon', '2026-10-08'), event('later', '2026-11-01')];

expect(pickNearestDeadline(events, null, today)?.event.id === 'soon', 'без сохранённых — ближайший открытый');
expect(pickNearestDeadline(events, new Set(), today)?.fromSaved === false, 'пустые сохранённые — не «из ваших»');
const savedPick = pickNearestDeadline(events, new Set(['later', 'closed']), today);
expect(
  savedPick?.event.id === 'later' && savedPick.fromSaved,
  'есть сохранённое открытое — берётся оно, закрытое сохранённое пропускается',
);
expect(pickNearestDeadline([event('closed', '2026-10-01')], null, today) === null, 'всё закрыто — блока нет');

if (problems.length > 0) {
  console.error('✗ Проверка пилота не прошла:');
  for (const problem of problems) console.error('  - ' + problem);
  process.exit(1);
}

console.log('✓ пилот: лишние разделы закрыты, CSP строгая, ближайший дедлайн выбирается верно');
