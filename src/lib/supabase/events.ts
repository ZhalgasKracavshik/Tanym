'use client';

/**
 * Реальные события афиши из Supabase — общий код для /events и /dashboard
 * (виджет «ближайшая запись»). Раньше оба места читали захардкоженный
 * data/events.ts; после переноса афиши в базу id событий стали настоящими
 * UUID, и дашборд без этого хука искал бы событие по старому статическому
 * id, которого в базе уже нет.
 */

import { useEffect, useState } from 'react';
import { createClient } from './client';
import type { EventType, SchoolEvent } from '@/lib/events';

interface PublishedEventRow {
  id: string;
  type: EventType;
  title: string;
  organizer: string;
  description: string;
  starts_at: string;
  registration_deadline: string;
  location: string;
  online: boolean;
  grades: number[];
  subject_id: string | null;
  prize: string | null;
  free: boolean;
  cover_path: string | null;
  cover_paths: string[] | null;
}

function rowToEvent(row: PublishedEventRow): SchoolEvent {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    organizer: row.organizer,
    description: row.description,
    startsAt: row.starts_at,
    registrationDeadline: row.registration_deadline,
    location: row.location,
    online: row.online,
    grades: row.grades as SchoolEvent['grades'],
    subjectId: row.subject_id ?? undefined,
    prize: row.prize ?? undefined,
    free: row.free,
    /*
      cover_path остаётся как запасной источник: колонка была одиночной,
      и у событий, опубликованных до перехода на галерею, ссылка лежит
      именно там. Терять их из-за смены схемы незачем.
    */
    coverUrls: (row.cover_paths?.length ? row.cover_paths : [row.cover_path].filter(Boolean) as string[])
      .map((path) => createClient().storage.from('card-covers').getPublicUrl(path).data.publicUrl),
  };
}

export function usePublishedEvents(refreshKey = 0) {
  const [events, setEvents] = useState<SchoolEvent[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    supabase
      .from('published_events')
      .select('*')
      .order('registration_deadline', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setEvents((data ?? []).map(rowToEvent));
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return events;
}
