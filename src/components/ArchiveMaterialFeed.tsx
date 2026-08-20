'use client';

/**
 * Список PDF-материалов от учителей — виден всем, включая гостей.
 */

import { useEffect, useState } from 'react';
import { SUBJECTS } from '@/data';
import type { Language } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { Icon } from './Icon';
import { RailRow } from './ui';

interface TeacherMaterial {
  id: string;
  title: string;
  subject: string;
  description: string;
  file_path: string;
  created_at: string;
  teacher_id: string;
}

const TEXT = {
  ru: { empty: 'Учителя пока не опубликовали материалов.', open: 'Открыть PDF' },
  kk: { empty: 'Мұғалімдер әзірге материал жарияламады.', open: 'PDF ашу' },
  en: { empty: 'Teachers have not published materials yet.', open: 'Open PDF' },
} as const;

export function ArchiveMaterialFeed({ language, refreshKey }: { language: Language; refreshKey: number }) {
  const [items, setItems] = useState<TeacherMaterial[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from('archive_materials')
        .select('id, title, subject, description, file_path, created_at, teacher_id')
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
        const url = supabase.storage.from('archive-materials').getPublicUrl(item.file_path).data.publicUrl;

        return (
          <li key={item.id}>
            <RailRow tone="brand">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
                    {subject && <Icon name={subject.icon} size={14} />}
                    {subject?.title ?? item.subject}
                  </p>
                  <h3 className="mt-2 font-bold text-ink-900">{item.title}</h3>
                  {item.description && <p className="mt-2 text-sm text-ink-500">{item.description}</p>}
                  <p className="mt-2 text-xs text-ink-400">{names[item.teacher_id] ?? '…'}</p>
                </div>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 transition-all duration-150 hover:border-brand-300 hover:bg-brand-50"
                >
                  <Icon name="folder" size={16} />
                  {TEXT[language].open}
                </a>
              </div>
            </RailRow>
          </li>
        );
      })}
    </ul>
  );
}
