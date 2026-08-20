'use client';

/**
 * Реальные объявления из Supabase — раньше содержимое доски лежало
 * в захардкоженном data/announcements.ts.
 */

import { useEffect, useState } from 'react';
import { createClient } from './client';
import type { Announcement, AnnouncementCategory } from '@/lib/announcements';
import type { Grade } from '@/lib/types';

interface PublishedAnnouncementRow {
  id: string;
  category: AnnouncementCategory;
  title: string;
  body: string;
  author: string;
  published_at: string;
  expires_at: string | null;
  pinned: boolean;
  target_grades: number[] | null;
}

function rowToAnnouncement(row: PublishedAnnouncementRow): Announcement {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    body: row.body,
    author: row.author,
    publishedAt: row.published_at,
    expiresAt: row.expires_at ?? undefined,
    pinned: row.pinned,
    targetGrades: (row.target_grades as Grade[] | null) ?? null,
  };
}

export function usePublishedAnnouncements(refreshKey = 0) {
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    supabase
      .from('published_announcements')
      .select('*')
      .order('published_at', { ascending: false })
      .then(({ data }) => {
        if (!cancelled) setAnnouncements((data ?? []).map(rowToAnnouncement));
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return announcements;
}
