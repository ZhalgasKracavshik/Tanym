'use client';

/**
 * Публикация в раздел возможностей.
 *
 * Одна страница на две формы, а не две страницы: с точки зрения человека
 * действие одно — «разместить здесь карточку», — и развилка проходит не по
 * его намерению, а по его роли, которую он и так знает про себя.
 *
 * Формы при этом разные по смыслу, а не по оформлению. Ученик и учитель
 * размещают своё предложение, и оно уходит на модерацию. Администрация
 * публикует карточку от имени школы — официальную секцию или внешний
 * центр, — и она появляется сразу проверенной.
 */

import { useRouter } from 'next/navigation';
import { useStore } from '@/components/StoreProvider';
import { CreatePageShell } from '@/components/CreatePageShell';
import { ListingPublishForm } from '@/components/ListingPublishForm';
import { PublishForm } from '../PublishForm';

export default function NewListingPage() {
  const { state } = useStore();
  const router = useRouter();

  return (
    <CreatePageShell
      backHref="/marketplace"
      backLabel="К возможностям"
      kicker="Возможности"
      title="Разместить карточку"
      requireRole={['student', 'teacher', 'admin']}
    >
      {(profile) =>
        profile.role === 'admin' ? (
          <ListingPublishForm
            language={state.language}
            adminId={profile.id}
            onPublished={() => router.push('/marketplace')}
          />
        ) : (
          <PublishForm
            language={state.language}
            profile={{
              id: profile.id,
              name: profile.name,
              role: profile.role,
              grade: profile.grade,
            }}
          />
        )
      }
    </CreatePageShell>
  );
}
