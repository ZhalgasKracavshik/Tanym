/**
 * GET /api/cron/weekly-digest — дайджест афиши по понедельникам.
 *
 * Vercel Cron (vercel.json, 03:00 UTC понедельника = 09:00 по Астане).
 * Одна подборка уходит в Telegram-канал (для всех), и каждому ученику —
 * письмо с событиями под его класс. Пустую подборку не отправляем: письмо
 * «на этой неделе ничего» учит не открывать следующие.
 *
 * Защита и повторы — как у deadline-reminders: CRON_SECRET, журнал
 * weekly_digests (одно письмо на ученика в неделю), без RESEND_API_KEY —
 * вхолостую.
 */

import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { almatyDateIso } from '@/lib/date';
import { buildDigestEmail, buildTelegramDigest, pickDigest, type DigestEvent } from '@/lib/notifications/digest';
import {
  SITE_URL,
  confirmedEmails,
  cronAuthorized,
  emailEnabled,
  postToTelegram,
  sendEmail,
} from '@/lib/notifications/server';

export const dynamic = 'force-dynamic';

const LOG = '[weekly-digest]';

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    console.error(`${LOG} CRON_SECRET не задан`);
    return NextResponse.json({ error: 'cron_not_configured' }, { status: 500 });
  }
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const admin = adminClient();
  if (!admin) return NextResponse.json({ error: 'service_role_missing' }, { status: 500 });

  const today = almatyDateIso();

  const { data: rows, error } = await admin
    .from('published_events')
    .select('id, title, organizer, registration_deadline, grades, created_at, reviewed_at')
    .eq('status', 'approved')
    .gte('registration_deadline', today);
  if (error) {
    console.error(`${LOG} события:`, error);
    return NextResponse.json({ error: 'events_failed' }, { status: 500 });
  }

  const events: DigestEvent[] = (rows ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title),
    organizer: String(row.organizer ?? ''),
    registrationDeadline: String(row.registration_deadline).slice(0, 10),
    publishedAt: String(row.reviewed_at ?? row.created_at),
    grades: (row.grades as number[] | null) ?? [],
  }));

  // Канал — общая подборка без фильтра по классу.
  const common = pickDigest(events, today);
  const telegram =
    common.opened.length + common.closing.length > 0
      ? await postToTelegram(buildTelegramDigest(common, today, SITE_URL), LOG)
      : 'skipped';

  // Письма: ученики, не выключившие учебные письма, ещё не получившие дайджест этой недели.
  const { data: students } = await admin
    .from('profiles')
    .select('id, name, grade, notify_learning')
    .eq('role', 'student');
  const { data: already } = await admin.from('weekly_digests').select('user_id').eq('week_start', today);
  const skip = new Set((already ?? []).map((row) => row.user_id as string));

  const candidates = (students ?? []).filter((row) => row.notify_learning !== false && !skip.has(row.id));
  const emails = await confirmedEmails(admin, candidates.map((row) => row.id as string), LOG);

  const dryRun = !emailEnabled();
  let sent = 0;
  const log: { user_id: string; week_start: string }[] = [];

  for (const student of candidates) {
    const email = emails.get(student.id);
    if (!email) continue;
    const digest = pickDigest(events, today, (student.grade as number | null) ?? null);
    if (digest.opened.length + digest.closing.length === 0) continue;

    const message = buildDigestEmail(String(student.name ?? '').split(' ')[0], digest, today, SITE_URL);
    if (dryRun) {
      sent += 1;
      continue;
    }
    if (await sendEmail(email, message, LOG)) {
      sent += 1;
      log.push({ user_id: student.id, week_start: today });
    }
  }

  if (log.length > 0) {
    const { error: logError } = await admin.from('weekly_digests').upsert(log, { ignoreDuplicates: true });
    if (logError) console.error(`${LOG} журнал:`, logError);
  }

  console.log(`${LOG} ${today}: ${dryRun ? 'dry-run, ' : ''}${sent} писем, Telegram: ${telegram}`);
  return NextResponse.json({
    date: today,
    dryRun,
    sent,
    telegram,
    opened: common.opened.length,
    closing: common.closing.length,
  });
}
