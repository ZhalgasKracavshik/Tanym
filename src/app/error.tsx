'use client';

import { useEffect } from 'react';
import { ErrorScreen } from '@/components/ErrorScreen';
import { Button, ButtonLink } from '@/components/ui';
import { useLang, type Dict } from '@/lib/i18n';

const TEXT: Dict<{ title: string; text: string; retry: string; events: string }> = {
  ru: {
    title: 'Что-то пошло не так',
    text: 'Страница не загрузилась. Попробуйте ещё раз — обычно помогает. Ваши сохранённые события никуда не делись.',
    retry: 'Попробовать ещё раз',
    events: 'К афише',
  },
  kk: {
    title: 'Бір нәрсе дұрыс болмады',
    text: 'Бет жүктелмеді. Қайта көріңіз — әдетте көмектеседі. Сақталған іс-шараларыңыз орнында.',
    retry: 'Қайта көру',
    events: 'Афишаға',
  },
  en: {
    title: 'Something went wrong',
    text: "The page didn't load. Try again — it usually helps. Your saved events are safe.",
    retry: 'Try again',
    events: 'To the board',
  },
};

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = TEXT[useLang()];

  useEffect(() => {
    // Попадает в логи Vercel (Runtime Logs) — по digest находится серверная ошибка.
    console.error('[route-error]', error.digest ?? '', error);
  }, [error]);

  return (
    <ErrorScreen
      icon="alert"
      title={t.title}
      text={t.text}
      actions={
        <>
          <Button onClick={() => reset()}>{t.retry}</Button>
          <ButtonLink href="/events" variant="secondary">
            {t.events}
          </ButtonLink>
        </>
      }
    />
  );
}
