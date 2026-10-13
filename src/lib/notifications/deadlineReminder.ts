/**
 * Напоминания о дедлайне регистрации — чистая логика без сети и базы.
 *
 * Афиша решает проблему «узнал слишком поздно», только если ученик снова
 * про неё вспомнит. Поэтому тем, кто сохранил событие, но ещё не отметил
 * «Я подал заявку», уходит письмо за 7 дней и за 1 день до конца
 * регистрации. Сам крон — src/app/api/cron/deadline-reminders/route.ts.
 *
 * Модуль без зависимостей: его проверяет scripts/test-pilot.mjs.
 */

import { daysBetween } from '../date';

export type ReminderKind = 'd7' | 'd1';

/** За сколько дней до дедлайна какое напоминание уходит. */
export const REMINDER_DAYS: Record<ReminderKind, number> = { d7: 7, d1: 1 };

/** Какое напоминание положено сегодня по этому дедлайну, или null. */
export function reminderKindFor(deadlineIso: string, todayIso: string): ReminderKind | null {
  const days = daysBetween(todayIso, deadlineIso);
  if (days === REMINDER_DAYS.d7) return 'd7';
  if (days === REMINDER_DAYS.d1) return 'd1';
  return null;
}

/** Дата через n дней в формате ГГГГ-ММ-ДД (полдень по Астане — без сдвига суток). */
export function addDaysIso(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T12:00:00+05:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface ReminderItem {
  eventId: string;
  title: string;
  deadlineIso: string;
  kind: ReminderKind;
}

function formatDateRu(dateIso: string): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Asia/Almaty' }).format(
    new Date(`${dateIso}T12:00:00+05:00`),
  );
}

/**
 * Одно письмо на ученика, даже если дедлайнов несколько: пять писем в день
 * от одной афиши — верный путь в спам и к отписке.
 */
export function buildReminderEmail(
  name: string,
  items: ReminderItem[],
  siteUrl: string,
): { subject: string; html: string; text: string } {
  const urgent = items.some((item) => item.kind === 'd1');
  const first = items[0];
  const subject =
    items.length === 1
      ? `${urgent ? 'Завтра' : 'Через неделю'} закрывается регистрация: ${first.title}`
      : `Скоро закрывается регистрация на ${items.length} ваших события`;

  const greeting = name ? `${name}, привет!` : 'Привет!';
  const lines = items.map((item) => {
    const when = item.kind === 'd1' ? 'завтра' : 'через 7 дней';
    return {
      text: `• ${item.title} — регистрация до ${formatDateRu(item.deadlineIso)} (${when}): ${siteUrl}/events/${item.eventId}`,
      html: `<li style="margin:0 0 12px"><a href="${escapeHtml(`${siteUrl}/events/${item.eventId}`)}" style="color:#1d1b19;font-weight:600">${escapeHtml(item.title)}</a><br><span style="color:#6b655e">регистрация до ${escapeHtml(formatDateRu(item.deadlineIso))} — ${when}</span></li>`,
    };
  });

  const settingsUrl = `${siteUrl}/profile?tab=settings`;
  const text = [
    greeting,
    '',
    'Вы сохранили эти события в Taným, но ещё не отметили, что подали заявку:',
    ...lines.map((line) => line.text),
    '',
    'Уже подали? Откройте событие и нажмите «Я подал заявку» — напоминаний больше не будет.',
    `Отключить напоминания: ${settingsUrl}`,
  ].join('\n');

  const html = `<!doctype html><html lang="ru"><body style="margin:0;background:#faf9f7;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1d1b19">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<p style="font-size:13px;color:#d85f2e;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin:0 0 12px">Taným · напоминание</p>
<p style="font-size:16px;margin:0 0 12px">${escapeHtml(greeting)}</p>
<p style="font-size:15px;line-height:1.5;margin:0 0 16px">Вы сохранили эти события, но ещё не отметили, что подали заявку:</p>
<ul style="padding-left:18px;font-size:15px;line-height:1.45;margin:0 0 20px">${lines.map((line) => line.html).join('')}</ul>
<p style="font-size:14px;line-height:1.5;color:#6b655e;margin:0 0 24px">Уже подали? Откройте событие и нажмите «Я подал заявку» — напоминаний по нему больше не будет.</p>
<p style="font-size:12px;color:#a59e96;margin:0"><a href="${escapeHtml(settingsUrl)}" style="color:#a59e96">Отключить напоминания</a></p>
</div></body></html>`;

  return { subject, html, text };
}
