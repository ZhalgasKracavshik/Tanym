'use client';

/**
 * Страница одного объявления «Возможностей».
 *
 * Раньше объявление существовало только строкой в общей сетке — открыть его
 * отдельно было негде. Это мешало не только читателю: администратор,
 * проверяя заявку в модерации, видел лишь название, автора и категорию —
 * ни описания, ни расписания, ни того, на что он ставит галочку «проверено
 * школой». Решение принималось не глядя на то, что решают.
 *
 * RLS отдаёт эту страницу и одобренным всем, и автору его собственную
 * заявку, и администратору — любую. Никакой отдельной проверки прав в коде
 * поэтому не нужно: если запрос вернул строку, значит смотреть на неё уже
 * можно.
 */

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LISTING_TYPES } from '@/lib/listings';
import type { ListingType } from '@/lib/listings';
import type { Dict } from '@/lib/i18n';
import { useStore } from '@/components/StoreProvider';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { createClient } from '@/lib/supabase/client';
import { OwnerActions } from '@/components/OwnerActions';
import { Icon } from '@/components/Icon';
import { Badge, Button, ButtonLink, EmptyState, Kicker, Skeleton } from '@/components/ui';
import { Reveal } from '@/components/motion';

const TEXT: Dict<{
  back: string;
  notFoundTitle: string;
  notFoundText: string;
  free: string;
  perLesson: string;
  online: string;
  offline: string;
  both: string;
  schedule: string;
  contact: string;
  verified: string;
  unverified: string;
  unverifiedHint: string;
  pendingTitle: string;
  pendingText: string;
  verifiedToggle: string;
  approve: string;
  approving: string;
}> = {
  ru: {
    back: 'Назад к возможностям',
    notFoundTitle: 'Объявление не найдено',
    notFoundText: 'Его могли удалить, или ссылка устарела. На «Возможностях» — всё, что есть сейчас.',
    free: 'Бесплатно',
    perLesson: 'тг',
    online: 'Онлайн',
    offline: 'Очно',
    both: 'Очно и онлайн',
    schedule: 'Когда',
    contact: 'Как связаться',
    verified: 'Проверено школой',
    unverified: 'Без проверки школы',
    unverifiedHint: 'Школа не проверяла это предложение. Обсуди с родителями, прежде чем платить.',
    pendingTitle: 'На проверке',
    pendingText: 'Объявление ещё не одобрено и видно только вам и администрации.',
    verifiedToggle: 'Пометить как проверенное школой',
    approve: 'Опубликовать',
    approving: 'Публикуем…',
  },
  kk: {
    back: 'Мүмкіндіктерге оралу',
    notFoundTitle: 'Хабарландыру табылмады',
    notFoundText: 'Ол жойылған болуы мүмкін немесе сілтеме ескірген. «Мүмкіндіктерде» — қазір барының бәрі.',
    free: 'Тегін',
    perLesson: 'тг',
    online: 'Онлайн',
    offline: 'Қатысып',
    both: 'Қатысып және онлайн',
    schedule: 'Қашан',
    contact: 'Байланыс',
    verified: 'Мектеп тексерген',
    unverified: 'Мектеп тексермеген',
    unverifiedHint: 'Мектеп бұл ұсынысты тексерген жоқ. Төлемес бұрын ата-анаңмен ақылдас.',
    pendingTitle: 'Тексеруде',
    pendingText: 'Хабарландыру әлі мақұлданбаған, оны тек сіз бен әкімшілік көреді.',
    verifiedToggle: 'Мектеп тексерген деп белгілеу',
    approve: 'Жариялау',
    approving: 'Жариялануда…',
  },
  en: {
    back: 'Back to opportunities',
    notFoundTitle: 'Listing not found',
    notFoundText: 'It may have been removed, or the link is out of date. Opportunities has everything current.',
    free: 'Free',
    perLesson: 'KZT',
    online: 'Online',
    offline: 'In person',
    both: 'In person and online',
    schedule: 'When',
    contact: 'Contact',
    verified: 'Verified by school',
    unverified: 'Not verified by school',
    unverifiedHint: 'The school has not vetted this offer. Talk to your parents before paying.',
    pendingTitle: 'Pending review',
    pendingText: 'Not approved yet — only you and the school administration can see it.',
    verifiedToggle: 'Mark as verified by school',
    approve: 'Publish',
    approving: 'Publishing…',
  },
};

const TYPE_BANNER: Record<ListingType, string> = {
  'school-club': 'bg-success-600',
  'teacher-course': 'bg-brand-500',
  'student-service': 'bg-accent-500',
  'external-center': 'bg-ink-700',
};

interface ListingRow {
  id: string;
  admin_id: string;
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
  status: string;
  cover_path: string | null;
}

