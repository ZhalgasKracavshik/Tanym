'use client';

/**
 * Блок портфолио на странице профиля.
 *
 * Отдельный компонент, потому что профиль остаётся страницей настроек
 * и ничего не знает про школьный аккаунт: портфолио живёт в Supabase
 * и существует только у вошедшего ученика.
 */

import { useState } from 'react';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { createClient } from '@/lib/supabase/client';
import type { Language } from '@/lib/types';
import { AchievementForm, PortfolioGrid, portfolioPoints, usePortfolio } from './Portfolio';
import { Icon } from './Icon';
import { Kicker } from './ui';
import { ButtonLink } from './ui';

export function PortfolioSection({ language }: { language: Language }) {
  const { profile, loading } = useSchoolAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const items = usePortfolio(profile?.id ?? null, refreshKey);

  async function remove(id: string) {
    if (!window.confirm('Удалить достижение из портфолио?')) return;
    await createClient().from('portfolio_achievements').delete().eq('id', id);
    setRefreshKey((key) => key + 1);
  }

  if (loading) return null;

  // Портфолио есть только у ученика со школьным аккаунтом. Учителю и гостю
  // показывать пустую сетку с кнопкой «добавить» бессмысленно: RLS всё
  // равно не даст им ничего сохранить.
  if (!profile) {
    return (
      <section className="mt-12">
        <Kicker>Портфолио</Kicker>
        <div className="mt-4 rounded-[var(--radius-card)] border border-ink-200 bg-white p-6">
          <p className="text-sm text-ink-500">
            Войдите со школьным аккаунтом, чтобы собирать портфолио достижений и получать за них баллы
            в рейтинге школы.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ButtonLink href="/login" size="sm">
              Войти
            </ButtonLink>
            <ButtonLink href="/register" size="sm" variant="secondary">
              Создать аккаунт
            </ButtonLink>
          </div>
        </div>
      </section>
    );
  }

  if (profile.role !== 'student') return null;

  const approvedPoints = portfolioPoints(items);
  const pendingCount = (items ?? []).filter((item) => item.status === 'pending').length;

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Kicker>Портфолио</Kicker>
          <p className="mt-2 text-sm text-ink-500">
            Олимпиады, конкурсы и достижения. Подтверждённые приносят баллы в рейтинг школы.
          </p>
        </div>

        <div className="flex items-center gap-4 rounded-[var(--radius-control)] border border-ink-200 bg-white px-5 py-3">
          <span className="flex items-center gap-2 text-2xl font-semibold tabular-nums text-brand-600">
            <Icon name="trophy" size={20} className="text-accent-500" />
            {approvedPoints}
          </span>
          <span className="text-xs leading-tight text-ink-400">
            баллов
            <br />
            за достижения
          </span>
        </div>
      </div>

      {pendingCount > 0 && (
        <p className="mt-4 rounded-[var(--radius-control)] border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-700">
          {pendingCount === 1
            ? 'Одна заявка ждёт проверки администрацией.'
            : `${pendingCount} заявки ждут проверки администрацией.`}
        </p>
      )}

      <div className="mt-6">
        <AchievementForm
          studentId={profile.id}
          language={language}
          onSubmitted={() => setRefreshKey((key) => key + 1)}
        />
      </div>

      <div className="mt-6">
        <PortfolioGrid
          items={items ?? []}
          language={language}
          onDelete={remove}
          emptyText="Здесь появятся ваши олимпиады и конкурсы. Добавьте первое достижение — и оно попадёт в рейтинг после проверки."
        />
      </div>
    </section>
  );
}
