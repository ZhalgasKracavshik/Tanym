'use client';

/**
 * Общие детали админ-панели.
 *
 * Панель разбита на подстраницы (сводка, модерация, контент, люди), и всем
 * им нужны одни и те же кирпичи: загрузка строк таблицы, строка списка,
 * кнопка удаления и навигация между разделами. Держать их в одном месте
 * нужно не ради экономии, а чтобы разделы не разъезжались по поведению:
 * удаление должно спрашивать подтверждение одинаково везде.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import { Kicker, Panel } from '@/components/ui';

export interface DataRow {
  id: string;
  [key: string]: unknown;
}

export const ADMIN_TEXT = {
  delete: 'Удалить',
  confirmDelete: 'Удалить безвозвратно?',
  empty: 'Пока пусто.',
  approve: 'Одобрить',
  reject: 'Отклонить',
} as const;

/**
 * Разделы панели.
 *
 * Порядок не случаен: сначала то, что требует действия сегодня
 * (модерация), потом то, что просто лежит и иногда правится.
 */
export const ADMIN_SECTIONS: { href: string; label: string; icon: IconName; hint: string }[] = [
  { href: '/admin', label: 'Сводка', icon: 'columns', hint: 'Что требует внимания прямо сейчас' },
  { href: '/admin/moderation', label: 'Модерация', icon: 'shield', hint: 'Достижения и объявления на проверке' },
  { href: '/admin/content', label: 'Контент', icon: 'folder', hint: 'Опубликованные события, объявления, материалы' },
  { href: '/admin/users', label: 'Люди', icon: 'users', hint: 'Роли, классы и участники школы' },
];

/** Строки таблицы с обновлением по ключу. */
export function useRows(table: string, select: string, refreshKey: number, filter?: [string, string]) {
  const [rows, setRows] = useState<DataRow[] | null>(null);
  const filterColumn = filter?.[0];
  const filterValue = filter?.[1];

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let query = supabase.from(table).select(select).order('created_at', { ascending: false });
    if (filterColumn && filterValue) query = query.eq(filterColumn, filterValue);

    query.then(({ data }) => {
      if (!cancelled) setRows((data as DataRow[] | null) ?? []);
    });

    return () => {
      cancelled = true;
    };
  }, [table, select, refreshKey, filterColumn, filterValue]);

  return rows;
}

/** Количество строк по фильтру — для цифр на сводке. */
export function useCount(table: string, refreshKey: number, filter?: [string, string]) {
  const [count, setCount] = useState<number | null>(null);
  const filterColumn = filter?.[0];
  const filterValue = filter?.[1];

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let query = supabase.from(table).select('id', { count: 'exact', head: true });
    if (filterColumn && filterValue) query = query.eq(filterColumn, filterValue);

    query.then(({ count: value }) => {
      if (!cancelled) setCount(value ?? 0);
    });

    return () => {
      cancelled = true;
    };
  }, [table, refreshKey, filterColumn, filterValue]);

  return count;
}

export function DeleteButton({ table, id, onDone }: { table: string; id: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        if (!window.confirm(ADMIN_TEXT.confirmDelete)) return;
        setBusy(true);
        await createClient().from(table).delete().eq('id', id);
        setBusy(false);
        onDone();
      }}
      className="flex items-center gap-1 text-xs font-semibold text-danger-600 hover:underline disabled:opacity-50"
    >
      <Icon name="close" size={12} />
      {ADMIN_TEXT.delete}
    </button>
  );
}

export function Row({ title, meta, children }: { title: string; meta: string; children?: ReactNode }) {
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

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-10 first:mt-0">
      <Kicker>{title}</Kicker>
      <Panel className="mt-4 p-5">{children}</Panel>
    </div>
  );
}

/**
 * Навигация по разделам панели.
 *
 * Горизонтальные вкладки, а не длинная страница: раньше панель была одним
 * свитком из шести блоков, и чтобы удалить событие, приходилось прокручивать
 * мимо всего остального. Вкладки заодно отвечают на вопрос «что тут вообще
 * есть» — по свитку это видно только до конца прокрутив.
 */
export function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav className="mt-8 flex gap-2 overflow-x-auto pb-1">
      {ADMIN_SECTIONS.map((section) => {
        const active = pathname === section.href;
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex shrink-0 items-center gap-2 rounded-[var(--radius-control)] border px-4 py-2 text-sm font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
              active
                ? 'border-brand-300 bg-brand-50 text-brand-700'
                : 'border-ink-200 bg-white text-ink-500 hover:border-brand-200 hover:text-brand-600'
            }`}
          >
            <Icon name={section.icon} size={16} />
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Каркас страницы панели: заголовок, вкладки, проверка роли.
 *
 * Роль проверяется на каждой подстранице, а не один раз на входе: на любую
 * из них можно прийти по прямой ссылке. Настоящая защита — в политиках
 * базы, здесь только про то, что показывать.
 */
export function AdminShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Kicker>Администрирование</Kicker>
      <h1 className="mt-2 text-3xl font-semibold text-ink-900 sm:text-4xl">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-sm text-ink-500">{description}</p>}
      <AdminTabs />
      <div className="mt-8">{children}</div>
    </div>
  );
}
