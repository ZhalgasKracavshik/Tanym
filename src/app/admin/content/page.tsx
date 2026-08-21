'use client';

/**
 * Опубликованный контент: справочник всего, что уже видно школе.
 *
 * Здесь ничего не ждёт решения — сюда заходят, чтобы найти конкретную
 * запись и убрать или проверить её. Поэтому разделы свёрнуты во вкладки
 * по типу: искать событие среди объявлений и материалов архива дольше,
 * чем сначала выбрать «События».
 */

import { Suspense, useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import { SchoolAuthGate } from '@/components/SchoolAuthGate';
import { Skeleton } from '@/components/ui';
import { formatAnnouncementDate } from '@/lib/announcements';
import { ADMIN_TEXT, AdminShell, DeleteButton, Row, Section, useRows } from '../parts';

type TabId = 'listings' | 'events' | 'announcements' | 'archive';

const TABS: { id: TabId; label: string }[] = [
  { id: 'listings', label: 'Возможности' },
  { id: 'events', label: 'События' },
  { id: 'announcements', label: 'Объявления' },
  { id: 'archive', label: 'Материалы' },
];

function ContentPanel() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [tab, setTab] = useState<TabId>('listings');
  const bump = () => setRefreshKey((key) => key + 1);

  const listings = useRows('published_listings', 'id, title, author_name, category', refreshKey, [
    'status',
    'approved',
  ]);
  const events = useRows('published_events', 'id, title, organizer, starts_at', refreshKey);
  const announcements = useRows('published_announcements', 'id, title, author, published_at', refreshKey);
  const materials = useRows('archive_materials', 'id, title, category, subject', refreshKey);

  const current =
    tab === 'listings' ? listings : tab === 'events' ? events : tab === 'announcements' ? announcements : materials;

  const table =
    tab === 'listings'
      ? 'published_listings'
      : tab === 'events'
        ? 'published_events'
        : tab === 'announcements'
          ? 'published_announcements'
          : 'archive_materials';

  /*
    Дата приводится к алматинскому виду через ту же функцию, что и на
    доске объявлений: две разные записи одной даты в одном приложении
    выглядят как ошибка, даже когда обе верны.
  */
  function shortDate(value: unknown): string {
    const raw = String(value ?? '');
    return raw ? formatAnnouncementDate(raw, 'ru') : '';
  }

  function meta(row: Record<string, unknown>): string {
    if (tab === 'listings') return `${String(row.author_name ?? '')} · ${String(row.category ?? '')}`;
    if (tab === 'events') return `${String(row.organizer ?? '')} · ${shortDate(row.starts_at)}`;
    if (tab === 'announcements') {
      return `${String(row.author ?? '')} · ${shortDate(row.published_at)}`;
    }
    return `${String(row.category ?? '')} · ${String(row.subject ?? '')}`;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            aria-pressed={tab === item.id}
            className={`rounded-[var(--radius-control)] border px-4 py-2 text-sm font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
              tab === item.id
                ? 'border-brand-300 bg-brand-50 text-brand-700'
                : 'border-ink-200 bg-white text-ink-500 hover:border-brand-200 hover:text-brand-600'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Section title={TABS.find((item) => item.id === tab)!.label}>
        {current === null ? (
          <Skeleton className="h-10 w-full" />
        ) : current.length === 0 ? (
          <p className="text-sm text-ink-500">{ADMIN_TEXT.empty}</p>
        ) : (
          current.map((row) => (
            <Row key={row.id} title={String(row.title)} meta={meta(row)}>
              <DeleteButton table={table} id={row.id} onDone={bump} />
            </Row>
          ))
        )}
      </Section>
    </div>
  );
}

export default function AdminContentPage() {
  const { state } = useStore();

  return (
    <AdminShell title="Контент" description="Всё, что уже опубликовано и видно школе.">
      <Suspense fallback={null}>
        <SchoolAuthGate requireRole="admin" language={state.language}>
          {() => <ContentPanel />}
        </SchoolAuthGate>
      </Suspense>
    </AdminShell>
  );
}
