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
import { buildDigestEmail, buildTelegramDigest, pickDigest, weekStartIso, type DigestEvent } from '@/lib/notifications/digest';
import {
  SITE_URL,
  confirmedEmails,
  cronAuthorized,
  emailEnabled,
  postToTelegram,
  sendEmailBatches,
  type OutgoingEmail,
} from '@/lib/notifications/server';

export const dynamic = 'force-dynamic';
/** Пакеты по 100 писем; минута с запасом покрывает тысячи учеников. */
export const maxDuration = 60;

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

  // Ключ недели — её понедельник по Астане: перезапуск во вторник не начнёт «новую неделю».
  const week = weekStartIso(today);

  // Письма: ученики, не выключившие учебные письма, ещё не получившие дайджест этой недели.
  // Постранично: PostgREST отдаёт не больше 1000 строк за запрос.
  const students = await readAll<{ id: string; name: string | null; grade: number | null; notify_learning: boolean | null }>(
    (from, to) => admin.from('profiles').select('id, name, grade, notify_learning').eq('role', 'student').order('id').range(from, to),
  );
  const already = await readAll<{ user_id: string }>((from, to) =>
    admin.from('weekly_digests').select('user_id').eq('week_start', week).order('user_id').range(from, to),
  );
  if (!students || !already) {
    return NextResponse.json({ error: 'read_failed' }, { status: 500 });
  }
  const skip = new Set(already.map((row) => row.user_id));

  // Канал — общая подборка без класса, один пост на неделю (журнал digest_posts).
  const common = pickDigest(events, today);
  let telegram: 'sent' | 'skipped' | 'failed' | 'already' = 'skipped';
  if (common.opened.length + common.closing.length > 0) {
    const { data: posted } = await admin.from('digest_posts').select('week_start').eq('week_start', week).maybeSingle();
    if (posted) {
      telegram = 'already';
    } else {
      telegram = await postToTelegram(buildTelegramDigest(common, today, SITE_URL), LOG);
      if (telegram === 'sent') await admin.from('digest_posts').insert({ week_start: week });
    }
  }

  const candidates = students.filter((row) => row.notify_learning !== false && !skip.has(row.id));
  const emails = await confirmedEmails(admin, candidates.map((row) => row.id as string), LOG);

  const dryRun = !emailEnabled();
  const outgoing: (OutgoingEmail & { userId: string })[] = [];

  for (const student of candidates) {
    const email = emails.get(student.id);
    if (!email) continue;
    const digest = pickDigest(events, today, (student.grade as number | null) ?? null);
    if (digest.opened.length + digest.closing.length === 0) continue;
    const message = buildDigestEmail(String(student.name ?? '').split(' ')[0], digest, today, SITE_URL);
    outgoing.push({ ...message, to: email, userId: student.id as string });
  }

  const sent = dryRun
    ? outgoing.length
    : await sendEmailBatches(outgoing, LOG, async (batch) => {
        const { error: logError } = await admin
          .from('weekly_digests')
          .upsert(batch.map((item) => ({ user_id: item.userId, week_start: week })), { ignoreDuplicates: true });
        if (logError) console.error(`${LOG} журнал:`, logError);
      });

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

/** Все строки по страницам по 1000; null — если хоть одна страница не прочиталась. */
async function readAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>,
): Promise<T[] | null> {
  const rows: T[] = [];
  for (let from = 0; from < 50_000; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) {
      console.error(`${LOG} чтение:`, error);
      return null;
    }
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}
