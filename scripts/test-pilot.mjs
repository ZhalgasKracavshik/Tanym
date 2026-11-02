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
const { pickNearestDeadline, deadlineIcs, parseGrades } = await load('src/lib/events.ts');
const { reminderKindFor, addDaysIso, buildReminderEmail } = await load('src/lib/notifications/deadlineReminder.ts');
const { pickDigest, buildDigestEmail, buildTelegramDigest, weekStartIso } = await load('src/lib/notifications/digest.ts');
const { safeNextPath } = await load('src/lib/security/redirect.ts');
const { passwordProblem, pwnedCountFromRange, MIN_PASSWORD_LENGTH } = await load('src/lib/security/password.ts');

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
expect(reminderKindFor('2026-10-13', '2026-10-06') === 'd7', 'за 7 дней — окно d7');
expect(reminderKindFor('2026-10-10', '2026-10-06') === 'd7', 'за 4 дня — всё ещё окно d7 (пропущенный запуск догоняется)');
expect(reminderKindFor('2026-10-07', '2026-10-06') === 'd1', 'за 1 день — окно d1');
expect(reminderKindFor('2026-10-06', '2026-10-06') === 'd1', 'в последний день — d1, если ещё не отправлено');
expect(reminderKindFor('2026-10-14', '2026-10-06') === null, 'за 8 дней письма нет');
expect(reminderKindFor('2026-10-05', '2026-10-06') === null, 'после дедлайна письма нет');
const mail = buildReminderEmail('<b>Айгерим</b>', [
  { eventId: 'e1', title: 'Олимпиада <script>alert(1)</script>', deadlineIso: '2026-10-07', kind: 'd1', daysLeft: 1 },
], 'https://tanym.kz');
const mail5 = buildReminderEmail('', [
  { eventId: 'a', title: 'A', deadlineIso: '2026-10-11', kind: 'd7', daysLeft: 5 },
  { eventId: 'b', title: 'B', deadlineIso: '2026-10-12', kind: 'd7', daysLeft: 6 },
], 'https://tanym.kz');
expect(mail5.text.includes('через 5 дней') && mail5.subject.includes('2 ваших события'), 'письмо: «через 5 дней», «2 ваших события»');
expect(!mail.html.includes('<script>') && !mail.html.includes('<b>Айгерим'), 'письмо экранирует имя и название');
expect(mail.subject.startsWith('Завтра'), 'тема письма за 1 день — «Завтра…»');
expect(mail.text.includes('https://tanym.kz/events/e1'), 'в письме ссылка на событие');
expect(!isDisabledPath('/api/cron/deadline-reminders'), 'крон напоминаний не закрыт пилотом');

/* Файл календаря: дата дедлайна, сигнал за сутки, экранирование. */
const ics = deadlineIcs({ id: 'e1', title: 'Олимпиада; этап, 1', registrationDeadline: '2026-12-31' }, 'https://tanym.kz/events/e1');
expect(ics.includes('DTSTART;VALUE=DATE:20261231') && ics.includes('DTEND;VALUE=DATE:20270101'), 'ics: событие на весь день дедлайна');
expect(ics.includes('TRIGGER:-P1D'), 'ics: сигнал за сутки');
expect(ics.includes('Олимпиада\\; этап\\, 1'), 'ics: ; и , экранированы');

