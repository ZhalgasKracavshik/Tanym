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
const { pickNearestDeadline, deadlineIcs } = await load('src/lib/events.ts');
const { reminderKindFor, addDaysIso, buildReminderEmail } = await load('src/lib/notifications/deadlineReminder.ts');

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

/* Напоминания о дедлайне: ровно за 7 и за 1 день, без сдвига суток. */
expect(addDaysIso('2026-10-30', 7) === '2026-11-06', 'addDaysIso переходит через месяц');
expect(addDaysIso('2026-12-31', 1) === '2027-01-01', 'addDaysIso переходит через год');
expect(reminderKindFor('2026-10-13', '2026-10-06') === 'd7', 'за 7 дней — напоминание d7');
expect(reminderKindFor('2026-10-07', '2026-10-06') === 'd1', 'за 1 день — напоминание d1');
expect(reminderKindFor('2026-10-06', '2026-10-06') === null, 'в сам день дедлайна письма нет');
expect(reminderKindFor('2026-10-10', '2026-10-06') === null, 'за 4 дня письма нет');
const mail = buildReminderEmail('<b>Айгерим</b>', [
  { eventId: 'e1', title: 'Олимпиада <script>alert(1)</script>', deadlineIso: '2026-10-07', kind: 'd1' },
], 'https://tanym.kz');
expect(!mail.html.includes('<script>') && !mail.html.includes('<b>Айгерим'), 'письмо экранирует имя и название');
expect(mail.subject.startsWith('Завтра'), 'тема письма за 1 день — «Завтра…»');
expect(mail.text.includes('https://tanym.kz/events/e1'), 'в письме ссылка на событие');
expect(!isDisabledPath('/api/cron/deadline-reminders'), 'крон напоминаний не закрыт пилотом');

/* Файл календаря: дата дедлайна, сигнал за сутки, экранирование. */
const ics = deadlineIcs({ id: 'e1', title: 'Олимпиада; этап, 1', registrationDeadline: '2026-12-31' }, 'https://tanym.kz/events/e1');
expect(ics.includes('DTSTART;VALUE=DATE:20261231') && ics.includes('DTEND;VALUE=DATE:20270101'), 'ics: событие на весь день дедлайна');
expect(ics.includes('TRIGGER:-P1D'), 'ics: сигнал за сутки');
expect(ics.includes('Олимпиада\\; этап\\, 1'), 'ics: ; и , экранированы');

if (problems.length > 0) {
  console.error('✗ Проверка пилота не прошла:');
  for (const problem of problems) console.error('  - ' + problem);
  process.exit(1);
}

console.log('✓ пилот: лишние разделы закрыты, CSP строгая, ближайший дедлайн выбирается верно');
