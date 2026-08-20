'use client';

/**
 * Панель администратора: одно место для того, что раньше было раскидано
 * по нижней части четырёх разных страниц. Одобрение и удаление происходят
 * прямо здесь, без выхода в Supabase Dashboard — до этой страницы у admin
 * не было ни одной кнопки «удалить» или «одобрить» в интерфейсе вообще,
 * только вставка новых записей.
 */

import { Suspense, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useStore } from '@/components/StoreProvider';
import { SchoolAuthGate } from '@/components/SchoolAuthGate';
import { Icon } from '@/components/Icon';
import { Badge, Button, Kicker, Panel, Skeleton } from '@/components/ui';
import type { Language } from '@/lib/types';
import {
  LEVEL_TITLES,
  PLACE_TITLES,
  achievementPoints,
  type AchievementLevel,
  type AchievementPlace,
} from '@/lib/portfolio';

interface DataRow {
  id: string;
  [key: string]: unknown;
}

const TEXT = {
  title: 'Панель администратора',
  subtitle: 'Одобрение, отклонение и удаление контента прямо на сайте.',
  pendingAchievements: 'Достижения на проверке',
  noPendingAchievements: 'Новых заявок на достижения нет.',
  achievementHint:
    'Проверьте диплом, прежде чем подтверждать: за подтверждённое достижение начисляются баллы в рейтинг школы.',
  proof: 'Диплом',
  noProof: 'без подтверждения',
  willGive: (points: number) => `+${points} баллов`,
  pendingListings: 'Объявления на модерации',
  noPending: 'Заявок на модерации нет.',
  approve: 'Одобрить',
  reject: 'Отклонить',
  approvedListings: 'Опубликованные возможности',
  events: 'Опубликованные события',
  announcements: 'Опубликованные объявления школы',
  archiveMaterials: 'Материалы архива от учителей и админов',
  delete: 'Удалить',
  confirmDelete: 'Удалить безвозвратно?',
  empty: 'Пока пусто.',
} as const;

/** Универсальный хук: тянет строки таблицы, обновляется по refreshKey. */
function useRows(table: string, select: string, refreshKey: number, filter?: [string, string]) {
  const [rows, setRows] = useState<DataRow[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let query = supabase.from(table).select(select).order('created_at', { ascending: false });
    if (filter) query = query.eq(filter[0], filter[1]);

    query.then(({ data }) => {
      if (!cancelled) setRows((data as DataRow[] | null) ?? []);
    });

    return () => {
      cancelled = true;
    };
  }, [table, select, refreshKey, filter?.[0], filter?.[1]]);

  return rows;
}

function DeleteButton({ table, id, onDone }: { table: string; id: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        if (!window.confirm(TEXT.confirmDelete)) return;
        setBusy(true);
        await createClient().from(table).delete().eq('id', id);
        setBusy(false);
        onDone();
      }}
      className="flex items-center gap-1 text-xs font-semibold text-danger-600 hover:underline disabled:opacity-50"
    >
      <Icon name="close" size={12} />
      {TEXT.delete}
    </button>
  );
}

function Row({ title, meta, children }: { title: string; meta: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink-900">{title}</p>
        <p className="text-xs text-ink-400">{meta}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-10">
      <Kicker>{title}</Kicker>
      <Panel className="mt-4 p-5">{children}</Panel>
    </div>
  );
}

