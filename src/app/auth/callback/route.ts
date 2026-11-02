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
import { safeNextPath } from '@/lib/security/redirect';

/** Пускаем только внутренние пути: иначе ссылка из письма уводила бы на чужой сайт. */
const safeNext = (raw: string | null) => safeNextPath(raw, '/');

/** Код ошибки добавляется к адресу правильно, даже если в next уже есть «?». */
function redirectWithError(origin: string, next: string, code: string) {
  const target = new URL(next, origin);
  target.searchParams.set('authError', code);
  return NextResponse.redirect(target);
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
    return redirectWithError(origin, next, errorCode);
  }

  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  if (!code && !tokenHash) {
    return redirectWithError(origin, next, 'missing_code');
  }

  const supabase = await createClient();

  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: type ?? 'email' });

  if (error || !data.user) {
    return redirectWithError(origin, next, 'exchange_failed');
  }

  /*
    Проверки школьного домена здесь больше нет: на пилоте регистрация
    открыта для любой почты (миграция pilot_open_student_registration), а
    роль учителя выдаёт только админ. Старая проверка разлогинивала всех,
    у кого почта не из списка, — в том числе входящих через Google.
  */
  return NextResponse.redirect(`${origin}${next}`);
}
