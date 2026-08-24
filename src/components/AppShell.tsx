'use client';

/**
 * Развилка между лендингом и внутренними разделами.
 *
 * Лендинг — маркетинговая страница, ей нужна горизонтальная шапка. Внутренние
 * разделы (после онбординга) используют боковую навигацию, потому что пунктов
 * десять и вертикальный список читается без прокрутки.
 */

import { usePathname } from 'next/navigation';
import { SiteHeader } from './SiteHeader';
import { SiteSidebar } from './SiteSidebar';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { useStore } from './StoreProvider';
import { LandingAuthBanner } from './LandingAuthBanner';

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
const SHELLESS_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/for-schools', '/for-centers'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, isSignedIn, profile } = useSchoolAuth();
  const { state } = useStore();
  const isLanding = pathname === '/';

  /*
    Вошёл (например, через Google), но роль ещё не выбрана.
    Боковое меню в этот момент показывает десяток разделов, которые всё
    равно упрутся в ту же самую форму выбора роли — сбивает с единственного
    действия, которое нужно сделать прямо сейчас.
  */
  const pendingRoleChoice = !loading && isSignedIn && !profile;
  const isShellless = SHELLESS_ROUTES.includes(pathname);

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
