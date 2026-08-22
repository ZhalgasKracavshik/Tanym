'use client';

/**
 * Лента опубликованных достижений — то, что видят все, включая гостей.
 * Фото читаются напрямую из публичного бакета Storage, без подписанных ссылок.
 */

import { useEffect, useState } from 'react';
import { ACHIEVEMENTS } from '@/lib/achievements';
import type { Language } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { AchievementCard } from './AchievementCard';

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
          /*
            Та же карточка, что и в портфолио. Здесь фотографию выкладывает
            сам ученик — это не скан документа, а снимок с события, поэтому
            он разворачивается на всю карточку без оговорок. Подпись поста
            идёт третьей строкой: ради неё пост и публикуют.
          */
          <AchievementCard
            key={post.id}
            title={def?.title[language] ?? post.achievement_key}
            subtitle={names[post.student_id] ?? '…'}
            description={post.caption}
            date={post.created_at}
            language={language}
            photoUrl={photoUrl}
            tone="brand"
            icon={def?.icon}
          />
        );
      })}
    </div>
  );
}
