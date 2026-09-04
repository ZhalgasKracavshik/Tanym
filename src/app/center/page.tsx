'use client';

/**
 * Панель внешнего учебного центра.
 *
 * Здесь нет ничего из учебной части и быть не может: центр не участник
 * школы, прогресс учеников и рейтинг ему закрыты на уровне базы
 * (is_school_member). Страница делает ровно одно — показывает его
 * объявления и их состояние проверки.
 *
 * Почему состояние показано словами, а не только цветом. Объявление на
 * проверке и отклонённое выглядят для автора одинаково — оба «не видны
 * ученикам», — и разница между «подождите» и «переделайте» слишком
 * важна, чтобы кодировать её оттенком.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/components/StoreProvider';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { createClient } from '@/lib/supabase/client';
import { Button, ButtonLink, Card, EmptyState, Skeleton } from '@/components/ui';
import { Icon } from '@/components/Icon';
import type { Language } from '@/lib/types';

interface Row {
  id: string;
  title: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const TEXT: Record<Language, Record<string, string>> = {
  ru: {
    title: 'Объявления центра',
    lead: 'Всё, что вы разместили. Ученики видят только одобренные школой.',
    publish: 'Разместить услугу',
    empty: 'Пока ни одного объявления.',
    emptyHint: 'Разместите первое — школа проверит его и откроет ученикам.',
    pending: 'На проверке школы',
    approved: 'Видно ученикам',
    rejected: 'Отклонено школой',
    pendingHint: 'Обычно занимает день-два.',
    rejectedHint: 'Исправьте описание и разместите заново.',
    notCenter: 'Эта страница для внешних учебных центров.',
    goHome: 'На главную',
  },
  kk: {
    title: 'Орталық хабарландырулары',
    lead: 'Сіз орналастырғанның бәрі. Оқушылар тек мектеп мақұлдағанын көреді.',
    publish: 'Қызмет орналастыру',
    empty: 'Әзірге бірде-бір хабарландыру жоқ.',
    emptyHint: 'Алғашқысын орналастырыңыз — мектеп тексеріп, оқушыларға ашады.',
    pending: 'Мектеп тексеруінде',
    approved: 'Оқушыларға көрінеді',
    rejected: 'Мектеп қабылдамады',
    pendingHint: 'Әдетте бір-екі күн алады.',
    rejectedHint: 'Сипаттаманы түзетіп, қайта орналастырыңыз.',
    notCenter: 'Бұл бет сыртқы оқу орталықтарына арналған.',
    goHome: 'Басты бетке',
  },
  en: {
    title: 'Centre listings',
    lead: 'Everything you have posted. Students only see what the school approved.',
    publish: 'Post a service',
    empty: 'No listings yet.',
    emptyHint: 'Post your first one — the school will review it and open it to students.',
    pending: 'Awaiting school review',
    approved: 'Visible to students',
    rejected: 'Rejected by the school',
    pendingHint: 'Usually takes a day or two.',
    rejectedHint: 'Fix the description and post again.',
    notCenter: 'This page is for external learning centres.',
    goHome: 'Go home',
  },
};

const STATUS_STYLE: Record<Row['status'], string> = {
  approved: 'border-success-200 bg-success-50 text-success-700',
  pending: 'border-accent-200 bg-accent-50 text-accent-700',
  rejected: 'border-danger-200 bg-danger-50 text-danger-700',
};

export default function CenterPage() {
  const { state } = useStore();
  const { profile, loading } = useSchoolAuth();
  const t = TEXT[state.language];

  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!profile || profile.role !== 'center') return;
    let cancelled = false;

    createClient()
      .from('published_listings')
      .select('id, title, category, status, created_at')
      .eq('admin_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!cancelled) setRows((data as Row[] | null) ?? []);
      });

    return () => {
      cancelled = true;
    };
  }, [profile]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!profile || profile.role !== 'center') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <p className="text-ink-600">{t.notCenter}</p>
        <div className="mt-6 flex justify-center">
          <ButtonLink href="/">{t.goHome}</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-ink-900">{t.title}</h1>
          <p className="mt-2 max-w-prose text-sm text-ink-500">{t.lead}</p>
        </div>
        <ButtonLink href="/marketplace/new">
          <Icon name="plus" size={16} />
          {t.publish}
        </ButtonLink>
      </div>

      <div className="mt-8">
        {rows === null ? (
          <Skeleton className="h-32 w-full" />
        ) : rows.length === 0 ? (
          <EmptyState title={t.empty} description={t.emptyHint} />
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((row) => (
              <li key={row.id}>
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words font-medium text-ink-900">{row.title}</h2>
                      <p className="mt-1 text-sm text-ink-500">{row.category}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-[var(--radius-pill)] border px-3 py-1 text-xs font-medium ${STATUS_STYLE[row.status]}`}
                    >
                      {t[row.status]}
                    </span>
                  </div>

                  {row.status !== 'approved' && (
                    <p className="mt-3 text-sm text-ink-500">
                      {row.status === 'pending' ? t.pendingHint : t.rejectedHint}
                    </p>
                  )}

                  {row.status === 'approved' && (
                    <Link
                      href={`/marketplace/${row.id}`}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-900 underline underline-offset-4"
                    >
                      {t.approved}
                      <Icon name="arrow-right" size={14} />
                    </Link>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
