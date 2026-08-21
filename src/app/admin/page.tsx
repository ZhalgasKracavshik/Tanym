'use client';

/**
 * Сводка панели администратора.
 *
 * Первый экран отвечает на один вопрос: что требует внимания сегодня.
 * Раньше панель открывалась свитком из шести списков, и «две заявки на
 * проверке» приходилось искать глазами среди сотни опубликованных записей.
 *
 * Числа, требующие действия, вынесены наверх и подсвечены; всё остальное
 * лежит карточками разделов, куда можно зайти, когда понадобится.
 */

import Link from 'next/link';
import { Suspense } from 'react';
import { useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import { SchoolAuthGate } from '@/components/SchoolAuthGate';
import { Icon } from '@/components/Icon';
import { Card, Skeleton } from '@/components/ui';
import { ADMIN_SECTIONS, AdminShell, useCount } from './parts';

function Overview() {
  const [refreshKey] = useState(0);

  const pendingAchievements = useCount('portfolio_achievements', refreshKey, ['status', 'pending']);
  const pendingListings = useCount('published_listings', refreshKey, ['status', 'pending']);
  const students = useCount('profiles', refreshKey, ['role', 'student']);
  const events = useCount('published_events', refreshKey);

  const waiting = (pendingAchievements ?? 0) + (pendingListings ?? 0);

  return (
    <div>
      {/*
        Строка «требует внимания» набрана крупно и отделена от остального.
        Если ждать нечего — так и написано словами, а не нулём: ноль в
        крупной рамке читается как поломка, а фраза как спокойствие.
      */}
      <Card
        className={waiting > 0 ? 'border-accent-200 bg-accent-50' : ''}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-400">
              Требует внимания
            </p>
            {pendingAchievements === null || pendingListings === null ? (
              <Skeleton className="mt-2 h-9 w-40" />
            ) : waiting > 0 ? (
              <p className="mt-1 text-3xl font-semibold text-ink-900">
                {waiting}
                <span className="ml-2 text-base font-medium text-ink-500">
                  {waiting === 1 ? 'заявка' : waiting < 5 ? 'заявки' : 'заявок'} на проверке
                </span>
              </p>
            ) : (
              <p className="mt-1 text-lg font-semibold text-ink-700">Всё проверено</p>
            )}
          </div>

          {waiting > 0 && (
            <Link
              href="/admin/moderation"
              className="inline-flex items-center gap-2 rounded-[var(--radius-control)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-lift)]"
              style={{ background: 'var(--gradient-brand)' }}
            >
              Перейти к проверке
              <Icon name="arrowRight" size={16} />
            </Link>
          )}
        </div>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Достижения на проверке" value={pendingAchievements} />
        <Stat label="Объявления на модерации" value={pendingListings} />
        <Stat label="Учеников в школе" value={students} />
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {ADMIN_SECTIONS.filter((section) => section.href !== '/admin').map((section) => (
          <Link key={section.href} href={section.href} className="group">
            <Card className="h-full transition-all duration-150 group-hover:border-brand-300 group-hover:shadow-[var(--shadow-lift)]">
              <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] bg-brand-50 text-brand-600">
                <Icon name={section.icon} size={20} />
              </span>
              <h2 className="mt-4 font-bold text-ink-900">{section.label}</h2>
              <p className="mt-1 text-sm text-ink-500">{section.hint}</p>
            </Card>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-xs text-ink-400">
        События в афише: {events ?? '—'}. Удалить или отредактировать их можно в разделе «Контент».
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-[var(--radius-control)] border border-ink-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</p>
      {value === null ? (
        <Skeleton className="mt-2 h-8 w-12" />
      ) : (
        <p className="mt-1 text-2xl font-semibold tabular-nums text-ink-900">{value}</p>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { state } = useStore();

  return (
    <AdminShell title="Панель администратора" description="Что происходит в школе и что требует решения.">
      <Suspense fallback={null}>
        <SchoolAuthGate requireRole="admin" language={state.language}>
          {() => <Overview />}
        </SchoolAuthGate>
      </Suspense>
    </AdminShell>
  );
}
