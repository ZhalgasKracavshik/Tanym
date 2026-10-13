/**
 * Еженедельный дайджест: «Открылось за неделю» и «Закрывается в ближайшие
 * 14 дней». Чистая логика без сети и базы — её проверяет scripts/test-pilot.mjs.
 *
 * Зачем. Дедлайны редкие: напоминание о сохранённом событии срабатывает
 * раз в несколько недель, и ученику не за чем возвращаться между ними.
 * Дайджест по понедельникам — регулярный повод открыть афишу (вердикт
 * совета 2026-10-06). Крон: src/app/api/cron/weekly-digest/route.ts.
 */

import { daysBetween } from '../date';
import { addDaysIso, escapeHtml } from './deadlineReminder';

export interface DigestEvent {
  id: string;
  title: string;
  organizer: string;
  registrationDeadline: string;
  /** Когда событие появилось в афише (одобрено или опубликовано админом). */
  publishedAt: string;
  grades: number[];
}

/** Сколько дней вперёд считается «скоро закрывается». */
export const CLOSING_WINDOW_DAYS = 14;

/**
 * Подборка на неделю. Событие попадает только в один список: свежее и уже
 * закрывающееся — в «Закрывается», это важнее. Только открытая регистрация.
 * С классом ученика — только подходящие ему (пустые grades = для всех).
 */
export function pickDigest(
  events: DigestEvent[],
  todayIso: string,
  grade: number | null = null,
): { opened: DigestEvent[]; closing: DigestEvent[] } {
  const weekAgo = addDaysIso(todayIso, -7);
  const fits = (event: DigestEvent) => !grade || event.grades.length === 0 || event.grades.includes(grade);
  const open = events.filter((event) => daysBetween(todayIso, event.registrationDeadline) >= 0 && fits(event));

  const closing = open
    .filter((event) => daysBetween(todayIso, event.registrationDeadline) <= CLOSING_WINDOW_DAYS)
    .sort((a, b) => a.registrationDeadline.localeCompare(b.registrationDeadline));
  const closingIds = new Set(closing.map((event) => event.id));

  const opened = open
    .filter((event) => !closingIds.has(event.id) && event.publishedAt.slice(0, 10) >= weekAgo)
    .sort((a, b) => a.registrationDeadline.localeCompare(b.registrationDeadline));

  return { opened, closing };
}

function formatDateRu(dateIso: string): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Asia/Almaty' }).format(
    new Date(`${dateIso}T12:00:00+05:00`),
  );
}

function daysWord(n: number): string {
  const lastTwo = n % 100;
  const last = n % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return 'дней';
  if (last === 1) return 'день';
  if (last >= 2 && last <= 4) return 'дня';
  return 'дней';
}

function whenText(deadlineIso: string, todayIso: string): string {
  const days = daysBetween(todayIso, deadlineIso);
  if (days === 0) return 'сегодня последний день';
  return `до ${formatDateRu(deadlineIso)}, осталось ${days} ${daysWord(days)}`;
}

export function buildDigestEmail(
  name: string,
  digest: { opened: DigestEvent[]; closing: DigestEvent[] },
  todayIso: string,
  siteUrl: string,
): { subject: string; html: string; text: string } {
  const { opened, closing } = digest;
  const subject = closing.length
    ? `На этой неделе закрывается регистрация: ${closing.length} ${closing.length === 1 ? 'событие' : 'события'}`
    : `В афише ${opened.length} новых ${opened.length === 1 ? 'событие' : 'события'}`;
  const greeting = name ? `${name}, привет!` : 'Привет!';
  const link = (event: DigestEvent) => `${siteUrl}/events/${event.id}`;

  const section = (title: string, items: DigestEvent[]) =>
    items.length === 0
      ? { html: '', text: [] as string[] }
      : {
          html: `<p style="font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b655e;margin:24px 0 8px">${escapeHtml(title)}</p><ul style="padding-left:18px;margin:0">${items
            .map(
              (event) =>
                `<li style="margin:0 0 12px;font-size:15px;line-height:1.45"><a href="${escapeHtml(link(event))}" style="color:#1d1b19;font-weight:600">${escapeHtml(event.title)}</a><br><span style="color:#6b655e">${escapeHtml(
                  [event.organizer, whenText(event.registrationDeadline, todayIso)].filter(Boolean).join(' · '),
                )}</span></li>`,
            )
            .join('')}</ul>`,
          text: [
            '',
            title.toUpperCase(),
            ...items.map((event) => `• ${event.title} — ${whenText(event.registrationDeadline, todayIso)}: ${link(event)}`),
          ],
        };

  const closingPart = section('Закрывается в ближайшие 2 недели', closing);
  const openedPart = section('Открылось за неделю', opened);
  const settingsUrl = `${siteUrl}/profile?tab=settings`;

  const text = [
    greeting,
    'Что важно на этой неделе в афише Taným:',
    ...closingPart.text,
    ...openedPart.text,
    '',
    `Вся афиша: ${siteUrl}/events`,
    `Отключить письма: ${settingsUrl}`,
  ].join('\n');

  const html = `<!doctype html><html lang="ru"><body style="margin:0;background:#faf9f7;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1d1b19">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<p style="font-size:13px;color:#d85f2e;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin:0 0 12px">Taným · неделя в афише</p>
<p style="font-size:16px;margin:0 0 4px">${escapeHtml(greeting)}</p>
<p style="font-size:15px;line-height:1.5;margin:0">Что важно на этой неделе:</p>
${closingPart.html}${openedPart.html}
<p style="margin:28px 0 24px"><a href="${escapeHtml(`${siteUrl}/events`)}" style="display:inline-block;background:#1d1b19;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:999px">Открыть афишу</a></p>
<p style="font-size:12px;color:#a59e96;margin:0"><a href="${escapeHtml(settingsUrl)}" style="color:#a59e96">Отключить письма</a></p>
</div></body></html>`;

  return { subject, html, text };
}

/** Пост для Telegram-канала: HTML-разметка Telegram (b, a), без класса. */
export function buildTelegramDigest(
  digest: { opened: DigestEvent[]; closing: DigestEvent[] },
  todayIso: string,
  siteUrl: string,
): string {
  const line = (event: DigestEvent) =>
    `• <a href="${escapeHtml(`${siteUrl}/events/${event.id}`)}">${escapeHtml(event.title)}</a> — ${escapeHtml(
      whenText(event.registrationDeadline, todayIso),
    )}`;
  const parts = ['<b>Неделя в афише Taným</b>'];
  if (digest.closing.length) parts.push('', '<b>⏳ Закрывается в ближайшие 2 недели</b>', ...digest.closing.map(line));
  if (digest.opened.length) parts.push('', '<b>🆕 Открылось за неделю</b>', ...digest.opened.map(line));
  parts.push('', `Вся афиша: ${escapeHtml(`${siteUrl}/events`)}`);
  return parts.join('\n');
}
