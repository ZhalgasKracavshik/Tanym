'use client';

/**
 * Маркетплейс возможностей.
 *
 * Название в интерфейсе — «Возможности», а не «Маркетплейс»: половина ленты
 * бесплатна (школьные секции, волонтёрство), и слово «маркетплейс» создавало бы
 * ложное ощущение, что здесь всё продаётся.
 *
 * Порядок вывода задан сознательно: бесплатное и проверенное школой идёт выше
 * платного и внешнего. Платформа, которая поднимает наверх тех, кто больше
 * заплатил, перестаёт работать на ученика.
 */

import { useEffect, useState } from 'react';
import { LISTING_TYPES } from '@/lib/listings';
import type { Listing, ListingType } from '@/lib/listings';
import type { Dict } from '@/lib/i18n';
import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';
import { Badge, Card, EmptyState, Kicker } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { PublishAction } from '@/components/PublishAction';

interface PublishedListingRow {
  id: string;
  type: ListingType;
  title: string;
  author_name: string;
  author_role: string;
  description: string;
  category: string;
  format: 'online' | 'offline' | 'both';
  price: number | null;
  price_note: string | null;
  spots: number | null;
  schedule: string;
  contact: string;
  verified: boolean;
  cover_path: string | null;
}

function rowToListing(row: PublishedListingRow): Listing {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    authorName: row.author_name,
    authorRole: row.author_role,
    description: row.description,
    category: row.category,
    price: row.price,
    priceNote: row.price_note ?? undefined,
    format: row.format,
    schedule: row.schedule,
    contact: row.contact,
    spots: row.spots ?? undefined,
    verified: row.verified,
    coverUrl: row.cover_path
      ? createClient().storage.from('card-covers').getPublicUrl(row.cover_path).data.publicUrl
      : null,
  };
}

/** Реальные одобренные объявления из Supabase — раньше здесь был захардкоженный массив. */
function usePublishedListings(refreshKey: number) {
  const [listings, setListings] = useState<Listing[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    supabase
      .from('published_listings')
      .select('*')
      // Отфильтровано явно, а не только через RLS: если страницу смотрит
      // сам admin или автор заявки, RLS вернёт им и pending-строки тоже —
      // а общая лента должна показывать только одобренное, без исключений.
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!cancelled) setListings((data ?? []).map(rowToListing));
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return listings;
}

const TEXT: Dict<{
  kicker: string;
  title: string;
  subtitle: string;
  all: string;
  free: string;
  perLesson: string;
  verified: string;
  unverified: string;
  unverifiedHint: string;
  spots: (n: number) => string;
  noSpots: string;
  schedule: string;
  contact: string;
  online: string;
  offline: string;
  both: string;
  empty: string;
  safety: string;
}> = {
  ru: {
    kicker: 'Вокруг школы',
    title: 'Возможности',
    subtitle: 'Секции, курсы, помощь старших и волонтёрство: всё, что есть вокруг школы.',
    all: 'Все',
    free: 'Бесплатно',
    perLesson: 'тг',
    verified: 'Проверено школой',
    unverified: 'Без проверки школы',
    unverifiedHint: 'Школа не проверяла это предложение. Обсуди с родителями, прежде чем платить.',
    spots: (n) => (n === 1 ? 'осталось 1 место' : n < 5 ? `осталось ${n} места` : `осталось ${n} мест`),
    noSpots: 'мест нет',
    schedule: 'Когда',
    contact: 'Как связаться',
    online: 'Онлайн',
    offline: 'Очно',
    both: 'Очно и онлайн',
    empty: 'В этой категории пока нет объявлений.',
    safety: 'Никогда не переводи деньги вперёд незнакомым людям и не встречайся один. Скажи об этом родителям.',
  },
  kk: {
    kicker: 'Мектеп айналасында',
    title: 'Мүмкіндіктер',
    subtitle: 'Үйірмелер, курстар, үлкендердің көмегі және волонтёрлық: мектеп айналасындағының бәрі.',
    all: 'Барлығы',
    free: 'Тегін',
    perLesson: 'тг',
    verified: 'Мектеп тексерген',
    unverified: 'Мектеп тексермеген',
    unverifiedHint: 'Мектеп бұл ұсынысты тексерген жоқ. Төлемес бұрын ата-анаңмен ақылдас.',
    spots: (n) => `${n} орын қалды`,
    noSpots: 'орын жоқ',
    schedule: 'Қашан',
    contact: 'Байланыс',
    online: 'Онлайн',
    offline: 'Қатысып',
    both: 'Қатысып және онлайн',
    empty: 'Бұл санатта әзірге хабарландыру жоқ.',
    safety: 'Бейтаныс адамдарға ақшаны алдын ала аударма және жалғыз кездеспе. Бұл туралы ата-анаңа айт.',
  },
  en: {
    kicker: 'Around the school',
    title: 'Opportunities',
    subtitle: 'Clubs, courses, peer tutoring and volunteering: everything around the school.',
    all: 'All',
    free: 'Free',
    perLesson: 'KZT',
    verified: 'Verified by school',
    unverified: 'Not verified by school',
    unverifiedHint: 'The school has not vetted this offer. Talk to your parents before paying.',
    spots: (n) => (n === 1 ? '1 spot left' : `${n} spots left`),
    noSpots: 'no spots left',
    schedule: 'When',
    contact: 'Contact',
    online: 'Online',
    offline: 'In person',
    both: 'In person and online',
    empty: 'No listings in this category yet.',
    safety: 'Never send money upfront to strangers and never meet alone. Tell your parents about it.',
  },
};

