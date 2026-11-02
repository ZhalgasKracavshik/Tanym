'use client';

import { ErrorScreen } from '@/components/ErrorScreen';
import { ButtonLink } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useLang, type Dict } from '@/lib/i18n';

const TEXT: Dict<{ title: string; text: string; events: string; home: string }> = {
  ru: {
    title: 'Такой страницы нет',
    text: 'Возможно, ссылка устарела или раздел пока закрыт. Олимпиады и конкурсы — в афише.',
    events: 'Открыть афишу',
    home: 'На главную',
  },
  kk: {
    title: 'Мұндай бет жоқ',
    text: 'Сілтеме ескірген немесе бөлім әзірге жабық болуы мүмкін. Олимпиадалар мен байқаулар — афишада.',
    events: 'Афишаны ашу',
    home: 'Басты бетке',
  },
  en: {
    title: 'Page not found',
    text: 'The link may be outdated or the section is closed for now. Olympiads and contests are on the board.',
    events: 'Open the board',
    home: 'Home',
  },
};

export default function NotFound() {
  const t = TEXT[useLang()];
  return (
    <ErrorScreen
      icon="compass"
      kicker="404"
      title={t.title}
      text={t.text}
      actions={
        <>
          <ButtonLink href="/events">
            <Icon name="calendar" size={16} />
            {t.events}
          </ButtonLink>
          <ButtonLink href="/" variant="secondary">
            {t.home}
          </ButtonLink>
        </>
      }
    />
  );
}
