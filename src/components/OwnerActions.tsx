'use client';

/**
 * Убрать своё — или чужое, если ты администрация.
 *
 * Публиковать в продукте было можно, а убирать нельзя: ни объявление
 * школы, ни карточку возможности. Опечатка в заголовке, отменившееся
 * событие, закрывшийся центр — всё это оставалось висеть навсегда, и
 * единственным выходом был запрос в базу руками.
 *
 * Кто может убрать — решает база, а не этот компонент. Политики уже
 * разрешают удаление автору и администратору; здесь только кнопка.
 * Прятать её от остальных нужно затем, чтобы никто не жал на действие,
 * которое всё равно завершится отказом.
 */

import { useState } from 'react';
import { useStore } from './StoreProvider';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui';
import { Icon } from './Icon';
import type { Language } from '@/lib/types';

const TEXT: Record<Language, Record<string, string>> = {
  ru: {
    remove: 'Убрать',
    removing: 'Убираем…',
    confirm: 'Убрать безвозвратно?',
    failed: 'Не удалось убрать.',
  },
  kk: {
    remove: 'Өшіру',
    removing: 'Өшірілуде…',
    confirm: 'Қайтарымсыз өшіру керек пе?',
    failed: 'Өшіру мүмкін болмады.',
  },
  en: {
    remove: 'Remove',
    removing: 'Removing…',
    confirm: 'Remove permanently?',
    failed: 'Could not remove.',
  },
};

export function OwnerActions({
  table,
  id,
  authorId,
  onRemoved,
}: {
  /** Таблица, из которой удаляем. */
  table: 'published_announcements' | 'published_events' | 'published_listings' | 'archive_materials';
  id: string;
  /** Кто автор записи. Сравнивается с текущим пользователем. */
  authorId: string | null | undefined;
  onRemoved: () => void;
}) {
  const { state } = useStore();
  const { profile } = useSchoolAuth();
  const t = TEXT[state.language];

  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const canRemove = Boolean(profile && (profile.role === 'admin' || profile.id === authorId));
  if (!canRemove) return null;

  async function remove() {
    if (!window.confirm(t.confirm)) return;
    setBusy(true);
    setFailed(false);

    const { error } = await createClient().from(table).delete().eq('id', id);
    setBusy(false);

    if (error) {
      setFailed(true);
      return;
    }
    // Список обновляет вызывающий: только он знает, где эта запись лежит.
    onRemoved();
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button size="sm" variant="ghost" onClick={remove} disabled={busy}>
        <Icon name="close" size={13} />
        {busy ? t.removing : t.remove}
      </Button>
      {failed && <span className="text-xs font-medium text-danger-600">{t.failed}</span>}
    </span>
  );
}