/**
 * Цвет баннера карточки по виду объявления.
 * Фотографий у объявлений нет — вместо них цветная плашка с иконкой вида,
 * тот же приём, что и на афише.
 */
const TYPE_BANNER: Record<ListingType, string> = {
  'school-club': 'bg-success-600',
  'teacher-course': 'bg-brand-500',
  'student-service': 'bg-accent-500',
  'external-center': 'bg-ink-700',
};

export default function MarketplacePage() {
  const { state } = useStore();
  const t = TEXT[state.language];

  const [filter, setFilter] = useState<ListingType | 'all'>('all');
  /*
    Сеттер убран: публикация ушла на отдельную страницу и возвращает сюда
    обычным переходом, а список перечитывается при монтировании. Значение
    остаётся как стабильный аргумент хука.
  */
  const [publishRefreshKey] = useState(0);
  const publishedListings = usePublishedListings(publishRefreshKey);

  if (publishedListings === null) {
    return <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6" />;
  }

  const visible = publishedListings.filter((listing) => filter === 'all' || listing.type === filter);

  /** Бесплатное и проверенное — выше. */
  const sorted = [...visible].sort((a, b) => {
    if (a.verified !== b.verified) return a.verified ? -1 : 1;
    const priceA = a.price ?? 0;
    const priceB = b.price ?? 0;
    return priceA - priceB;
  });

  const formatLabel = { online: t.online, offline: t.offline, both: t.both };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Kicker>{t.kicker}</Kicker>
          <h1 className="mt-2 text-3xl font-semibold text-ink-900 sm:text-4xl">{t.title}</h1>
        </div>
        {/* Одна кнопка на все роли — форма за ней своя у каждой. */}
        <PublishAction
          href="/marketplace/new"
          label="Разместить"
          requireRole={['student', 'teacher', 'admin']}
        />
      </div>
      <p className="mt-4 max-w-2xl text-sm text-ink-500">{t.subtitle}</p>

      {/* Предупреждение о безопасности: аудитория — подростки, и часть
          объявлений размещают посторонние люди */}
      <div className="mt-4 rounded-xl border border-accent-200 bg-accent-50 p-4">
        <p className="flex items-center gap-2 text-sm text-accent-700">
          <Icon name="alert" size={18} />
          {t.safety}
        </p>
      </div>

      {/* Фильтры */}
      <div className="mt-10 flex flex-wrap gap-2">
        <button onClick={() => setFilter('all')} className={chip(filter === 'all')}>
          {t.all}
        </button>
        {LISTING_TYPES.map((type) => (
          <button key={type.id} onClick={() => setFilter(type.id)} className={chip(filter === type.id)}>
            <Icon name={type.icon} size={16} />
            {type.title[state.language]}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="mt-10">
          <EmptyState title={t.empty} description="" />
        </div>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((listing) => {
            const meta = LISTING_TYPES.find((type) => type.id === listing.type);
            return (
              <Card
                key={listing.id}
                className="group flex flex-col overflow-hidden p-0 transition-all duration-300 hover:shadow-[var(--shadow-lift)]"
              >
                {/*
                  Обложка, если её загрузили при публикации, иначе — цветной
                  баннер с иконкой вида, как на афише.

                  Поле загрузки в форме публикации существовало и раньше, но
                  сюда, на саму карточку, картинка не попадала никогда: вью
                  запроса просто не забирала колонку cover_path. То есть
                  человек загружал фото, оно сохранялось в хранилище, а
                  увидеть его на «Возможностях» было негде.
                */}
                <div
                  className={`relative flex h-24 items-center justify-center overflow-hidden ${
                    listing.coverUrl ? 'bg-ink-200' : TYPE_BANNER[listing.type]
                  }`}
                >
                  {listing.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- внешний бакет, домен для next/image не настроен
                    <img
                      src={listing.coverUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    meta && (
                      <Icon
                        name={meta.icon}
                        size={34}
                        className="text-white/85 transition-transform duration-500 group-hover:scale-110"
                      />
                    )
                  )}
                  <span className="absolute right-3 top-3">
                    <Badge tone={listing.price === null ? 'success' : 'neutral'} className="tabular-nums">
                      {listing.price === null
                        ? t.free
                        : `${listing.price.toLocaleString('ru-RU')} ${t.perLesson}${
                            listing.priceNote ? ` / ${listing.priceNote}` : ''
                          }`}
                    </Badge>
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <Badge tone="brand" className="w-fit">
                    {meta && <Icon name={meta.icon} size={14} />}
                    {meta?.title[state.language]}
                  </Badge>

                  <h2 className="mt-3 line-clamp-2 font-bold text-ink-900">{listing.title}</h2>
                  <p className="mt-2 text-sm text-ink-400">
                    {listing.authorName} · {listing.authorRole}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-ink-600">{listing.description}</p>

                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-500">
                    <span>{listing.category}</span>
                    <span aria-hidden>·</span>
                    <span>{formatLabel[listing.format]}</span>
                    {listing.spots !== undefined && (
                      <>
                        <span aria-hidden>·</span>
                        <span
                          className={`tabular-nums ${
                            listing.spots > 0 ? 'font-semibold text-success-700' : 'text-ink-400'
                          }`}
                        >
                          {listing.spots > 0 ? t.spots(listing.spots) : t.noSpots}
                        </span>
                      </>
                    )}
                  </p>

                  {/* Подробности и действие прибиты к низу — карточки в ряду
                      выравниваются по нижнему краю независимо от длины текста */}
                  <div className="mt-auto pt-4">
                    <dl className="space-y-2 border-t border-ink-200 pt-4 text-sm">
                      <div className="flex gap-2">
                        <dt className="shrink-0 text-ink-400">{t.schedule}:</dt>
                        <dd className="text-ink-700">{listing.schedule}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="shrink-0 text-ink-400">{t.contact}:</dt>
                        <dd className="text-ink-700">{listing.contact}</dd>
                      </div>
                    </dl>

                    <p
                      className={`mt-4 flex items-center gap-2 text-xs ${
                        listing.verified ? 'font-semibold text-success-700' : 'text-ink-400'
                      }`}
                    >
                      <Icon name={listing.verified ? 'check' : 'close'} size={14} />
                      {listing.verified ? t.verified : t.unverified}
                    </p>
                    {!listing.verified && <p className="mt-2 text-xs text-ink-400">{t.unverifiedHint}</p>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function chip(active: boolean): string {
  return `inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
    active
      ? 'border-brand-500 bg-brand-50 text-brand-700'
      : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]'
  }`;
}
