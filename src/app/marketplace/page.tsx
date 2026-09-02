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
import Link from 'next/link';
import { LISTING_TYPES } from '@/lib/listings';
import type { Listing, ListingType } from '@/lib/listings';
import type { Dict } from '@/lib/i18n';
import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';
import { EmptyState, Kicker } from '@/components/ui';
import { OpportunityCard } from '@/components/ui/opportunity-card';
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
  whoRuns: string;
  unverifiedHint: string;
  more: string;
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
    whoRuns: 'Кто ведёт',
    unverifiedHint: 'Школа не проверяла это предложение. Обсуди с родителями, прежде чем платить.',
    more: 'Подробнее',
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
    whoRuns: 'Кім жүргізеді',
    unverifiedHint: 'Мектеп бұл ұсынысты тексерген жоқ. Төлемес бұрын ата-анаңмен ақылдас.',
    more: 'Толығырақ',
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
    whoRuns: 'Who runs it',
    unverifiedHint: 'The school has not vetted this offer. Talk to your parents before paying.',
    more: 'Details',
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
        <div className="mt-10 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/*
            auto-rows-fr держит все карточки одной высоты.

            Без него строки сетки считают высоту независимо друг от друга: в
            полной строке карточка тянется до самой высокой соседки, а в
            неполной последней — сжимается по своему содержимому. Замер на
            четырёх объявлениях: 501, 501, 501 и 479 — последняя ниже на 22
            пикселя просто потому, что осталась одна в строке.
          */}
          {sorted.map((listing) => {
            const meta = LISTING_TYPES.find((type) => type.id === listing.type);

            /*
              Короткая строка справа от метки собирается из того, что
              действительно есть у объявления: цена, формат и остаток мест.
              Пустые части не дают «· ·» посреди строки.
            */
            const metaParts = [
              listing.price === null
                ? t.free
                : `${listing.price.toLocaleString('ru-RU')} ${t.perLesson}${
                    listing.priceNote ? ` / ${listing.priceNote}` : ''
                  }`,
              formatLabel[listing.format],
              listing.spots !== undefined
                ? listing.spots > 0
                  ? t.spots(listing.spots)
                  : t.noSpots
                : null,
            ].filter(Boolean) as string[];

            return (
              <Link
                key={listing.id}
                href={`/marketplace/${listing.id}`}
                className="group block h-full rounded-[var(--radius-card)] outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <OpportunityCard
                  headline={listing.title}
                  excerpt={listing.description}
                  cover={listing.coverUrl}
                  fallbackClassName={TYPE_BANNER[listing.type]}
                  tag={meta?.title[state.language]}
                  tagIcon={meta?.icon}
                  meta={metaParts.join(' · ')}
                  writer={listing.authorName}
                  writerRole={listing.authorRole}
                  writerLabel={t.whoRuns}
                  action={t.more}
                  /*
                    Проверка школой переехала из подвала в правый верхний
                    угол шапки — туда же, где в афише стоит статус записи.
                    Это первое, о чём спрашивают про чужое объявление, и
                    внизу мелким шрифтом оно терялось.
                  */
                  badge={
                    <span
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-pill)] bg-white/85 px-2.5 py-1 text-xs font-bold backdrop-blur-sm ${
                        listing.verified ? 'text-success-700' : 'text-ink-500'
                      }`}
                    >
                      <Icon name={listing.verified ? 'check' : 'close'} size={13} />
                      {listing.verified ? t.verified : t.unverified}
                    </span>
                  }
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function chip(active: boolean): string {
  return `inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 [@media(pointer:coarse)]:min-h-11 ${
    active
      ? 'border-brand-500 bg-brand-50 text-brand-700'
      : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]'
  }`;
}
