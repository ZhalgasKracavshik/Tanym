/**
 * Supabase-клиент для браузера.
 *
 * Используется только двумя вещами, которым нужен настоящий аккаунт:
 * вход учителя, чтобы опубликовать материал архива, и публикация учеником
 * своего достижения с фото. Весь остальной прогресс ученика по-прежнему
 * живёт в localStorage — переносить его в базу здесь не нужно.
 */

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
