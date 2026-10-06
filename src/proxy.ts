/**
 * Обновляет сессию Supabase и закрывает продукт от неавторизованных.
 *
 * Две задачи в одном месте намеренно. Обновление токена нужно на каждом
 * запросе (иначе access-токен протухает через час, а сервер продолжает
 * считать пользователя вошедшим), а проверка доступа обязана стоять там же,
 * где уже известен пользователь.
 *
 * Почему проверка здесь, а не на каждой странице: middleware — единственная
 * точка, через которую проходят все маршруты. Проверки на страницах
 * забываются при добавлении новой страницы, и новая страница по умолчанию
 * оказывается открытой. Здесь по умолчанию закрыто всё, а исключения
 * перечислены явным списком ниже.
 */

import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { isDisabledPath } from '@/lib/pilot';
import { buildCsp, generateNonce } from '@/lib/security/csp';
import { checkWriteRateLimit } from '@/lib/security/rate-limit';

/**
 * Страницы, доступные без входа.
 *
 * Лендинг и экраны входа — очевидно. Страницы для школ и центров тоже:
 * это B2B-предложение о сотрудничестве, и требовать от директора школы
 * регистрацию, чтобы прочитать, что мы предлагаем, — значит потерять его
 * на первом же шаге.
 */
const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/for-schools',
  // Что хранится об ученике — читают до регистрации, значит без сессии.
  '/privacy',
]);

/**
 * Префиксы, которые обязаны работать до появления сессии.
 *
 * /auth/callback — точка возврата OAuth, вызывается ровно тогда, когда
 * сессии ещё нет. /api/profile — его дёргает сам провайдер авторизации
 * со страниц входа, и он корректно отвечает {profile: null} гостю.
 */
const PUBLIC_PREFIXES = ['/auth/callback', '/api/profile', '/api/csp-report'];

/**
 * Афиша открыта гостям: ссылку на олимпиаду пересылают в чат класса, и
 * требовать вход, чтобы увидеть срок, значит потерять человека на первом
 * шаге. Открыт список и страницы событий, но не форма публикации.
 * В базе гостю видны только одобренные события (pilot_public_events).
 */
function isPublicEventsPath(pathname: string): boolean {
  if (pathname === '/events') return true;
  return /^\/events\/[0-9a-f-]{36}$/i.test(pathname);
}

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (isPublicEventsPath(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** Методы, которые что-то меняют: на них действует ограничитель частоты. */
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  /*
    Разделы, выключенные на пилот (см. lib/pilot.ts), отвечают 404 до
    любой другой работы — и гостю, и вошедшему. Не редирект на главную:
    иначе закрытый раздел выглядел бы как поломка навигации.
  */
  if (isDisabledPath(pathname)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.rewrite(new URL('/_pilot-disabled', request.url), { status: 404 });
  }

  if (pathname.startsWith('/api/') && WRITE_METHODS.has(request.method)) {
    const verdict = await checkWriteRateLimit(request);
    if (!verdict.allowed) {
      return NextResponse.json(
        { error: 'rate_limited' },
        { status: 429, headers: { 'Retry-After': String(verdict.retryAfterSeconds) } }
      );
    }
  }

  /*
    CSP с nonce: политика уходит и в заголовок запроса (по нему Next.js
    ставит nonce своим скриптам при рендере), и в ответ (её исполняет
    браузер). Подробности — в lib/security/csp.ts.
  */
  const nonce = generateNonce();
  const csp = buildCsp(nonce);
  request.headers.set('x-nonce', nonce);
  request.headers.set('content-security-policy', csp);

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic(pathname)) {
    /*
      API отвечает кодом, а не редиректом. Клиентский fetch() молча пошёл бы
      по 302 на HTML-страницу входа и упал бы уже на разборе JSON — ошибка
      выглядела бы как «сломался парсинг», а не «нужно войти».
    */
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname + search);
    const redirect = NextResponse.redirect(loginUrl);

    /*
      Куки, обновлённые выше, нужно перенести руками: NextResponse.redirect
      создаёт новый объект ответа, и свежий токен, выданный на этом же
      запросе, иначе потерялся бы — пользователь получил бы разлогинивание
      ровно в тот момент, когда токен успешно обновился.
    */
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  response.headers.set('Content-Security-Policy', csp);
  return response;
}

/*
  Статические файлы проходят мимо проверки.

  В списке исключений были только картинки, и всё остальное из public
  попадало в middleware наравне со страницами: гостю вместо файла уходил
  редирект на /login, то есть HTML. На звуке клавиатуры это выражалось в
  «Unable to decode audio data» — декодер получал разметку страницы вместо
  wav. Заодно снимается лишняя проверка сессии на каждый шрифт и значок.
*/
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|wav|mp3|ogg|m4a|woff|woff2|ttf|otf|webmanifest|txt|xml)$).*)',
  ],
};
