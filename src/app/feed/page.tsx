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
 *
 * Карточка записи не рисуется здесь своей версией — берётся готовая
 * `ActivityFeedItem` из ActivityFeed.tsx. Раньше у страницы была
 * собственная копия разметки, и когда в общей ленте чинили утечку (скан
 * диплома ребёнка не должен разворачиваться во всю карточку), эту копию
 * забыли — она продолжала показывать документ всем читателям /feed.
 * Общий источник делает такое расхождение невозможным впредь.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { ActivityFeedItem, useActivityFeed } from '@/components/ActivityFeed';
import { useReactions } from '@/lib/supabase/reactions';
import { Icon } from '@/components/Icon';
import { EmptyState, Kicker, Skeleton } from '@/components/ui';
import { LikeButton } from '@/components/LikeButton';
import { StaggerGroup, StaggerItem } from '@/components/motion';

export default function FeedPage() {
  const items = useActivityFeed(30);
  const { profile } = useSchoolAuth();

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
            const liked = mine.has(item.id);
            const count = counts[item.id] ?? 0;

            return (
              <StaggerItem key={`${item.kind}-${item.id}`}>
                <ActivityFeedItem
                  item={item}
                  footer={
                    <div className="flex items-center gap-2 border-t border-ink-100 px-2 py-2">
                      {/*
                        Простой лайк, а не кнопка с подписью «Поддержать»:
                        сердце — общепринятый знак сам по себе, и объяснять
                        его словом рядом незачем. Отклик на нажатие — заливка,
                        короткий «поп» и разлёт частиц: лайк ставят мимоходом,
                        и без движения непонятно, засчиталось ли оно.
                      */}
                      <LikeButton
                        liked={liked}
                        count={count}
                        onToggle={() => toggle(item.id, item.kind)}
                      />
                    </div>
                  }
                />
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      )}
    </div>
  );
}
