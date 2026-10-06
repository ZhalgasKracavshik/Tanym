'use client';

/**
 * Реальные события афиши из Supabase — общий код для /events и /dashboard
 * (виджет «ближайшая запись»). Раньше оба места читали захардкоженный
 * data/events.ts; после переноса афиши в базу id событий стали настоящими
 * UUID, и дашборд без этого хука искал бы событие по старому статическому
 * id, которого в базе уже нет.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from './client';
import { useSchoolAuth } from './useSchoolAuth';
import { useStore } from '@/components/StoreProvider';
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
  registration_url: string | null;
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
    registrationUrl: row.registration_url,
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

    /*
      Явный фильтр по статусу, хотя RLS и так прячет чужие заявки: автору
      и админу политика отдаёт ещё и неодобренное, а в общей афише его
      быть не должно. Заявки на проверке видны в /admin/moderation.
    */
    supabase
      .from('published_events')
      .select('*')
      .eq('status', 'approved')
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

/**
 * «Мои события» — сохранённые учеником события, таблица event_saves.
 *
 * Раньше отметка жила в localStorage (state.eventRegistrations) и терялась
 * при входе с другого устройства, а ближайший дедлайн в кабинете считался
 * только в том браузере, где её поставили. Теперь источник правды — база.
 *
 * Старые локальные отметки переносятся один раз: при первой загрузке они
 * вставляются в event_saves и стираются из хранилища. Событие, которого
 * больше нет, политика просто не вставит — и это правильно.
 *
 * ids === null — ещё грузим (или гость): кнопку сохранения не показываем,
 * чем показать её не в том состоянии.
 */
export function useSavedEvents() {
  const { profile } = useSchoolAuth();
  const { state, clearEventRegistrations } = useStore();
  const userId = profile?.id ?? null;
  const [loaded, setLoaded] = useState<{ userId: string; ids: Set<string> } | null>(null);
  const migrated = useRef(false);

  // Локальные отметки читаются один раз — для переноса, а не как состояние.
  const legacyIds = useRef(state.eventRegistrations);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      if (!migrated.current && legacyIds.current.length > 0) {
        migrated.current = true;
        await supabase
          .from('event_saves')
          .upsert(
            legacyIds.current.map((eventId) => ({ user_id: userId, event_id: eventId })),
            { onConflict: 'user_id,event_id', ignoreDuplicates: true },
          );
        clearEventRegistrations();
      }

      const { data } = await supabase.from('event_saves').select('event_id');
      if (!cancelled) {
        setLoaded({ userId: userId!, ids: new Set((data ?? []).map((row) => row.event_id as string)) });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId, clearEventRegistrations]);

  const ids = loaded && loaded.userId === userId ? loaded.ids : null;

  /**
   * Переключает сохранение. Состояние меняется сразу, запрос идёт следом;
   * при отказе базы отметка откатывается — иначе кнопка врала бы.
   */
  const toggle = useCallback(
    async (eventId: string) => {
      if (!userId || !ids) return;
      const wasSaved = ids.has(eventId);
      const flip = (current: Set<string>, save: boolean) => {
        const next = new Set(current);
        if (save) next.add(eventId);
        else next.delete(eventId);
        return next;
      };

      setLoaded((current) => (current ? { ...current, ids: flip(current.ids, !wasSaved) } : current));

      const supabase = createClient();
      const { error } = wasSaved
        ? await supabase.from('event_saves').delete().eq('event_id', eventId).eq('user_id', userId)
        : await supabase.from('event_saves').insert({ user_id: userId, event_id: eventId });

      if (error) {
        setLoaded((current) => (current ? { ...current, ids: flip(current.ids, wasSaved) } : current));
      }
    },
    [userId, ids],
  );

  return { ids, toggle };
}
