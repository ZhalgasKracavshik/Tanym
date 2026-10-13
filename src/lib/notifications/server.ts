/**
 * Серверные части рассылок, общие для кронов: проверка секрета, отправка
 * письма через Resend, адреса учеников и пост в Telegram-канал.
 *
 * Только для серверных роутов: модуль читает секреты из окружения.
 */

import { timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tanym-alpha.vercel.app').replace(/\/+$/, '');

/** Authorization: Bearer <CRON_SECRET>, сравнение без утечки по времени. */
export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const provided = Buffer.from(request.headers.get('authorization') ?? '');
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

/** Без ключа Resend кроны работают вхолостую: считают, но не отправляют. */
export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(
  to: string,
  message: { subject: string; html: string; text: string },
  logPrefix: string,
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? 'Taným <onboarding@resend.dev>',
        to: [to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
    if (!response.ok) {
      console.error(`${logPrefix} Resend отказал:`, response.status, await response.text().catch(() => ''));
    }
    return response.ok;
  } catch (error) {
    console.error(`${logPrefix} Resend недоступен:`, error);
    return false;
  }
}

/**
 * Подтверждённые адреса для набора учеников. Почта живёт в auth.users,
 * поэтому постранично через admin API, пока не найдём всех. Неподтверждённым
 * адресам не пишем: это может быть чужая почта.
 */
export async function confirmedEmails(
  admin: SupabaseClient,
  userIds: Iterable<string>,
  logPrefix: string,
): Promise<Map<string, string>> {
  const wanted = new Set(userIds);
  const emails = new Map<string, string>();
  for (let page = 1; page <= 10 && emails.size < wanted.size; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      console.error(`${logPrefix} listUsers:`, error);
      break;
    }
    for (const user of data.users) {
      if (wanted.has(user.id) && user.email && user.email_confirmed_at) emails.set(user.id, user.email);
    }
    if (data.users.length < 1000) break;
  }
  return emails;
}

/**
 * Пост в Telegram-канал от имени бота. Канал не требует привязки аккаунта:
 * подписаться может любой, и это самый дешёвый способ вернуть ученика раз в
 * неделю (вердикт совета). Без TELEGRAM_BOT_TOKEN/TELEGRAM_CHANNEL_ID — пропуск.
 */
export async function postToTelegram(html: string, logPrefix: string): Promise<'sent' | 'skipped' | 'failed'> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const channel = process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !channel) return 'skipped';
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: channel, text: html, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    if (!response.ok) {
      console.error(`${logPrefix} Telegram отказал:`, response.status, await response.text().catch(() => ''));
      return 'failed';
    }
    return 'sent';
  } catch (error) {
    console.error(`${logPrefix} Telegram недоступен:`, error);
    return 'failed';
  }
}
