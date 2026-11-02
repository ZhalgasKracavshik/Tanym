import type { Metadata, Viewport } from 'next';
import { Golos_Text } from 'next/font/google';
import './globals.css';
import { StoreProvider } from '@/components/StoreProvider';
import { AppShell } from '@/components/AppShell';
import { ProgressSync } from '@/components/ProgressSync';
import { LEARNING_ENABLED } from '@/lib/pilot';
import { SchoolAuthProvider } from '@/lib/supabase/useSchoolAuth';
import { getServerProfile } from '@/lib/supabase/serverProfile';
import { SavedEventsProvider } from '@/lib/supabase/events';
import { SITE_ALIASES, SITE_NAME, SITE_URL } from '@/lib/site';

/**
 * Гротеск Golos Text — один на весь продукт.
 *
 * Почему не Inter. Он стоял здесь раньше и создавал сразу две проблемы.
 * Первая: это шрифт по умолчанию у половины интерфейсов, собранных за
 * последние два года, и он мгновенно читается как «сделано по шаблону».
 * Вторая, важнее: его кириллица — латинские формы с приделанными
 * элементами, и русский текст в нём заметно суше казахского и русского
 * набора, ради которого продукт и существует.
 *
 * Golos Text рисовался от кириллицы, а не к ней. По складу это тот же
 * нейтральный швейцарский гротеск, на котором держится взятая за образец
 * типографика Airtable: спокойный, без характера в буквах, вся выразительность
 * отдана размеру и цвету.
 *
 * Второго шрифта в системе нет намеренно. Раньше рядом жил Playfair Display —
 * подключался в каждой загрузке страницы и не применялся нигде: переменная
 * --font-playfair не встречалась ни в одном стиле. Это был чистый вес,
 * который скачивал каждый посетитель.
 */
const golos = Golos_Text({
  variable: '--font-golos',
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
});

const DESCRIPTION =
  'Taným (Таным) — афиша олимпиад, конкурсов и курсов для школьников Казахстана с датой, до которой нужно подать заявку. Сохраняй события и получай напоминания о дедлайнах.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Taným — олимпиады, конкурсы и дедлайны для школьников Казахстана',
    template: '%s',
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    ...SITE_ALIASES,
    'олимпиады для школьников Казахстан',
    'конкурсы для школьников',
    'олимпиада регистрация дедлайн',
    'мектеп оқушыларына олимпиада',
    'афиша олимпиад',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'Taným — не пропусти олимпиаду из-за дедлайна',
    description: DESCRIPTION,
    locale: 'ru_KZ',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Taným — афиша олимпиад и конкурсов' }],
  },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
  icons: { icon: [{ url: '/favicon.ico' }, { url: '/icon-192.png', type: 'image/png', sizes: '192x192' }], apple: '/apple-icon.png' },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: 'default' },
  // Код подтверждения из Google Search Console (Настройки → Подтверждение → HTML-тег).
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

/** schema.org: имя сайта и его написания — чтобы Google связал «Таным», «Tanym» и «Taným» с этим сайтом. */
const SITE_JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      name: SITE_NAME,
      alternateName: SITE_ALIASES.filter((alias) => alias !== SITE_NAME),
      url: SITE_URL,
      inLanguage: ['ru', 'kk'],
    },
    {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon-512.png`,
      areaServed: 'KZ',
    },
  ],
}).replace(/</g, '\\u003c');

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
    <html lang="ru" className={`${golos.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SITE_JSON_LD }} />
        <StoreProvider>
          {/* Один запрос профиля на всё приложение вместо шести — см.
              комментарий в useSchoolAuth.tsx. */}
          <SchoolAuthProvider
            initialProfile={profile}
            initialEmail={email}
            initialEmailConfirmed={emailConfirmed}
            initialSchoolClass={schoolClass}
          >
            {LEARNING_ENABLED && <ProgressSync />}
            <SavedEventsProvider>
              <AppShell>{children}</AppShell>
            </SavedEventsProvider>
          </SchoolAuthProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
