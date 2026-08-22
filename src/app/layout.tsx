import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { StoreProvider } from '@/components/StoreProvider';
import { AppShell } from '@/components/AppShell';
import { ProgressSync } from '@/components/ProgressSync';
import { SchoolAuthProvider } from '@/lib/supabase/useSchoolAuth';
import { getServerProfile } from '@/lib/supabase/serverProfile';

/**
 * Шрифт подключаем с кириллическим набором символов.
 * Без subset 'cyrillic' браузер подставил бы запасной шрифт для русского текста,
 * и типографика поехала бы на всех страницах.
 */
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
});

/**
 * Отдельный засечный шрифт только для словесного знака «Tanym» в логотипе —
 * тот же контрастный засечный рисунок, что и в присланном образце. Кириллица
 * ему не нужна: название бренда всегда набрано латиницей.
 */
const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  weight: ['700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Tanym: персональный AI-наставник для школьников Казахстана',
  description:
    'Диагностика уровня, персональный план обучения и разбор заданий с искусственным интеллектом для учеников 7–12 классов из любого региона Казахстана.',
};

export const viewport: Viewport = {
  themeColor: '#d85f2e',
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  /*
    Профиль читается здесь, на сервере, и уезжает в провайдер пропсами.
    Это единственный способ, чтобы серверная разметка уже знала роль: иначе
    сервер отдаёт меню гостя, браузер его рисует, и гидратация подменяет
    список пунктов на глазах у пользователя.
  */
  const { profile, email, emailConfirmed, schoolClass } = await getServerProfile();

  return (
    <html lang="ru" className={`${inter.variable} ${playfair.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <StoreProvider>
          {/* Один запрос профиля на всё приложение вместо шести — см.
              комментарий в useSchoolAuth.tsx. */}
          <SchoolAuthProvider
            initialProfile={profile}
            initialEmail={email}
            initialEmailConfirmed={emailConfirmed}
            initialSchoolClass={schoolClass}
          >
            <ProgressSync />
            <AppShell>{children}</AppShell>
          </SchoolAuthProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
