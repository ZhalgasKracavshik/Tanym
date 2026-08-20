'use client';

/**
 * Лента опубликованных достижений — то, что видят все, включая гостей.
 * Фото читаются напрямую из публичного бакета Storage, без подписанных ссылок.
 */

import { useEffect, useState } from 'react';
import { ACHIEVEMENTS } from '@/lib/achievements';
import type { Language } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { Icon } from './Icon';
import { Card } from './ui';

interface Post {
  id: string;
  achievement_key: string;
  caption: string;
  photo_path: string | null;
  created_at: string;
  student_id: string;
}

const TEXT = {
  ru: { empty: 'Пока никто не поделился достижением. Будь первым.' },
  kk: { empty: 'Әзірге ешкім жетістігімен бөліскен жоқ. Бірінші бол.' },
  en: { empty: 'No one has shared an achievement yet. Be the first.' },
} as const;

export function AchievementFeed({ language, refreshKey }: { language: Language; refreshKey: number }) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from('achievement_posts')
        .select('id, achievement_key, caption, photo_path, created_at, student_id')
        .order('created_at', { ascending: false })
        .limit(30);

      if (cancelled) return;
      setPosts(data ?? []);

      const ids = [...new Set((data ?? []).map((post) => post.student_id))];
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', ids);
        if (!cancelled) {
          setNames(Object.fromEntries((profiles ?? []).map((profile) => [profile.id, profile.name])));
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (posts === null) return null;

  if (posts.length === 0) {
    return <p className="text-sm text-ink-500">{TEXT[language].empty}</p>;
  }

  const supabase = createClient();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => {
        const def = ACHIEVEMENTS.find((item) => item.id === post.achievement_key);
        const photoUrl = post.photo_path
          ? supabase.storage.from('achievement-photos').getPublicUrl(post.photo_path).data.publicUrl
          : null;

        return (
          <Card key={post.id} className="overflow-hidden p-0">
            {photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- фото из внешнего бакета, без домена для next/image
              <img src={photoUrl} alt="" className="h-40 w-full object-cover" />
            )}
            <div className="p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
                {def && <Icon name={def.icon} size={16} className="text-accent-500" />}
                {def?.title[language] ?? post.achievement_key}
              </p>
              <p className="mt-1 text-xs text-ink-400">{names[post.student_id] ?? '…'}</p>
              {post.caption && <p className="mt-2 text-sm text-ink-600">{post.caption}</p>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
