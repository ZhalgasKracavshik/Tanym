'use client';

/**
 * Модерация: то, что ждёт решения администратора.
 *
 * Отделено от опубликованного контента намеренно. Проверка заявок —
 * работа с очередью, у неё есть конец: разобрал и ушёл. Управление
 * опубликованным — работа со справочником, туда заходят по поводу.
 * Смешанные в одном свитке, они мешали друг другу: очередь терялась
 * среди сотни записей, которые трогать не надо.
 */

import { Suspense, useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import { SchoolAuthGate } from '@/components/SchoolAuthGate';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/Icon';
import { Button, Skeleton } from '@/components/ui';
import type { Language } from '@/lib/types';
import {
  LEVEL_TITLES,
  PLACE_TITLES,
  achievementPoints,
  type AchievementLevel,
  type AchievementPlace,
} from '@/lib/portfolio';
import { ADMIN_TEXT, AdminShell, Row, Section, useRows } from '../parts';

const TEXT = {
  pendingAchievements: 'Достижения на проверке',
  noPendingAchievements: 'Новых заявок на достижения нет.',
  achievementHint:
    'Проверьте диплом, прежде чем подтверждать: за подтверждённое достижение начисляются баллы в рейтинг школы.',
  proof: 'Диплом',
  noProof: 'без подтверждения',
  willGive: (points: number) => `+${points} баллов`,
  pendingListings: 'Объявления на модерации',
  noPending: 'Заявок на модерации нет.',
} as const;

function ModerationPanel({ language }: { language: Language }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((key) => key + 1);

  const pendingAchievements = useRows(
    'portfolio_achievements',
    'id, title, level, place, proof_path, student_id',
    refreshKey,
    ['status', 'pending'],
  );
  const pendingListings = useRows(
    'published_listings',
    'id, title, author_name, category',
    refreshKey,
    ['status', 'pending'],
  );

  async function approveListing(id: string) {
    await createClient().from('published_listings').update({ status: 'approved' }).eq('id', id);
    bump();
  }

  /**
   * Подтверждение достижения начисляет баллы.
   *
   * Считаются на месте и записываются в строку: шкала может измениться, но
   * уже подтверждённые достижения не должны переоцениваться задним числом
   * и перетасовывать рейтинг школы.
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
                meta={`${LEVEL_TITLES[level][language]} · ${PLACE_TITLES[place][language]} · ${TEXT.willGive(
                  achievementPoints(level, place),
                )}`}
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
                  {ADMIN_TEXT.approve}
                </Button>

                <button
                  onClick={() => reviewAchievement(row.id, 'rejected', level, place)}
                  className="text-xs font-semibold text-danger-600 hover:underline"
                >
                  {ADMIN_TEXT.reject}
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
            <Row
              key={row.id}
              title={String(row.title)}
              meta={`${String(row.author_name ?? '')} · ${String(row.category ?? '')}`}
            >
              <Button size="sm" onClick={() => approveListing(row.id)}>
                <Icon name="check" size={14} />
                {ADMIN_TEXT.approve}
              </Button>
            </Row>
          ))
        )}
      </Section>
    </div>
  );
}

export default function AdminModerationPage() {
  const { state } = useStore();

  return (
    <AdminShell title="Модерация" description="Заявки, которые ждут решения. Разобрали — очередь пуста.">
      <Suspense fallback={null}>
        <SchoolAuthGate requireRole="admin" language={state.language}>
          {() => <ModerationPanel language={state.language} />}
        </SchoolAuthGate>
      </Suspense>
    </AdminShell>
  );
}
