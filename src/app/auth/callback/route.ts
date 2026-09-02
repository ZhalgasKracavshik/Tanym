/**
 * Точка возврата по ссылке из письма и после входа через Google.
 *
 * Почему обмен кода на сессию обязан происходить здесь, а не на странице.
 * Сессия хранится в куках, а куки ставит сервер. Если бы код менялся в
 * браузере, то первый — серверный — рендер страницы сессии ещё не видел
 * и успевал показать «ссылка устарела» до того, как обмен вообще начался.
 * Ровно это и происходило при сбросе пароля: письмо вело прямо на
 * /reset-password, и страница выносила вердикт на первом же кадре.
 *
 * Сюда приходят три разных вида ссылок, и все три нужно разобрать:
 *   ?code=…                     — обычный обмен (вход через Google, сброс пароля)
 *   ?token_hash=…&type=recovery — одноразовый код из письма
 *   ?error=…&error_code=…       — Supabase уже отказал (ссылку открыли повторно
 *                                 или она просрочена)
 */

import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/** Пускаем только внутренние пути: иначе ссылка из письма уводила бы на чужой сайт. */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/';
  return raw;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNext(searchParams.get('next'));

  /*
    Отказ от Supabase пробрасываем как есть.

    Самая частая причина — ссылку уже открывали: одноразовый код сгорает
    при первом переходе, а по нему успевают пройти сканеры ссылок в почте.
    Человеку про это надо сказать прямо, а не общей фразой «что-то не так».
  */
  const errorCode = searchParams.get('error_code') ?? searchParams.get('error');
  if (errorCode) {
    return NextResponse.redirect(`${origin}${next}?authError=${encodeURIComponent(errorCode)}`);
  }

  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  if (!code && !tokenHash) {
    return NextResponse.redirect(`${origin}${next}?authError=missing_code`);
  }

  const supabase = await createClient();

  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: type ?? 'email' });

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}${next}?authError=exchange_failed`);
  }

  /*
    Проверка школьного домена — только для входа, не для восстановления
    пароля.

    Аккаунт при восстановлении уже существует, и его почта была принята при
    регистрации. Прогонять её через список ещё раз значит запереть человека
    снаружи от собственного аккаунта из-за правила, введённого после того,
    как он зарегистрировался.
  */
  if (type === 'recovery' || next.startsWith('/reset-password')) {
    return NextResponse.redirect(`${origin}${next}`);
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
