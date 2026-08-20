'use client';

/**
 * Список материалов от учителей и админов — виден всем, включая гостей.
 * У каждого материала есть задания, поэтому разбор ведётся точно так же,
 * как в стандартном архиве — методом Сократа, а не просто открытием файла.
 */

import { useEffect, useState } from 'react';
import { SUBJECTS } from '@/data';
import { ARCHIVE_CATEGORIES } from '@/lib/archive';
import type { ArchiveCategory } from '@/lib/archive';
import type { Language } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { Icon } from './Icon';
import { Badge, ButtonLink, RailRow } from './ui';

interface CommunityMaterial {
  id: string;
  title: string;
  subject: string;
  category: ArchiveCategory;
  description: string;
  file_path: string;
  tasks: unknown[];
  created_at: string;
  teacher_id: string;
}

const TEXT = {
  ru: { empty: 'Пока никто не опубликовал материалов.', open: 'PDF', work: 'Разобрать', tasks: (n: number) => `${n} заданий` },
  kk: { empty: 'Әзірге ешкім материал жарияламады.', open: 'PDF', work: 'Талдау', tasks: (n: number) => `${n} тапсырма` },
  en: { empty: 'No one has published materials yet.', open: 'PDF', work: 'Work through it', tasks: (n: number) => `${n} tasks` },
} as const;

export function ArchiveMaterialFeed({ language, refreshKey }: { language: Language; refreshKey: number }) {
  const [items, setItems] = useState<CommunityMaterial[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from('archive_materials')
        .select('id, title, subject, category, description, file_path, tasks, created_at, teacher_id')
        .order('created_at', { ascending: false });

      if (cancelled) return;
      setItems(data ?? []);

      const ids = [...new Set((data ?? []).map((item) => item.teacher_id))];
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', ids);
        if (!cancelled) {
          setNames(Object.fromEntries((profiles ?? []).map((profile) => [profile.id, profile.name])));
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (items === null) return null;
  if (items.length === 0) return <p className="text-sm text-ink-500">{TEXT[language].empty}</p>;

  const supabase = createClient();

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const subject = SUBJECTS.find((subj) => subj.id === item.subject);
        const meta = ARCHIVE_CATEGORIES.find((cat) => cat.id === item.category);
        const url = item.file_path
          ? supabase.storage.from('archive-materials').getPublicUrl(item.file_path).data.publicUrl
          : null;

        return (
          <li key={item.id}>
            <RailRow tone="brand">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="brand">
                      {meta && <Icon name={meta.icon} size={14} />}
                      {meta?.title[language]}
                    </Badge>
                    {subject && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-ink-500">
                        <Icon name={subject.icon} size={14} />
                        {subject.title}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 font-bold text-ink-900">{item.title}</h3>
                  {item.description && <p className="mt-2 text-sm text-ink-500">{item.description}</p>}
                  <p className="mt-2 text-xs text-ink-400">
                    {names[item.teacher_id] ?? '…'} · {TEXT[language].tasks(item.tasks.length)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-700 transition-all duration-150 hover:border-brand-300 hover:bg-brand-50"
                    >
                      <Icon name="folder" size={16} />
                      {TEXT[language].open}
                    </a>
                  )}
                  <ButtonLink href={`/archive/community/${item.id}`} size="sm" variant="secondary">
                    {TEXT[language].work}
                  </ButtonLink>
                </div>
              </div>
            </RailRow>
          </li>
        );
      })}
    </ul>
  );
}
