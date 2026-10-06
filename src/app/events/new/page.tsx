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
      description="Олимпиада, конкурс или мероприятие. Событие от учителя появится в афише после проверки администратором."
      requireRole={['admin', 'teacher']}
    >
      {(profile) => (
        <EventPublishForm
          language={state.language}
          adminId={profile.id}
          role={profile.role === 'admin' ? 'admin' : 'teacher'}
          /*
            Админа возвращаем к афише: событие уже там. Учителя — на
            страницу его события: в афише заявки на проверке нет, и только
            там видно, что она дошла и ждёт одобрения.
          */
          onPublished={(eventId) =>
            router.push(profile.role === 'admin' ? '/events' : `/events/${eventId}`)
          }
        />
      )}
    </CreatePageShell>
  );
}