export default function ListingPage({ params }: PageProps<'/marketplace/[id]'>) {
  const { id } = use(params);
  const { state } = useStore();
  const router = useRouter();
  const { profile } = useSchoolAuth();
  const t = TEXT[state.language];

  const [row, setRow] = useState<ListingRow | null | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const [verifiedDraft, setVerifiedDraft] = useState<boolean | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from('published_listings')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setRow((data as ListingRow | null) ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [id, refreshKey]);

  if (row === undefined) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="aspect-[16/9] w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (row === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          icon="backpack"
          title={t.notFoundTitle}
          description={t.notFoundText}
          action={
            <ButtonLink href="/marketplace" variant="secondary">
              {t.back}
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const meta = LISTING_TYPES.find((item) => item.id === row.type);
  const coverUrl = row.cover_path
    ? createClient().storage.from('card-covers').getPublicUrl(row.cover_path).data.publicUrl
    : null;
  const isAdmin = profile?.role === 'admin';
  const formatLabel = { online: t.online, offline: t.offline, both: t.both };
  const verified = verifiedDraft ?? row.verified;

  async function approve() {
    setPublishing(true);
    await createClient()
      .from('published_listings')
      .update({ status: 'approved', verified })
      .eq('id', id);
    setPublishing(false);
    setRefreshKey((key) => key + 1);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-ink-500 outline-none transition-colors duration-150 hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <Icon name="arrow-left" size={16} />
          {t.back}
        </Link>

        {/*
          Убрать карточку может её автор или администрация — и делают это
          отсюда, со страницы самой карточки. Раньше для этого нужно было
          знать про раздел «Контент» в админке, а автор туда не ходит вовсе.
        */}
        <OwnerActions
          table="published_listings"
          id={row.id}
          authorId={row.admin_id}
          onRemoved={() => router.push('/marketplace')}
        />
      </div>

      <Reveal immediate>
        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Kicker>{meta?.title[state.language]}</Kicker>
            <h1 className="mt-2 text-3xl font-medium text-ink-900 sm:text-4xl">{row.title}</h1>
            <p className="mt-2 text-sm text-ink-500">
              {row.author_name} · {row.author_role}
            </p>
          </div>
        </div>
      </Reveal>

      {row.status === 'pending' && (
        <div className="mt-6 flex items-start gap-3 rounded-[var(--radius-card)] border border-accent-200 bg-accent-50 p-4">
          <Icon name="clock" size={18} className="mt-0.5 shrink-0 text-accent-600" />
          <div>
            <p className="text-sm font-semibold text-accent-700">{t.pendingTitle}</p>
            <p className="mt-1 text-sm text-accent-700">{t.pendingText}</p>
          </div>
        </div>
      )}

      <div className="mt-6">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- внешний бакет, домен для next/image не настроен
          <img
            src={coverUrl}
            alt=""
            className="aspect-[16/9] w-full rounded-[var(--radius-card)] object-cover"
          />
        ) : (
          <div
            className={`flex aspect-[16/9] items-end rounded-[var(--radius-card)] p-6 sm:p-8 ${TYPE_BANNER[row.type]}`}
          >
            <span className="text-3xl font-medium leading-tight text-white/90 sm:text-4xl">
              {meta?.title[state.language]}
            </span>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Badge tone={row.price === null ? 'success' : 'neutral'} className="tabular-nums">
          {row.price === null
            ? t.free
            : `${row.price.toLocaleString('ru-RU')} ${t.perLesson}${row.price_note ? ` / ${row.price_note}` : ''}`}
        </Badge>
        <Badge tone="neutral">{formatLabel[row.format]}</Badge>
        <Badge tone={row.verified ? 'success' : 'neutral'}>
          <Icon name={row.verified ? 'check' : 'close'} size={13} />
          {row.verified ? t.verified : t.unverified}
        </Badge>
      </div>

      {!row.verified && row.status === 'approved' && (
        <p className="mt-3 text-sm text-ink-400">{t.unverifiedHint}</p>
      )}

      {row.description && (
        <section className="mt-8">
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-700">{row.description}</p>
        </section>
      )}

      <dl className="mt-8 space-y-3 border-t border-ink-200 pt-6 text-sm">
        <div className="flex gap-2">
          <dt className="shrink-0 font-semibold text-ink-500">{t.schedule}:</dt>
          <dd className="text-ink-800">{row.schedule}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 font-semibold text-ink-500">{t.contact}:</dt>
          <dd className="text-ink-800">{row.contact}</dd>
        </div>
      </dl>

      {/*
        Решение о галочке принимается здесь же, а не заранее в форме
        публикации. Форма фиксировала «проверено школой» ещё до того, как
        кто-то из школы это увидел — по сути, автор сам себе её ставил.
        Теперь это решает администратор, глядя на полное объявление, а не
        на одну строку в очереди.
      */}
      {isAdmin && row.status === 'pending' && (
        <div className="mt-8 space-y-4 border-t border-ink-200 pt-6">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-800">
            <input
              type="checkbox"
              checked={verified}
              onChange={(event) => setVerifiedDraft(event.target.checked)}
            />
            {t.verifiedToggle}
          </label>
          <Button onClick={approve} disabled={publishing}>
            <Icon name="check" size={16} />
            {publishing ? t.approving : t.approve}
          </Button>
        </div>
      )}
    </div>
  );
}
