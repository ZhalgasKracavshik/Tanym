import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { StoreProvider } from '@/components/StoreProvider';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

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

export const metadata: Metadata = {
  title: 'Tanym — персональный AI-наставник для школьников Казахстана',
  description:
    'Диагностика уровня, персональный план обучения и разбор заданий с искусственным интеллектом — для учеников 7–12 классов из любого региона Казахстана.',
};

export const viewport: Viewport = {
  themeColor: '#128cba',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ru" className={`${inter.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <StoreProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </StoreProvider>
      </body>
    </html>
  );
}
