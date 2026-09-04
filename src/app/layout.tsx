import type { Metadata, Viewport } from 'next';
import { Golos_Text } from 'next/font/google';
import './globals.css';
import { StoreProvider } from '@/components/StoreProvider';
import { AppShell } from '@/components/AppShell';
import { ProgressSync } from '@/components/ProgressSync';
import { SchoolAuthProvider } from '@/lib/supabase/useSchoolAuth';
import { getServerProfile } from '@/lib/supabase/serverProfile';

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
    <html lang="ru" className={`${golos.variable} h-full`}>
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
