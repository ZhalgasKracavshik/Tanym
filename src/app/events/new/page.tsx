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
      description="Знаете олимпиаду, конкурс или курс, которого нет в афише? Расскажите — после проверки событие увидят все."
      requireRole={['admin', 'teacher', 'student']}
    >
      {(profile) => (
        <EventPublishForm
          language={state.language}
          adminId={profile.id}
          role={profile.role === 'admin' ? 'admin' : 'member'}
          /*
            Админа возвращаем к афише: событие уже там. Остальных — на
            страницу их события: в афише заявки на проверке нет, и только
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
