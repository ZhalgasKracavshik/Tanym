'use client';

/**
 * Создание события афиши.
 */

import { useRouter } from 'next/navigation';
import { useStore } from '@/components/StoreProvider';
import { CreatePageShell } from '@/components/CreatePageShell';
import { EventPublishForm } from '@/components/EventPublishForm';

export default function NewEventPage() {
  const { state } = useStore();
  const router = useRouter();

  return (
    <CreatePageShell
      backHref="/events"
      backLabel="К афише"
      kicker="Афиша"
      title="Новое событие"
      description="Олимпиада, конкурс или мероприятие — попадёт в общую афишу школы."
      requireRole="admin"
    >
      {(profile) => (
        <EventPublishForm
          language={state.language}
          adminId={profile.id}
          /*
            После публикации возвращаем к списку, а не оставляем на пустой
            форме: результат находится там, и человеку нужно увидеть, что
            запись появилась, а не гадать, отправилось ли.
          */
          onPublished={() => router.push('/events')}
        />
      )}
    </CreatePageShell>
  );
}
