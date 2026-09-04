'use client';

/**
 * Правка объявления.
 *
 * Убрать объявление было можно, изменить — нет. Опечатка в заголовке или
 * перенесённая дата означали «удалить и написать заново», а это не одно и
 * то же: удаление уносит и дату публикации, и порядок в ленте, и ссылку,
 * которую уже кому-то отправили.
 *
 * Форма здесь та же, что и при создании — она просто получает объявление
 * и переключается в режим правки.
 */

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/components/StoreProvider';
import { CreatePageShell } from '@/components/CreatePageShell';
import { AnnouncementPublishForm } from '@/components/AnnouncementPublishForm';
import type { AnnouncementDraft } from '@/components/AnnouncementPublishForm';
import { createClient } from '@/lib/supabase/client';
import { EmptyState, Skeleton } from '@/components/ui';

export default function EditAnnouncementPage({ params }: PageProps<'/announcements/[id]/edit'>) {
  const { id } = use(params);
  const { state } = useStore();
  const router = useRouter();

  /*
    undefined — ещё грузим, null — такого объявления нет. Одно значение на
    оба случая показывало бы «не найдено» в первый кадр каждой загрузки.
  */
  const [row, setRow] = useState<AnnouncementDraft | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    createClient()
      .from('published_announcements')
      .select('id, category, title, body, author, expires_at, pinned, target_grades, cover_path')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setRow((data as AnnouncementDraft | null) ?? null);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <CreatePageShell
      backHref="/announcements"
      backLabel="К объявлениям"
      kicker="Объявления"
      title="Изменить объявление"
      description="Изменения увидят все сразу после сохранения."
      requireRole="admin"
    >
      {(profile) =>
        row === undefined ? (
          <Skeleton className="h-64 w-full" />
        ) : row === null ? (
          <EmptyState
            title="Объявление не найдено"
            description="Его могли удалить, или ссылка устарела."
          />
        ) : (
          <AnnouncementPublishForm
            language={state.language}
            adminId={profile.id}
            editing={row}
            onPublished={() => router.push('/announcements')}
          />
        )
      }
    </CreatePageShell>
  );
}
