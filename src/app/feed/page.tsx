'use client';

/**
 * Лента школы — главная страница вошедшего.
 *
 * Формат взят у вертикальных лент: одна запись на экран, листается вверх,
 * прилипает к границам карточек. Причина не в моде. Успех одноклассника —
 * это фотография и одна строка, а не абзац: в плотном списке он теряется
 * между соседними, а на весь экран его невозможно не заметить. Для
 * школьника чужая победа, показанная крупно, работает сильнее любого
 * призыва «занимайся больше».
 *
 * Прилипание сделано средствами CSS (scroll-snap), а не скриптом на
 * прокрутку: браузер делает это на уровне композитора, поэтому листается
 * плавно и не мешает обычной прокрутке колесом или клавишами.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { useActivityFeed } from '@/components/ActivityFeed';
import { useReactions } from '@/lib/supabase/reactions';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { EmptyState, Skeleton } from '@/components/ui';

const KIND_LABEL: Record<string, string> = {
  achievement_approved: 'подтверждённое достижение',
  achievement_post: 'поделился успехом',
  listing_published: 'новая возможность',
};

const MEDIA_BUCKET: Record<string, string> = {
  achievement_post: 'achievement-photos',
  achievement_approved: 'achievement-proofs',
};

function relativeTime(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн`;
  return new Date(iso).toLocaleDateString('ru');
}

export default function FeedPage() {
  const items = useActivityFeed(30);
  const { profile } = useSchoolAuth();
  const supabase = createClient();

  const ids = useMemo(() => (items ?? []).map((item) => item.id), [items]);
  const { counts, mine, toggle } = useReactions(ids, profile?.id ?? null);

  if (items === null) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 py-10">
        <Skeleton className="h-[70vh] w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState
          title="В ленте пока пусто"
          description="Здесь появятся достижения и новости школы. Опубликуйте своё — оно станет первым."
          action={
            <Link
              href="/achievements"
              className="inline-flex items-center gap-2 rounded-[var(--radius-control)] px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: 'var(--gradient-brand)' }}
            >
              <Icon name="plus" size={16} />
              Добавить достижение
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div
      /*
        Своя область прокрутки на высоту экрана: прилипание должно работать
        внутри ленты, а не таскать за собой всю страницу вместе с шапкой.
        Отступ снизу на мобильном — под плавающую панель навигации.
      */
      className="h-[calc(100dvh-3.5rem)] snap-y snap-mandatory overflow-y-auto md:h-dvh"
      style={{ scrollbarWidth: 'none' }}
    >
      {items.map((item) => {
        const bucket = MEDIA_BUCKET[item.kind];
        const mediaUrl =
          item.media_path && bucket
            ? supabase.storage.from(bucket).getPublicUrl(item.media_path).data.publicUrl
            : null;
        const liked = mine.has(item.id);
        const count = counts[item.id] ?? 0;

        return (
          <section
            key={item.id}
            className="flex h-full snap-start snap-always items-center justify-center px-4 py-6"
          >
            <article className="relative flex h-full max-h-[46rem] w-full max-w-xl flex-col overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-float)]">
              {/*
                Фон карточки — фотография, если она есть, иначе тёплый
                градиент. Пустая белая карточка на весь экран выглядит как
                не загрузившаяся страница, а не как запись без картинки.
              */}
              <div className="absolute inset-0" aria-hidden>
                {mediaUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full" style={{ background: 'var(--gradient-ink)' }}>
                    <div
                      className="h-full w-full opacity-40"
                      style={{ background: 'var(--gradient-brand)', mixBlendMode: 'overlay' }}
                    />
                  </div>
                )}
                {/* Затемнение снизу: белый текст обязан читаться на любой
                    фотографии, включая светлую. */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
              </div>

              <div className="relative mt-auto p-6 text-white">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={item.actorName}
                    colorId={item.actorColor}
                    emoji={item.actorEmoji}
                    size={44}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-bold">{item.actorName}</p>
                    <p className="text-xs text-white/70">
                      {KIND_LABEL[item.kind] ?? 'запись'} · {relativeTime(item.created_at)}
                    </p>
                  </div>
                </div>

                <h2 className="mt-4 text-2xl font-semibold leading-tight sm:text-3xl">{item.title}</h2>
                {item.detail && <p className="mt-2 text-sm text-white/80">{item.detail}</p>}

                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={() => toggle(item.id, item.kind)}
                    aria-pressed={liked}
                    aria-label={liked ? 'Убрать реакцию' : 'Поддержать'}
                    className={`inline-flex items-center gap-2 rounded-[var(--radius-pill)] px-4 py-2.5 text-sm font-bold backdrop-blur transition-all duration-150 focus-visible:ring-2 focus-visible:ring-white ${
                      liked ? 'bg-white text-ink-900' : 'bg-white/15 text-white hover:bg-white/25'
                    }`}
                  >
                    <span className="text-base leading-none">👏</span>
                    {count > 0 ? count : 'Поддержать'}
                  </button>

                  <Link
                    href={item.link}
                    className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-white/15 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition-colors duration-150 hover:bg-white/25"
                  >
                    Открыть
                    <Icon name="arrowRight" size={15} />
                  </Link>
                </div>
              </div>
            </article>
          </section>
        );
      })}
    </div>
  );
}
