/**
 * GET /api/cron/deadline-reminders — ежедневные напоминания о дедлайнах.
 *
 * Запускается Vercel Cron (vercel.json, 03:00 UTC = 09:00 по Астане).
 * Кому пишем: тем, у кого событие в «Моих событиях» со статусом «сохранено»
 * (заявку ещё не подал), за 7 дней и за 1 день до конца регистрации, если
 * ученик не выключил учебные напоминания в профиле.
 *
 * Защита: заголовок Authorization: Bearer <CRON_SECRET> — Vercel Cron
 * отправляет его сам, когда переменная задана. Без секрета роут не работает
 * вовсе: иначе любой мог бы рассылать письма нашим ученикам.
 *
 * Повтор безопасен: каждое отправленное напоминание пишется в
 * deadline_reminders, и второй запуск в тот же день его пропустит.
 * Без RESEND_API_KEY письма не уходят и в журнал ничего не пишется —
 * ответ показывает, что было бы отправлено (удобно проверить вручную).
 */

import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { adminClient } from '@/lib/supabase/admin';
import { almatyDateIso } from '@/lib/date';
import {
  addDaysIso,
  buildReminderEmail,
  reminderKindFor,
  type ReminderItem,
} from '@/lib/notifications/deadlineReminder';

export const dynamic = 'force-dynamic';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tanym-alpha.vercel.app').replace(/\/+$/, '');

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const provided = Buffer.from(request.headers.get('authorization') ?? '');
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? 'Taným <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
        text,
      }),
    });
    if (!response.ok) {
      console.error('[deadline-reminders] Resend отказал:', response.status, await response.text().catch(() => ''));
    }
    return response.ok;
  } catch (error) {
    console.error('[deadline-reminders] Resend недоступен:', error);
    return false;
  }
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    console.error('[deadline-reminders] CRON_SECRET не задан');
    return NextResponse.json({ error: 'cron_not_configured' }, { status: 500 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = adminClient();
  if (!admin) {
    return NextResponse.json({ error: 'service_role_missing' }, { status: 500 });
  }

  const today = almatyDateIso();
  const targetDates = [addDaysIso(today, 7), addDaysIso(today, 1)];

  const { data: events, error: eventsError } = await admin
    .from('published_events')
    .select('id, title, registration_deadline')
    .eq('status', 'approved')
    .in('registration_deadline', targetDates);
  if (eventsError) {
    console.error('[deadline-reminders] события:', eventsError);
    return NextResponse.json({ error: 'events_failed' }, { status: 500 });
  }
  if (!events?.length) return NextResponse.json({ date: today, sent: 0, recipients: 0 });

  const eventById = new Map(events.map((event) => [event.id as string, event]));
  const eventIds = [...eventById.keys()];

  const [{ data: saves }, { data: alreadySent }] = await Promise.all([
    admin.from('event_saves').select('user_id, event_id').in('event_id', eventIds).eq('status', 'saved'),
    admin.from('deadline_reminders').select('user_id, event_id, kind').in('event_id', eventIds),
  ]);

  const sentKey = (userId: string, eventId: string, kind: string) => `${userId}:${eventId}:${kind}`;
  const sent = new Set((alreadySent ?? []).map((row) => sentKey(row.user_id, row.event_id, row.kind)));

  // Ученик → список событий, по которым сегодня положено напоминание.
  const pending = new Map<string, ReminderItem[]>();
  for (const save of saves ?? []) {
    const event = eventById.get(save.event_id);
    if (!event) continue;
    const kind = reminderKindFor(String(event.registration_deadline).slice(0, 10), today);
    if (!kind || sent.has(sentKey(save.user_id, save.event_id, kind))) continue;
    const list = pending.get(save.user_id) ?? [];
    list.push({
      eventId: save.event_id,
      title: String(event.title),
      deadlineIso: String(event.registration_deadline).slice(0, 10),
      kind,
    });
    pending.set(save.user_id, list);
  }
  if (pending.size === 0) return NextResponse.json({ date: today, sent: 0, recipients: 0 });

  // Уважаем выключенные напоминания и берём имя для обращения.
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, name, notify_learning')
    .in('id', [...pending.keys()]);
  const profileById = new Map((profiles ?? []).map((row) => [row.id as string, row]));

  // Почта живёт в auth.users: постранично, пока не найдём всех адресатов.
  const emailById = new Map<string, string>();
  for (let page = 1; page <= 10 && emailById.size < pending.size; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      console.error('[deadline-reminders] listUsers:', error);
      break;
    }
    for (const user of data.users) {
      if (pending.has(user.id) && user.email && user.email_confirmed_at) emailById.set(user.id, user.email);
    }
    if (data.users.length < 1000) break;
  }

  const dryRun = !process.env.RESEND_API_KEY;
  let sentCount = 0;
  const log: { user_id: string; event_id: string; kind: string }[] = [];

  for (const [userId, items] of pending) {
    const profile = profileById.get(userId);
    const email = emailById.get(userId);
    if (!profile || profile.notify_learning === false || !email) continue;

    const firstName = String(profile.name ?? '').split(' ')[0];
    const message = buildReminderEmail(firstName, items, SITE_URL);
    if (dryRun) {
      sentCount += 1;
      continue;
    }
    if (await sendEmail(email, message.subject, message.html, message.text)) {
      sentCount += 1;
      for (const item of items) log.push({ user_id: userId, event_id: item.eventId, kind: item.kind });
    }
  }

  if (log.length > 0) {
    const { error } = await admin.from('deadline_reminders').upsert(log, { ignoreDuplicates: true });
    if (error) console.error('[deadline-reminders] журнал:', error);
  }

  console.log(`[deadline-reminders] ${today}: ${dryRun ? 'dry-run, ' : ''}${sentCount} писем`);
  return NextResponse.json({ date: today, dryRun, sent: sentCount, recipients: pending.size });
}
