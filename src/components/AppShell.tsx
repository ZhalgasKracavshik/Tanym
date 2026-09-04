'use client';

/**
 * Развилка между лендингом и внутренними разделами.
 *
 * Лендинг — маркетинговая страница, ей нужна горизонтальная шапка. Внутренние
 * разделы (после онбординга) используют боковую навигацию, потому что пунктов
 * десять и вертикальный список читается без прокрутки.
 */

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SiteHeader } from './SiteHeader';
import { SiteSidebar } from './SiteSidebar';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { useStore } from './StoreProvider';
import { LandingAuthBanner } from './LandingAuthBanner';
import { MatrixLoader } from './MatrixLoader';

/**
 * Экраны без навигации приложения вообще.
 *
 * Экраны входа: боковое меню предлагает уйти в разделы, которые всё равно
 * потребуют аккаунта, а шапка лендинга уводит обратно на продажу продукта —
 * и то и другое мешает единственному действию на экране.
 *
 * B2B-лендинги для школ и центров (/for-schools, /for-centers): та же
 * логика, и вдобавок у них уже есть собственная мини-шапка внутри
 * PartnerPage, так что шапка продукта здесь была бы третьей подряд.
 */
/*
  Страницы без оболочки приложения.

  Сравнение точным совпадением пути не годилось: /register/center —
  отдельный маршрут, и на нём разворачивалось всё меню приложения, включая
  «Кабинет» и «Админ». Организация, пришедшая зарегистрироваться, видела
  чужую навигацию вокруг формы. Поэтому проверка по префиксу: у /register
  есть вложенные страницы, и у любой из них оболочки быть не должно.
*/
const SHELLESS_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/for-schools',
  '/for-centers',
  '/privacy',
];

/**
 * Регистрация считается незавершённой, пока у ученика нет класса обучения
 * и предметов.
 *
 * Это не произвольная планка: ровно на этих двух полях useEffectiveProfile
 * возвращает null, и кабинет, план и диагностика показывают «Профиль ещё
 * не создан». Код класса и цель в этот список не входят — их в мастере
 * разрешено отложить.
 *
 * Учителю и администратору эти поля не нужны вовсе: у них другие разделы.
 */
function needsOnboarding(profile: { role: string; grade: number | null; subject_ids: string[] | null } | null) {
  if (!profile) return false;

  /*
    Учителю нужен свой минимум — предметы, которые он ведёт. Без них панель
    класса открывается на первом предмете из общего списка, а не на его
    собственном. Класс обучения и цель у него не спрашиваются вовсе.
  */
  if (profile.role === 'teacher') return !profile.subject_ids?.length;

  if (profile.role !== 'student') return false;
  return profile.grade == null || !profile.subject_ids?.length;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, isSignedIn, profile } = useSchoolAuth();
  const { state, hydrated } = useStore();
  const isLanding = pathname === '/';

  /*
    Вошёл (например, через Google), но роль ещё не выбрана.
    Боковое меню в этот момент показывает десяток разделов, которые всё
    равно упрутся в ту же самую форму выбора роли — сбивает с единственного
    действия, которое нужно сделать прямо сейчас.
  */
  const pendingRoleChoice = !loading && isSignedIn && !profile;
  const isShellless = SHELLESS_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const onboardingPending = needsOnboarding(profile);

  /*
    Незавершённую регистрацию доводим до конца, а не пускаем гулять по
    разделам: половина из них всё равно упрётся в «Профиль ещё не создан».
    Редирект в эффекте, а не в теле — во время рендера роутер трогать нельзя.
  */
  useEffect(() => {
    if (loading || !hydrated) return;
    if (onboardingPending && pathname !== '/onboarding') {
      router.replace('/onboarding');
    }
  }, [loading, hydrated, onboardingPending, pathname, router]);

  if (isShellless) {
    return <main className="flex-1">{children}</main>;
  }

  if (isLanding) {
    return (
      <>
        <SiteHeader />
        <main className="flex-1">{children}</main>
      </>
    );
  }

  /*
    Экран загрузки на всю страницу вместо скелетонов по кускам.

    Данные приезжают из двух мест и не одновременно: профиль приходит с
    сервера вместе с разметкой, а прогресс лежит в localStorage и читается
    уже в браузере, после первого кадра. Из-за этого страница успевала
    показать цифры по умолчанию и через мгновение переписать их на
    настоящие — то самое мигание характеристик при жёсткой перезагрузке.
    Пока не готово и то и другое, показываем один спокойный индикатор.

    Лендинг и экраны входа сюда не попадают (обработаны выше): им ждать
    нечего, а маркетинговую страницу задерживать индикатором вредно.
  */
  if (!hydrated || loading) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <MatrixLoader variant="scan" rounded />
      </main>
    );
  }

  /*
    Роль ещё не выбрана: без бокового меню, а вместо того, что просила
    показать конкретная страница, — форма выбора роли.

    Раньше здесь рендерились просто children — предполагалось, что нужную
    форму покажет сама страница через SchoolAuthGate. На деле так устроены
    только несколько разделов (учителю, админка, публикация объявления);
    остальные страницы понятия не имеют о выборе роли и рендерили что-то
    своё — человек утыкался в пустой экран без бокового меню и без единого
    действия, которое можно было бы сделать. LandingAuthBanner — тот же
    компонент, что решает эту задачу на лендинге, и он написан так, чтобы
    работать сам по себе, без обвязки конкретной страницы.
  */
  if (pendingRoleChoice) {
    return (
      <main className="flex-1">
        <LandingAuthBanner language={state.language} />
      </main>
    );
  }

  /*
    Регистрация не доведена до конца — навигации нет вообще.

    Раньше меню в этот момент показывали, и человек уходил из мастера в
    разделы, которые без класса и предметов всё равно встречают его
    заглушкой «Профиль ещё не создан». Пока анкета не заполнена, на экране
    должен быть только мастер; редирект на него стоит выше.
  */
  if (onboardingPending) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    /*
      На мобильном это вертикальный стек, и только с md — строка.

      Верхняя мобильная панель из SiteSidebar приходит соседом бокового меню
      и позиционирована sticky, то есть остаётся в потоке. В горизонтальной
      строке она забирала себе колонку: на экране 375px под контент
      оставалось 216px, из-за чего карточки сжимались, а сетки с фиксированной
      шириной ячеек наезжали друг на друга. Боковое меню на мобильном всё
      равно display:none, поэтому колонка ничего не ломает.
    */
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <SiteSidebar />
      {/*
        pb-20 на мобильном: нижняя панель навигации зафиксирована поверх
        страницы, и без запаса последняя строка контента уезжает под неё.
        От md панели нет, поэтому и отступ снимается.
      */}
      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
