'use client';

/**
 * Общая лента школы.
 *
 * Один поток вместо трёх разрозненных списков: достижения, объявления
 * и посты лежали каждый на своей странице, и увидеть «что вообще
 * происходит в школе» было негде. Читается из вью activity_feed —
 * она же гарантирует, что заявки на модерации сюда не попадают.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AchievementCard, type AchievementCardTone } from './AchievementCard';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { LiftCard, StaggerGroup, StaggerItem } from './motion';
import { avatarPhotoUrl } from '@/lib/supabase/avatarPhoto';

type FeedKind = 'achievement_post' | 'achievement_approved' | 'listing_published';

interface FeedRow {
  id: string;
  actor_id: string;
  kind: FeedKind;
  title: string;
  detail: string | null;
  media_path: string | null;
  created_at: string;
  link: string;
}

interface FeedItem extends FeedRow {
  actorName: string;
  actorColor: string | null;
  actorPhoto: string | null;
}

const KIND_META: Record<FeedKind, { icon: IconName; label: string; tone: string }> = {
  achievement_approved: {
    icon: 'medal',
    label: 'подтвердил достижение',
    tone: 'bg-accent-100 text-accent-700',
  },
  achievement_post: {
    icon: 'trophy',
    label: 'поделился успехом',
    tone: 'bg-brand-100 text-brand-700',
  },
  listing_published: {
    icon: 'backpack',
    label: 'опубликовал объявление',
    tone: 'bg-success-50 text-success-700',
  },
};

/**
 * Бакет, вложение из которого лента разворачивает картинкой.
 *
 * 'achievement_approved' сюда не входит, и это не упущение. В его вложении —
 * скан грамоты из achievement-proofs, а на нём почти всегда напечатаны имя
 * ребёнка, класс и школа. Развернуть такой документ во всю ширину
 * общешкольной ленты значит опубликовать персональные данные за ученика и без
 * его участия. Сам диплом остаётся доступен по ссылке в портфолио — то есть
 * по отдельному действию.
 *
 * Ключа нет вовсе, а не «есть, но мы его отфильтруем ниже»: пока адрес скана
 * вычисляется, кто-нибудь однажды подставит его в photoUrl — ровно так утечка
 * и появилась на странице src/app/feed/page.tsx, где карта бакетов своя.
 */
const MEDIA_BUCKET: Partial<Record<FeedKind, string>> = {
  achievement_post: 'achievement-photos',
};

/**
 * Типы записей, которые в ленте рисуются карточкой достижения.
 *
 * Заодно это и признак «достижение ли это»: ключ есть — рисуем карточкой,
 * ключа нет (объявление) — остаётся обычная строка. Значение — цвет заливки
 * для случая «фотографии нет»: подтверждённое достижение уходит в медальный
 * янтарь, добровольный пост — в фирменный оранжевый, как в общей ленте
 * достижений.
 */
const ACHIEVEMENT_TONE: Partial<Record<FeedKind, AchievementCardTone>> = {
  achievement_approved: 'accent',
  achievement_post: 'brand',
};

