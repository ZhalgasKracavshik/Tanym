'use client';

/**
 * Публикация материала архива учителем или администратором.
 */

import { useRouter } from 'next/navigation';
import { useStore } from '@/components/StoreProvider';
import { CreatePageShell } from '@/components/CreatePageShell';
import { ArchiveMaterialPublishForm } from '@/components/ArchiveMaterialPublishForm';

export default function NewArchiveMaterialPage() {
  const { state } = useStore();
  const router = useRouter();

  return (
    <CreatePageShell
      backHref="/archive/community"
      backLabel="К материалам"
      kicker="Материалы"
      title="Новый материал"
      description="Материал для подготовки: появится в списке от учителей и админов."
      requireRole={['teacher', 'admin']}
    >
      {(profile) => (
        <ArchiveMaterialPublishForm
          language={state.language}
          userId={profile.id}
          /*
            После публикации возвращаем к списку, а не оставляем на пустой
            форме: результат находится там, и человеку нужно увидеть, что
            запись появилась, а не гадать, отправилось ли.
          */
          onPublished={() => router.push('/archive/community')}
        />
      )}
    </CreatePageShell>
  );
}
