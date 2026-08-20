import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { StoreProvider } from '@/components/StoreProvider';
import { AppShell } from '@/components/AppShell';

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
  themeColor: '#128cba',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ru" className={`${inter.variable} ${playfair.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