/** «5 минут назад» вместо даты: лента читается как поток, а не как архив. */
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн назад`;
  return new Date(iso).toLocaleDateString('ru');
}

export function useActivityFeed(limit = 20, refreshKey = 0) {
  const [items, setItems] = useState<FeedItem[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from('activity_feed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (cancelled) return;
      const rows = (data as FeedRow[] | null) ?? [];

      if (rows.length === 0) {
        setItems([]);
        return;
      }

      // Имена резолвятся одним запросом на всю страницу, а не по одному
      // на карточку — тот же приём уже используется в рейтинге.
      const ids = [...new Set(rows.map((row) => row.actor_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_color, avatar_photo_path')
        .in('id', ids);

      if (cancelled) return;
      const byId = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

      setItems(
        rows.map((row) => ({
          ...row,
          actorName: byId[row.actor_id]?.name ?? 'Ученик',
          actorColor: byId[row.actor_id]?.avatar_color ?? null,
          actorPhoto: avatarPhotoUrl(byId[row.actor_id]?.avatar_photo_path as string | null),
        })),
      );
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [limit, refreshKey]);

  return items;
}

export function ActivityFeed({ limit = 20, refreshKey = 0 }: { limit?: number; refreshKey?: number }) {
  const items = useActivityFeed(limit, refreshKey);
  const supabase = createClient();

  if (items === null) return null;

  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-ink-200 bg-white/60 px-6 py-12 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[var(--radius-control)] bg-brand-50 text-brand-500">
          <Icon name="sparkles" size={26} />
        </span>
        <p className="mt-4 text-sm text-ink-500">
          Пока тихо. Опубликуйте достижение — и оно появится здесь первым.
        </p>
      </div>
    );
  }

  return (
    /*
      Интервал шире прежнего: у «глиняной» карточки крупная мягкая тень,
      и на трёх пикселях зазора она наползала на соседнюю запись.
    */
    <StaggerGroup className="space-y-5">
      {items.map((item) => {
        const meta = KIND_META[item.kind];
        const cardTone = ACHIEVEMENT_TONE[item.kind];

        if (cardTone) {
          const isPost = item.kind === 'achievement_post';
          // Бакет задан только у поста ученика — почему, написано у MEDIA_BUCKET.
          const bucket = MEDIA_BUCKET[item.kind];
          const mediaUrl =
            item.media_path && bucket
              ? supabase.storage.from(bucket).getPublicUrl(item.media_path).data.publicUrl
              : null;

          /*
            Фоном кладём только изображение. Форму публикации ограничивает
            accept="image/*", но это подсказка файловому диалогу, а не
            запрет: подсунуть в бакет PDF ничто не мешает, и <img> на него
            отрисовался бы битой иконкой во всю карточку.
          */
          const photoUrl = mediaUrl && !/\.pdf($|\?)/i.test(mediaUrl) ? mediaUrl : null;

          return (
            <StaggerItem key={`${item.kind}-${item.id}`}>
              {/*
                Автор идёт строкой над карточкой, а не поверх неё: лента
                читается сверху вниз по столбцу «кто — что», и подпись,
                уехавшая на фотографию, выпадает из этого столбца.
              */}
              <Link href={item.link} className="block">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={item.actorName}
                    colorId={item.actorColor}
                    photoUrl={item.actorPhoto}
                    size={40}
                  />
                  <p className="min-w-0 text-sm text-ink-500">
                    <span className="font-semibold text-ink-900">{item.actorName}</span>{' '}
                    {meta.label}
                    <span className="text-ink-300"> · {relativeTime(item.created_at)}</span>
                  </p>
                </div>

                {/*
                  Карточка вертикальная (4:5), поэтому её ширина ограничена:
                  на всю ленту в тысячу пикселей она развернулась бы в экран
                  высотой, и одна запись съела бы всю прокрутку.
                */}
                <div className="mt-3 w-full max-w-xs">
                  <AchievementCard
                    title={item.title}
                    /*
                      У подтверждённого достижения в detail лежит короткое
                      направление («Физика») — это подзаголовок. У поста там
                      подпись самого ученика, её место третьей строкой.
                    */
                    subtitle={isPost ? undefined : (item.detail ?? undefined)}
                    description={isPost ? (item.detail ?? undefined) : undefined}
                    date={item.created_at}
                    // Лента школы целиком на русском — переключателя языка у неё нет.
                    language="ru"
                    photoUrl={photoUrl}
                    tone={cardTone}
                    icon={meta.icon}
                  />
                </div>
              </Link>
            </StaggerItem>
          );
        }

        return (
          <StaggerItem key={`${item.kind}-${item.id}`}>
            <LiftCard className="overflow-hidden rounded-[var(--radius-card)] border border-ink-200/80 bg-white shadow-[var(--shadow-rest)]">
              <Link href={item.link} className="block p-5">
                <div className="flex items-start gap-3">
                  {/*
                    Через общий Avatar, а не свой кружок: здесь раньше цвет
                    подставлялся в CSS напрямую (`background: item.actorColor`),
                    но в колонке лежит идентификатор вроде «brand», а не
                    градиент — браузер такое правило отбрасывал, и белая буква
                    оказывалась на белой карточке.
                  */}
                  <Avatar
                    name={item.actorName}
                    colorId={item.actorColor}
                    photoUrl={item.actorPhoto}
                    size={40}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-500">
                      <span className="font-semibold text-ink-900">{item.actorName}</span>{' '}
                      {meta.label}
                      <span className="text-ink-300"> · {relativeTime(item.created_at)}</span>
                    </p>

                    <p className="mt-1 flex items-center gap-2 font-bold text-ink-900">
                      {/*
                        Значок 16px в кружке 28px, а не 13 в 24.

                        Медаль и кубок — рисунки из нескольких линий, и на
                        тринадцати пикселях они сливаются в закорючку: в
                        ленте это читалось как непрогрузившийся символ, а
                        не как значок типа записи.
                      */}
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${meta.tone}`}
                      >
                        <Icon name={meta.icon} size={16} />
                      </span>
                      {item.title}
                    </p>

                    {item.detail && <p className="mt-1 text-sm text-ink-500">{item.detail}</p>}
                  </div>
                </div>
                {/*
                  Вложения в этой ветке нет намеренно: сюда доходят только
                  объявления, а для listing_published бакет в MEDIA_BUCKET не
                  задан — файл объявления живёт на его собственной странице,
                  и лента его не показывает.
                */}
              </Link>
            </LiftCard>
          </StaggerItem>
        );
      })}
    </StaggerGroup>
  );
}
