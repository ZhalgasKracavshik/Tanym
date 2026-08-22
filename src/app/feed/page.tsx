'use client';

/**
 * Лента школы — главная страница вошедшего.
 *
 * Обычная лента постов, как в соцсетях: колонка карточек, которую листают
 * сверху вниз, несколько записей на экране сразу. Не полноэкранный формат
 * коротких видео — здесь не видео, а работы и победы, и человеку нужно
 * видеть соседние записи, чтобы понимать, что вообще происходит в школе,
 * а не разглядывать по одной.
 *
 * Записи сюда не публикуются отдельно: лента собирается из того, что ученик
 * и так выложил себе в профиль. Выложил работу или победу — она появилась у
 * всех. Отдельная «публикация в ленту» заставляла бы делать одно и то же
 * дважды.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { useActivityFeed } from '@/components/ActivityFeed';
import { useReactions } from '@/lib/supabase/reactions';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { EmptyState, Kicker, Skeleton } from '@/components/ui';
import { StaggerGroup, StaggerItem } from '@/components/motion';

const KIND_LABEL: Record<string, string> = {
  achievement_approved: 'подтверждённое достижение',
  achievement_post: 'поделился работой',
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

  return (
    /*
      Узкая колонка по центру, а не вся ширина экрана. Строка текста длиной
      в монитор нечитаема, и все ленты по этой причине выглядят одинаково:
      столбец примерно в шестьсот пикселей.
    */
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Kicker>Лента школы</Kicker>
          <h1 className="mt-2 text-3xl font-semibold text-ink-900">Что происходит</h1>
        </div>
        <Link
          href="/achievements"
          className="inline-flex shrink-0 items-center gap-2 rounded-[var(--radius-control)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-lift)] transition-shadow duration-150 hover:shadow-[var(--shadow-glow)]"
          style={{ background: 'var(--gradient-brand)' }}
        >
          <Icon name="plus" size={16} />
          Опубликовать
        </Link>
      </div>

      {items === null ? (
        <div className="mt-8 space-y-5">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="В ленте пока пусто"
            description="Здесь появляется то, что ученики выкладывают себе в профиль: работы, проекты, победы. Выложите своё — оно станет первым."
          />
        </div>
      ) : (
        <StaggerGroup className="mt-8 space-y-5">
          {items.map((item) => {
            const bucket = MEDIA_BUCKET[item.kind];
            const mediaUrl =
              item.media_path && bucket
                ? supabase.storage.from(bucket).getPublicUrl(item.media_path).data.publicUrl
                : null;
            const liked = mine.has(item.id);
            const count = counts[item.id] ?? 0;

            return (
              <StaggerItem key={item.id}>
                <article className="overflow-hidden rounded-[var(--radius-card)] border border-ink-200/80 bg-white shadow-[var(--shadow-rest)]">
                  {/* Шапка поста: кто и когда. */}
                  <div className="flex items-center gap-3 p-4">
                    <Link href={`/u/${item.actor_id}`} className="shrink-0">
                      <Avatar
                        name={item.actorName}
                        colorId={item.actorColor}
                        photoUrl={item.actorPhoto}
                        size={42}
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/u/${item.actor_id}`}
                        className="truncate font-bold text-ink-900 hover:underline"
                      >
                        {item.actorName}
                      </Link>
                      <p className="text-xs text-ink-400">
                        {KIND_LABEL[item.kind] ?? 'запись'} · {relativeTime(item.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="px-4 pb-3">
                    <h2 className="text-lg font-semibold leading-snug text-ink-900">{item.title}</h2>
                    {item.detail && <p className="mt-1 text-sm text-ink-500">{item.detail}</p>}
                  </div>

                  {/*
                    Фотография во всю ширину карточки и без обрезки по высоте
                    в фиксированные пиксели: работа ученика — это и есть
                    содержание поста, а не иллюстрация к нему.
                  */}
                  {mediaUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- внешний бакет, домен для next/image не настроен
                    <img
                      src={mediaUrl}
                      alt=""
                      loading="lazy"
                      className="max-h-[32rem] w-full bg-ink-50 object-cover"
                    />
                  )}

                  <div className="flex items-center gap-2 border-t border-ink-100 px-2 py-2">
                    <button
                      onClick={() => toggle(item.id, item.kind)}
                      aria-pressed={liked}
                      aria-label={liked ? 'Убрать реакцию' : 'Поддержать'}
                      className={`inline-flex items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
                        liked ? 'text-brand-600' : 'text-ink-500 hover:bg-ink-50'
                      }`}
                    >
                      <span className="text-base leading-none">👏</span>
                      {count > 0 ? count : 'Поддержать'}
                    </button>

                    <Link
                      href={item.link}
                      className="inline-flex items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold text-ink-500 transition-colors duration-150 hover:bg-ink-50"
                    >
                      Открыть
                      <Icon name="arrowRight" size={15} />
                    </Link>
                  </div>
                </article>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      )}
    </div>
  );
}
