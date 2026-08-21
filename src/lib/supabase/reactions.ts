'use client';

/**
 * Реакции на записи ленты.
 *
 * Счётчики и «моя реакция» тянутся одним запросом на всю страницу, а не по
 * запросу на карточку: лента показывает два десятка записей сразу, и
 * поштучные запросы превратили бы открытие страницы в два десятка round-trip.
 */

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface ReactionState {
  /** Сколько всего реакций на записи, ключ — id записи. */
  counts: Record<string, number>;
  /** На какие записи реагировал текущий пользователь. */
  mine: Set<string>;
}

export function useReactions(entryIds: string[], userId: string | null) {
  const [state, setState] = useState<ReactionState>({ counts: {}, mine: new Set() });

  // Строкой, а не массивом: массив — новая ссылка на каждый рендер, и
  // эффект перезапускался бы бесконечно.
  const key = entryIds.join(',');

  useEffect(() => {
    if (entryIds.length === 0) return;
    const supabase = createClient();
    let cancelled = false;

    supabase
      .from('feed_reactions')
      .select('entry_id, user_id')
      .in('entry_id', entryIds)
      .then(({ data }) => {
        if (cancelled) return;
        const counts: Record<string, number> = {};
        const mine = new Set<string>();
        for (const row of data ?? []) {
          const id = String(row.entry_id);
          counts[id] = (counts[id] ?? 0) + 1;
          if (userId && row.user_id === userId) mine.add(id);
        }
        setState({ counts, mine });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, userId]);

  const toggle = useCallback(
    async (entryId: string, entryKind: string) => {
      if (!userId) return;
      const supabase = createClient();
      const had = state.mine.has(entryId);

      /*
        Экран меняется сразу, не дожидаясь сервера. Реакция — жест на
        доли секунды, и задержка в полсекунды между нажатием и откликом
        читается как «не сработало», после чего жмут ещё раз.
      */
      setState((prev) => {
        const mine = new Set(prev.mine);
        const counts = { ...prev.counts };
        if (had) {
          mine.delete(entryId);
          counts[entryId] = Math.max(0, (counts[entryId] ?? 1) - 1);
        } else {
          mine.add(entryId);
          counts[entryId] = (counts[entryId] ?? 0) + 1;
        }
        return { counts, mine };
      });

      const { error } = had
        ? await supabase.from('feed_reactions').delete().eq('entry_id', entryId).eq('user_id', userId)
        : await supabase
            .from('feed_reactions')
            .insert({ entry_id: entryId, entry_kind: entryKind, user_id: userId });

      // Сервер отказал — возвращаем экран к правде, а не оставляем ложный успех.
      if (error) {
        setState((prev) => {
          const mine = new Set(prev.mine);
          const counts = { ...prev.counts };
          if (had) {
            mine.add(entryId);
            counts[entryId] = (counts[entryId] ?? 0) + 1;
          } else {
            mine.delete(entryId);
            counts[entryId] = Math.max(0, (counts[entryId] ?? 1) - 1);
          }
          return { counts, mine };
        });
      }
    },
    [state.mine, userId],
  );

  return { ...state, toggle };
}
