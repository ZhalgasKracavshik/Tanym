/**
 * Точка возврата после входа через Google.
 *
 * Supabase перенаправляет сюда с одноразовым кодом. Меняем код на сессию,
 * затем проверяем домен почты: если он не из allowed_school_domains, сессия
 * тут же уничтожается. Это дублирует проверку на уровне базы (RLS на
 * profiles), но здесь она даёт мгновенное и понятное сообщение вместо того,
 * чтобы ученик пытался опубликовать пост и получил глухую ошибку insert.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (!code) {
    return NextResponse.redirect(`${origin}${next}?authError=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}${next}?authError=exchange_failed`);
  }

  const email = data.user.email ?? '';
  const { data: allowed } = await supabase
    .from('allowed_school_domains')
    .select('domain')
    .then(({ data }) => ({
      data: (data ?? []).some((row) => email.toLowerCase().endsWith(`@${row.domain}`)),
    }));

  if (!allowed) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}${next}?authError=wrong_domain`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
