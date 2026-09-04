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
  // Отдельный вход для внешних центров: организация приходит по ссылке
  // со страницы «Для учебных центров» и сессии у неё, разумеется, нет.
  '/register/center',
  '/forgot-password',
  '/reset-password',
  '/for-schools',
  '/for-centers',
]);

/**
 * Префиксы, которые обязаны работать до появления сессии.
 *
 * /auth/callback — точка возврата OAuth, вызывается ровно тогда, когда
 * сессии ещё нет. /api/profile — его дёргает сам провайдер авторизации
 * со страниц входа, и он корректно отвечает {profile: null} гостю.
 */
const PUBLIC_PREFIXES = ['/auth/callback', '/api/profile'];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function proxy(request: NextRequest) {
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

  const { pathname, search } = request.nextUrl;

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
