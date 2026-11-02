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
import Link from 'next/link';
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
import { useProofUrl } from '@/lib/supabase/proofUrl';
import { formatEventDate } from '@/lib/events';
import { almatyDateIso } from '@/lib/date';

const TEXT = {
  pendingAchievements: 'Достижения на проверке',
  noPendingAchievements: 'Новых заявок на достижения нет.',
  achievementHint:
    'Проверьте диплом, прежде чем подтверждать: за подтверждённое достижение начисляются баллы в рейтинг школы.',
  proof: 'Диплом',
  noProof: 'без подтверждения',
  willGive: (points: number) => `+${points} баллов`,
  pendingEvents: 'Предложенные события',
  noPendingEvents: 'Новых событий на проверке нет.',
  eventHint:
    'Проверьте даты и ссылку на регистрацию: после одобрения событие увидят все, и оно может стать «ближайшим дедлайном» у учеников.',
  pendingListings: 'Объявления на модерации',
  noPending: 'Заявок на модерации нет.',
  /*
    Открывает саму заявку — карточку достижения или страницу объявления
    целиком, — а не только скан или строку с названием. Решение о баллах
    или галочке «проверено школой» принимается там, глядя на заявку так,
    как её увидят все, а не по одной строке в этой очереди.
  */
  open: 'Открыть',
  reasonLabel: 'Причина отказа — её увидит автор',
  reasonPlaceholder: 'Например: нет ссылки на организатора, такое событие уже есть, сроки не совпадают с источником',
  confirmReject: 'Отклонить',
  cancel: 'Отмена',
  reviewFailed: 'Не сохранилось. Проверьте связь и попробуйте ещё раз.',
  reviewChanged: 'Автор изменил событие после того, как оно попало в очередь. Откройте его и проверьте заново.',
  reload: 'Обновить очередь',
} as const;

/**
 * Строка события в очереди: одобрить сразу, отклонить — с причиной.
 * Кнопки блокируются на время запроса: двойной клик раньше отправлял два
 * обновления, а ошибка сохранения проходила молча.
 */
function EventReviewRow({
  id,
  title,
  meta,
  seenVersion,
  reviewerId,
  onDone,
}: {
  id: string;
  title: string;
  meta: string;
  /** updated_at, с которым событие пришло в очередь: одобряем ровно эту версию. */
  seenVersion: string;
  reviewerId: string;
  onDone: () => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<false | 'error' | 'changed'>(false);

  async function review(decision: 'approved' | 'rejected') {
    setBusy(true);
    setFailed(false);
    const { data, error } = await createClient()
      .from('published_events')
      .update({
        status: decision,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: decision === 'rejected' ? reason.trim().slice(0, 500) || null : null,
        // Одобряя, админ сверяет сроки с источником — это и есть проверка.
        ...(decision === 'approved' ? { verified_at: almatyDateIso() } : {}),
      })
      .eq('id', id)
      /*
        Только та версия, которую админ видел: автор может править событие,
        пока оно на проверке, и без этого условия одобрялась бы уже
        подменённая ссылка на регистрацию (см. pilot_event_review_integrity).
      */
      .eq('updated_at', seenVersion)
      .select('id');
    setBusy(false);
    if (error) {
      setFailed('error');
      return;
    }
    if (!data || data.length === 0) {
      setFailed('changed');
      return;
    }
    onDone();
  }

  return (
    <div>
      <Row title={title} meta={meta}>
        <Link href={`/events/${id}`} className="flex items-center gap-1 text-xs font-semibold text-ink-600 hover:underline">
          {TEXT.open}
          <Icon name="arrow-right" size={12} />
        </Link>
        <Button size="sm" disabled={busy} onClick={() => review('approved')}>
          <Icon name="check" size={14} />
          {ADMIN_TEXT.approve}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => setRejecting((value) => !value)}>
          {ADMIN_TEXT.reject}
        </Button>
      </Row>
      {rejecting && (
        <div className="mb-3 space-y-2 rounded-xl border border-ink-100 bg-ink-50/60 p-3">
          <label htmlFor={`reason-${id}`} className="text-xs font-semibold text-ink-600">
            {TEXT.reasonLabel}
          </label>
          <textarea
            id={`reason-${id}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            rows={2}
            placeholder={TEXT.reasonPlaceholder}
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => review('rejected')}>
              {TEXT.confirmReject}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setRejecting(false)}>
              {TEXT.cancel}
            </Button>
          </div>
        </div>
      )}
      {failed && (
        <p className="mb-3 text-xs font-semibold text-danger-600">
          {failed === 'changed' ? TEXT.reviewChanged : TEXT.reviewFailed}
          {failed === 'changed' && (
            <button type="button" onClick={onDone} className="ml-2 underline">
              {TEXT.reload}
            </button>
          )}
        </p>
      )}
    </div>
  );
}

function ModerationPanel({ language, reviewerId }: { language: Language; reviewerId: string }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((key) => key + 1);

  const pendingAchievements = useRows(
    'portfolio_achievements',
    'id, title, level, place, proof_path, student_id',
    refreshKey,
    ['status', 'pending'],
  );
  const pendingEvents = useRows(
    'published_events',
    'id, title, organizer, registration_deadline, updated_at',
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

            return (
              <Row
                key={row.id}
                title={String(row.title)}
                meta={`${LEVEL_TITLES[level][language]} · ${PLACE_TITLES[place][language]} · ${TEXT.willGive(
                  achievementPoints(level, place),
                )}`}
              >
                <Link
                  href={`/achievements/${row.id}`}
                  className="flex items-center gap-1 text-xs font-semibold text-ink-600 hover:underline"
                >
                  {TEXT.open}
                  <Icon name="arrow-right" size={12} />
                </Link>

                <ProofLink path={row.proof_path ? String(row.proof_path) : null} />

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

      <Section title={TEXT.pendingEvents}>
        <p className="mb-4 text-xs text-ink-400">{TEXT.eventHint}</p>
        {pendingEvents === null ? (
          <Skeleton className="h-10 w-full" />
        ) : pendingEvents.length === 0 ? (
          <p className="text-sm text-ink-500">{TEXT.noPendingEvents}</p>
        ) : (
          pendingEvents.map((row) => (
            <EventReviewRow
              key={row.id}
              id={String(row.id)}
              title={String(row.title)}
              meta={`${String(row.organizer ?? '')} · до ${formatEventDate(String(row.registration_deadline), language)}`}
              seenVersion={String(row.updated_at ?? '')}
              reviewerId={reviewerId}
              onDone={bump}
            />
          ))
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
              <Link
                href={`/marketplace/${row.id}`}
                className="flex items-center gap-1 text-xs font-semibold text-ink-600 hover:underline"
              >
                {TEXT.open}
                <Icon name="arrow-right" size={12} />
              </Link>

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
          {(profile) => <ModerationPanel language={state.language} reviewerId={profile.id} />}
        </SchoolAuthGate>
      </Suspense>
    </AdminShell>
  );
}

/**
 * Ссылка на скан для проверяющего. Отдельный компонент, потому что
 * подписанная ссылка получается хуком, а хуки нельзя звать внутри map.
 */
function ProofLink({ path }: { path: string | null }) {
  const url = useProofUrl(path);
  if (!path) return <span className="text-xs text-danger-600">{TEXT.noProof}</span>;
  if (!url) return <span className="text-xs text-ink-400">{TEXT.proof}…</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand-600 hover:underline">
      {TEXT.proof}
    </a>
  );
}
