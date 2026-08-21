'use client';

/**
 * Создание объявления.
 *
 * Объявление — официальный голос школы, поэтому публикует только
 * администрация, а не каждый учитель.
 */

import { useRouter } from 'next/navigation';
import { useStore } from '@/components/StoreProvider';
import { CreatePageShell } from '@/components/CreatePageShell';
import { AnnouncementPublishForm } from '@/components/AnnouncementPublishForm';

export default function NewAnnouncementPage() {
  const { state } = useStore();
  const router = useRouter();

  return (
    <CreatePageShell
      backHref="/announcements"
      backLabel="К объявлениям"
      kicker="Объявления"
      title="Новое объявление"
      description="Появится в общем списке сразу после публикации."
      requireRole="admin"
    >
      {(profile) => (
        <AnnouncementPublishForm
          language={state.language}
          adminId={profile.id}
          /*
            После публикации возвращаем к списку, а не оставляем на пустой
            форме: результат находится там, и человеку нужно увидеть, что
            запись появилась, а не гадать, отправилось ли.
          */
          onPublished={() => router.push('/announcements')}
        />
      )}
    </CreatePageShell>
  );
}