function AdminPanel({ language }: { language: Language }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((key) => key + 1);

  const pendingListings = useRows(
    'published_listings',
    'id, title, author_name, category',
    refreshKey,
    ['status', 'pending'],
  );
  const approvedListings = useRows(
    'published_listings',
    'id, title, author_name, category',
    refreshKey,
    ['status', 'approved'],
  );
  const events = useRows('published_events', 'id, title, organizer, starts_at', refreshKey);
  const announcements = useRows('published_announcements', 'id, title, author, published_at', refreshKey);
  const archiveMaterials = useRows('archive_materials', 'id, title, category, subject', refreshKey);
  const pendingAchievements = useRows(
    'portfolio_achievements',
    'id, title, level, place, proof_path, student_id',
    refreshKey,
    ['status', 'pending'],
  );

  async function approve(id: string) {
    await createClient().from('published_listings').update({ status: 'approved' }).eq('id', id);
    bump();
  }

  /**
   * Подтверждение достижения начисляет баллы.
   *
   * Считаются здесь, на месте, и записываются в строку — шкала может
   * измениться, но уже подтверждённые достижения не должны переоцениваться
   * задним числом и перетасовывать рейтинг.
   */
  async function reviewAchievement(
    id: string,
    decision: 'approved' | 'rejected',
    level: AchievementLevel,
    place: AchievementPlace,
  ) {
    await createClient()
      .from('portfolio_achievements')
      .update({
        status: decision,
        points: decision === 'approved' ? achievementPoints(level, place) : 0,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);
    bump();
  }

  return (
    <div>
      <Section title={TEXT.pendingAchievements}>
        <p className="mb-4 text-xs text-ink-400">{TEXT.achievementHint}</p>

        {pendingAchievements === null ? (
          <Skeleton className="h-10 w-full" />
        ) : pendingAchievements.length === 0 ? (
          <p className="text-sm text-ink-500">{TEXT.noPendingAchievements}</p>
        ) : (
          pendingAchievements.map((row) => {
            const level = row.level as AchievementLevel;
            const place = row.place as AchievementPlace;
            const proofUrl = row.proof_path
              ? createClient()
                  .storage.from('achievement-proofs')
                  .getPublicUrl(String(row.proof_path)).data.publicUrl
              : null;

            return (
              <Row
                key={row.id}
                title={String(row.title)}
                meta={`${LEVEL_TITLES[level][language]} · ${PLACE_TITLES[place][language]} · ${
                  TEXT.willGive(achievementPoints(level, place))
                }`}
              >
                {proofUrl ? (
                  <a
                    href={proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-brand-600 hover:underline"
                  >
                    {TEXT.proof}
                  </a>
                ) : (
                  <span className="text-xs text-danger-600">{TEXT.noProof}</span>
                )}

                <Button size="sm" onClick={() => reviewAchievement(row.id, 'approved', level, place)}>
                  <Icon name="check" size={14} />
                  {TEXT.approve}
                </Button>

                <button
                  onClick={() => reviewAchievement(row.id, 'rejected', level, place)}
                  className="text-xs font-semibold text-danger-600 hover:underline"
                >
                  {TEXT.reject}
                </button>
              </Row>
            );
          })
        )}
      </Section>

      <Section title={TEXT.pendingListings}>
        {pendingListings === null ? (
          <Skeleton className="h-10 w-full" />
        ) : pendingListings.length === 0 ? (
          <p className="text-sm text-ink-500">{TEXT.noPending}</p>
        ) : (
          pendingListings.map((row) => (
            <Row key={row.id} title={String(row.title)} meta={`${row.author_name} · ${row.category}`}>
              <Button size="sm" onClick={() => approve(row.id)}>
                <Icon name="check" size={14} />
                {TEXT.approve}
              </Button>
              <DeleteButton table="published_listings" id={row.id} onDone={bump} />
            </Row>
          ))
        )}
      </Section>

      <Section title={TEXT.approvedListings}>
        {approvedListings === null ? (
          <Skeleton className="h-10 w-full" />
        ) : approvedListings.length === 0 ? (
          <p className="text-sm text-ink-500">{TEXT.empty}</p>
        ) : (
          approvedListings.map((row) => (
            <Row key={row.id} title={String(row.title)} meta={`${row.author_name} · ${row.category}`}>
              <DeleteButton table="published_listings" id={row.id} onDone={bump} />
            </Row>
          ))
        )}
      </Section>

      <Section title={TEXT.events}>
        {events === null ? (
          <Skeleton className="h-10 w-full" />
        ) : events.length === 0 ? (
          <p className="text-sm text-ink-500">{TEXT.empty}</p>
        ) : (
          events.map((row) => (
            <Row
              key={row.id}
              title={String(row.title)}
              meta={`${row.organizer} · ${new Date(String(row.starts_at)).toLocaleDateString(language)}`}
            >
              <DeleteButton table="published_events" id={row.id} onDone={bump} />
            </Row>
          ))
        )}
      </Section>

      <Section title={TEXT.announcements}>
        {announcements === null ? (
          <Skeleton className="h-10 w-full" />
        ) : announcements.length === 0 ? (
          <p className="text-sm text-ink-500">{TEXT.empty}</p>
        ) : (
          announcements.map((row) => (
            <Row
              key={row.id}
              title={String(row.title)}
              meta={`${row.author} · ${new Date(String(row.published_at)).toLocaleDateString(language)}`}
            >
              <DeleteButton table="published_announcements" id={row.id} onDone={bump} />
            </Row>
          ))
        )}
      </Section>

      <Section title={TEXT.archiveMaterials}>
        {archiveMaterials === null ? (
          <Skeleton className="h-10 w-full" />
        ) : archiveMaterials.length === 0 ? (
          <p className="text-sm text-ink-500">{TEXT.empty}</p>
        ) : (
          archiveMaterials.map((row) => (
            <Row key={row.id} title={String(row.title)} meta={String(row.category)}>
              <Badge>{String(row.subject)}</Badge>
              <DeleteButton table="archive_materials" id={row.id} onDone={bump} />
            </Row>
          ))
        )}
      </Section>
    </div>
  );
}

export default function AdminPage() {
  const { state } = useStore();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold text-ink-900 sm:text-4xl">{TEXT.title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-500">{TEXT.subtitle}</p>

      <div className="mt-10">
        <Suspense fallback={null}>
          <SchoolAuthGate requireRole="admin" language={state.language}>
            {() => <AdminPanel language={state.language} />}
          </SchoolAuthGate>
        </Suspense>
      </div>
    </div>
  );
}
