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

import { useState } from 'react';
import { LISTINGS } from '@/data/listings';
import { LISTING_TYPES } from '@/lib/listings';
import type { Listing, ListingType } from '@/lib/listings';
import type { Dict } from '@/lib/i18n';
import { useStore } from '@/components/StoreProvider';
import { PublishForm } from './PublishForm';
import { Icon } from '@/components/Icon';
import { Badge, Button, Card, EmptyState } from '@/components/ui';

const TEXT: Dict<{
  title: string;
  subtitle: string;
  all: string;
  mine: string;
  free: string;
  perLesson: string;
  verified: string;
  unverified: string;
  unverifiedHint: string;
  pending: string;
  pendingHint: string;
  spots: (n: number) => string;
  noSpots: string;
  schedule: string;
  contact: string;
  online: string;
  offline: string;
  both: string;
  remove: string;
  confirmRemove: (title: string) => string;
  empty: string;
  emptyMine: string;
  safety: string;
}> = {
  ru: {
    title: 'Возможности',
    subtitle: 'Секции, курсы, помощь старших и волонтёрство: всё, что есть вокруг школы.',
    all: 'Все',
    mine: 'Мои объявления',
    free: 'Бесплатно',
    perLesson: 'тг',
    verified: 'Проверено школой',
    unverified: 'Без проверки школы',
    unverifiedHint: 'Школа не проверяла это предложение. Обсуди с родителями, прежде чем платить.',
    pending: 'На модерации',
    pendingHint: 'Объявление увидят другие после проверки школой.',
    spots: (n) => (n === 1 ? 'осталось 1 место' : n < 5 ? `осталось ${n} места` : `осталось ${n} мест`),
    noSpots: 'мест нет',
    schedule: 'Когда',
    contact: 'Как связаться',
    online: 'Онлайн',
    offline: 'Очно',
    both: 'Очно и онлайн',
    remove: 'Снять',
    confirmRemove: (title) => `Снять объявление «${title}»?`,
    empty: 'В этой категории пока нет объявлений.',
    emptyMine: 'Вы пока ничего не размещали.',
    safety: 'Никогда не переводи деньги вперёд незнакомым людям и не встречайся один. Скажи об этом родителям.',
  },
  kk: {
    title: 'Мүмкіндіктер',
    subtitle: 'Үйірмелер, курстар, үлкендердің көмегі және волонтёрлық: мектеп айналасындағының бәрі.',
    all: 'Барлығы',
    mine: 'Менің хабарландыруларым',
    free: 'Тегін',
    perLesson: 'тг',
    verified: 'Мектеп тексерген',
    unverified: 'Мектеп тексермеген',
    unverifiedHint: 'Мектеп бұл ұсынысты тексерген жоқ. Төлемес бұрын ата-анаңмен ақылдас.',
    pending: 'Модерацияда',
    pendingHint: 'Хабарландыруды мектеп тексергеннен кейін басқалар көреді.',
    spots: (n) => `${n} орын қалды`,
    noSpots: 'орын жоқ',
    schedule: 'Қашан',
    contact: 'Байланыс',
    online: 'Онлайн',
    offline: 'Қатысып',
    both: 'Қатысып және онлайн',
    remove: 'Алып тастау',
    confirmRemove: (title) => `«${title}» хабарландыруы алынсын ба?`,
    empty: 'Бұл санатта әзірге хабарландыру жоқ.',
    emptyMine: 'Сіз әзірге ештеңе жарияламадыңыз.',
    safety: 'Бейтаныс адамдарға ақшаны алдын ала аударма және жалғыз кездеспе. Бұл туралы ата-анаңа айт.',
  },
  en: {
    title: 'Opportunities',
    subtitle: 'Clubs, courses, peer tutoring and volunteering: everything around the school.',
    all: 'All',
    mine: 'My listings',
    free: 'Free',
    perLesson: 'KZT',
    verified: 'Verified by school',
    unverified: 'Not verified by school',
    unverifiedHint: 'The school has not vetted this offer. Talk to your parents before paying.',
    pending: 'Under review',
    pendingHint: 'Others will see your listing once the school reviews it.',
    spots: (n) => (n === 1 ? '1 spot left' : `${n} spots left`),
    noSpots: 'no spots left',
    schedule: 'When',
    contact: 'Contact',
    online: 'Online',
    offline: 'In person',
    both: 'In person and online',
    remove: 'Remove',
    confirmRemove: (title) => `Remove the listing “${title}”?`,
    empty: 'No listings in this category yet.',
    emptyMine: 'You have not posted anything yet.',
    safety: 'Never send money upfront to strangers and never meet alone. Tell your parents about it.',
  },
};

