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
import { SiteFooter } from './SiteFooter';

/**
 * Экраны входа живут без навигации вообще.
 *
 * Боковое меню на странице входа предлагает уйти в разделы, которые всё
 * равно потребуют аккаунта, а шапка лендинга уводит обратно на продажу
 * продукта. И то и другое мешает единственному действию на экране.
 */
const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === '/';
  const isAuth = AUTH_ROUTES.includes(pathname);

  if (isAuth) {
    return <main className="flex-1">{children}</main>;
  }

  if (isLanding) {
    return (
      <>
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </>
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
        <SiteFooter />
      </div>
    </div>
  );
}