/* Дайджест: закрывающееся важнее нового, прошедшее не попадает, класс фильтрует. */
const dToday = '2026-10-12';
const dEvents = [
  { id: 'soon', title: 'Скоро', organizer: 'РНПЦ', registrationDeadline: '2026-10-20', publishedAt: '2026-10-10T08:00:00Z', grades: [] },
  { id: 'fresh', title: 'Новое', organizer: '', registrationDeadline: '2026-12-01', publishedAt: '2026-10-09T08:00:00Z', grades: [9, 10] },
  { id: 'old', title: 'Старое', organizer: '', registrationDeadline: '2026-12-15', publishedAt: '2026-09-01T08:00:00Z', grades: [] },
  { id: 'past', title: 'Прошло', organizer: '', registrationDeadline: '2026-10-01', publishedAt: '2026-10-11T08:00:00Z', grades: [] },
];
const dAll = pickDigest(dEvents, dToday);
expect(dAll.closing.map((e) => e.id).join() === 'soon', 'дайджест: «закрывается» — только в окне 14 дней');
expect(dAll.opened.map((e) => e.id).join() === 'fresh', 'дайджест: «открылось» — за неделю, без дублей и прошедших');
expect(pickDigest(dEvents, dToday, 7).opened.length === 0, 'дайджест: событие для 9–10 класса не уходит семикласснику');
const dMail = buildDigestEmail('Айгерим', dAll, dToday, 'https://tanym.kz');
expect(dMail.text.includes('https://tanym.kz/events/soon') && dMail.subject.includes('закрывается'), 'письмо дайджеста со ссылками и темой');
const dTg = buildTelegramDigest({ opened: [{ ...dEvents[1], title: 'A <b>&' }], closing: [] }, dToday, 'https://tanym.kz');
expect(dTg.includes('A &lt;b&gt;&amp;') && !dTg.includes('A <b>&'), 'Telegram: название экранировано');

expect(weekStartIso('2026-11-02') === '2026-11-02' && weekStartIso('2026-11-04') === '2026-11-02' && weekStartIso('2026-11-08') === '2026-11-02', 'дайджест: ключ недели — её понедельник');

for (const sneaky of ['/api/ai/%63hat', '/API/topics', '/Achievements', '/achievements//x', '/api/%73ync']) {
  expect(isDisabledPath(sneaky), `закрытый раздел не обходится записью «${sneaky}»`);
}
expect(!isDisabledPath('/events/%D1%82%D0%B5%D1%81%D1%82'), 'кодированный путь открытого раздела не закрывается');

expect(parseGrades('9-11').join() === '9,10,11' && parseGrades('9–11').join() === '9,10,11', 'классы: диапазон «9-11» и «9–11»');
expect(parseGrades('5, 6 7;8').join() === '5,6,7,8' && parseGrades('0, 12, abc').length === 0, 'классы: списки и мусор');

/* Пароль: длина, простые шаблоны, совпадение с почтой; разбор ответа HIBP. */
expect(passwordProblem('a'.repeat(MIN_PASSWORD_LENGTH - 1)) === 'short', 'пароль: короткий отбивается');
for (const weak of ['11111111', '12345678', 'qwertyuiop', 'abcdefgh', 'Пароль2026!', 'kitap-2026!']) {
  expect(passwordProblem(weak) === 'classes', `пароль: «${weak}» без всех четырёх наборов отбивается`);
}
expect(passwordProblem('Aigerim2010!', 'aigerim@mail.kz') === 'simple', 'пароль: логин почты внутри пароля отбивается');
expect(passwordProblem('Kitap-Oqu-2026') === null, 'пароль: нормальный пароль проходит');
expect(pwnedCountFromRange('0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n1E4C9B93F3F0682250B6CF8331B7EE68FD8:3861493', '1e4c9b93f3f0682250b6cf8331b7ee68fd8') === 3861493, 'HIBP: найденный хвост хеша');
expect(pwnedCountFromRange('0018A45C4D1DEF81644B54AB7F969B88D65:1', 'FFFF') === 0, 'HIBP: отсутствующий хвост — 0');
expect(buildCsp('n').includes('https://api.pwnedpasswords.com'), 'CSP пускает проверку пароля по утечкам');

/* Возврат после входа: только внутренние пути. */
expect(safeNextPath('/events/abc?x=1') === '/events/abc?x=1', 'redirect: внутренний путь проходит');
for (const bad of ['//evil.com', '/\\evil.com', '/\t/evil.com', 'https://evil.com', 'javascript:alert(1)', '']) {
  expect(safeNextPath(bad, '/dashboard') === '/dashboard', `redirect: «${JSON.stringify(bad)}» отбивается`);
}

if (problems.length > 0) {
  console.error('✗ Проверка пилота не прошла:');
  for (const problem of problems) console.error('  - ' + problem);
  process.exit(1);
}

console.log('✓ пилот: лишние разделы закрыты, CSP строгая, ближайший дедлайн выбирается верно');