export default function MarketplacePage() {
  const { state, removeListing } = useStore();
  const t = TEXT[state.language];

  const [filter, setFilter] = useState<ListingType | 'all' | 'mine'>('all');

  const all: Listing[] = [...state.myListings, ...LISTINGS];

  const visible = all.filter((listing) => {
    if (filter === 'all') return true;
    if (filter === 'mine') return listing.pending === true;
    return listing.type === filter;
  });

  /** Бесплатное и проверенное — выше. Свои объявления всегда первыми. */
  const sorted = [...visible].sort((a, b) => {
    if (a.pending !== b.pending) return a.pending ? -1 : 1;
    if (a.verified !== b.verified) return a.verified ? -1 : 1;
    const priceA = a.price ?? 0;
    const priceB = b.price ?? 0;
    return priceA - priceB;
  });

  const formatLabel = { online: t.online, offline: t.offline, both: t.both };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">{t.title}</h1>
      <p className="mt-2 text-ink-500">{t.subtitle}</p>

      {/* Предупреждение о безопасности: аудитория — подростки, и часть
          объявлений размещают посторонние люди */}
      <div className="mt-6 rounded-2xl border border-accent-200 bg-accent-50 p-4">
        <p className="flex items-center gap-2 text-sm text-accent-700">
          <Icon name="alert" size={18} />
          {t.safety}
        </p>
      </div>

      {/* Фильтры */}
      <div className="mt-6 flex flex-wrap gap-2">
        <button onClick={() => setFilter('all')} className={chip(filter === 'all')}>
          {t.all}
        </button>
        {LISTING_TYPES.map((type) => (
          <button key={type.id} onClick={() => setFilter(type.id)} className={chip(filter === type.id)}>
            <Icon name={type.icon} size={16} />
            {type.title[state.language]}
          </button>
        ))}
        {state.myListings.length > 0 && (
          <button onClick={() => setFilter('mine')} className={chip(filter === 'mine')}>
            <Icon name="pencil" size={16} />
            <span className="tabular-nums">
              {t.mine} ({state.myListings.length})
            </span>
          </button>
        )}
      </div>

      {/* Форма размещения */}
      <div className="mt-6">
        <PublishForm />
      </div>

      {sorted.length === 0 ? (
        <div className="mt-6">
          <EmptyState title={filter === 'mine' ? t.emptyMine : t.empty} description="" />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {sorted.map((listing) => {
            const meta = LISTING_TYPES.find((type) => type.id === listing.type);
            return (
              <Card key={listing.id} className={listing.pending ? 'border-accent-200 bg-accent-50' : ''}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand">
                    {meta && <Icon name={meta.icon} size={14} />}
                    {meta?.title[state.language]}
                  </Badge>
                  <Badge tone={listing.price === null ? 'success' : 'neutral'} className="tabular-nums">
                    {listing.price === null
                      ? t.free
                      : `${listing.price.toLocaleString('ru-RU')} ${t.perLesson}${
                          listing.priceNote ? ` / ${listing.priceNote}` : ''
                        }`}
                  </Badge>
                  {listing.pending && <Badge tone="accent">{t.pending}</Badge>}
                </div>

                <h2 className="mt-3 font-bold text-ink-900">{listing.title}</h2>
                <p className="mt-1 text-sm text-ink-400">
                  {listing.authorName} · {listing.authorRole}
                </p>
                <p className="mt-2 text-sm text-ink-600">{listing.description}</p>

                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-ink-400">{t.schedule}:</dt>
                    <dd className="text-ink-700">{listing.schedule}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-ink-400">{t.contact}:</dt>
                    <dd className="text-ink-700">{listing.contact}</dd>
                  </div>
                </dl>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-lg bg-ink-50 px-2 py-1 text-ink-600">{listing.category}</span>
                  <span className="rounded-lg bg-ink-50 px-2 py-1 text-ink-600">
                    {formatLabel[listing.format]}
                  </span>
                  {listing.spots !== undefined && (
                    <span
                      className={`rounded-lg px-2 py-1 font-semibold tabular-nums ${
                        listing.spots > 0 ? 'bg-success-50 text-success-700' : 'bg-ink-100 text-ink-500'
                      }`}
                    >
                      {listing.spots > 0 ? t.spots(listing.spots) : t.noSpots}
                    </span>
                  )}
                </div>

                {/* Отметка о проверке — ученик должен видеть разницу между
                    школьной секцией и предложением постороннего человека */}
                <p
                  className={`mt-3 flex items-center gap-2 text-xs ${
                    listing.verified ? 'font-semibold text-success-700' : 'text-ink-400'
                  }`}
                >
                  <Icon name={listing.verified ? 'check' : 'close'} size={14} />
                  {listing.verified ? t.verified : t.unverified}
                </p>
                {!listing.verified && !listing.pending && (
                  <p className="mt-1 text-xs text-ink-400">{t.unverifiedHint}</p>
                )}
                {listing.pending && <p className="mt-1 text-xs text-accent-700">{t.pendingHint}</p>}

                {listing.pending && (
                  <div className="mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(t.confirmRemove(listing.title))) removeListing(listing.id);
                      }}
                    >
                      {t.remove}
                    </Button>
                  </div>
                )}
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
