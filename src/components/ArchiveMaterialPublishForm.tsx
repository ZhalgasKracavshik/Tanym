'use client';

/**
 * Форма публикации PDF учителем.
 *
 * Загруженный файл сюда не разбирается на задания и не поддерживает метод
 * Сократа — это просто материал для скачивания, отдельно от структурированного
 * архива. Плейсхолдер для будущего RAG (поиск по содержимому через модель)
 * оставлен в описании компонента, сам поиск пока не реализован.
 */

import { useState } from 'react';
import { SUBJECTS } from '@/data';
import type { Language } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui';

const TEXT = {
  ru: {
    title: 'Название',
    titlePlaceholder: 'Например: Пробный ЕНТ по физике, вариант 3',
    subject: 'Предмет',
    description: 'Описание (необязательно)',
    file: 'Файл PDF',
    publish: 'Опубликовать',
    publishing: 'Загружаем…',
    done: 'Материал опубликован и виден в архиве.',
    error: 'Не получилось опубликовать. Попробуйте ещё раз.',
    needFile: 'Выберите файл PDF.',
  },
  kk: {
    title: 'Атауы',
    titlePlaceholder: 'Мысалы: Физика бойынша сынақ ҰБТ, 3-нұсқа',
    subject: 'Пән',
    description: 'Сипаттама (міндетті емес)',
    file: 'PDF файлы',
    publish: 'Жариялау',
    publishing: 'Жүктелуде…',
    done: 'Материал жарияланды және мұрағатта көрінеді.',
    error: 'Жариялау мүмкін болмады. Қайта көріңіз.',
    needFile: 'PDF файлын таңдаңыз.',
  },
  en: {
    title: 'Title',
    titlePlaceholder: 'E.g. Mock exam in physics, variant 3',
    subject: 'Subject',
    description: 'Description (optional)',
    file: 'PDF file',
    publish: 'Publish',
    publishing: 'Uploading…',
    done: 'Material published and visible in the archive.',
    error: 'Could not publish. Please try again.',
    needFile: 'Choose a PDF file.',
  },
} as const;

export function ArchiveMaterialPublishForm({
  language,
  userId,
  onPublished,
}: {
  language: Language;
  userId: string;
  onPublished: () => void;
}) {
  const t = TEXT[language];
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState(SUBJECTS[0]?.id ?? '');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error' | 'need-file'>('idle');

  async function submit() {
    if (!file) {
      setStatus('need-file');
      return;
    }
    setStatus('sending');

    const supabase = createClient();
    const path = `${userId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('archive-materials').upload(path, file);
    if (uploadError) {
      setStatus('error');
      return;
    }

    const { error } = await supabase.from('archive_materials').insert({
      teacher_id: userId,
      title,
      subject: subjectId,
      description,
      file_path: path,
    });

    if (error) {
      setStatus('error');
      return;
    }

    setStatus('done');
    setTitle('');
    setDescription('');
    setFile(null);
    onPublished();
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-semibold text-ink-700" htmlFor="material-title">
          {t.title}
        </label>
        <input
          id="material-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t.titlePlaceholder}
          className="mt-2 w-full rounded-xl border border-ink-200 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-ink-700" htmlFor="material-subject">
          {t.subject}
        </label>
        <select
          id="material-subject"
          value={subjectId}
          onChange={(event) => setSubjectId(event.target.value)}
          className="mt-2 w-full rounded-xl border border-ink-200 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {SUBJECTS.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-semibold text-ink-700" htmlFor="material-description">
          {t.description}
        </label>
        <textarea
          id="material-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          className="mt-2 w-full rounded-xl border border-ink-200 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-ink-700" htmlFor="material-file">
          {t.file}
        </label>
        <input
          id="material-file"
          type="file"
          accept="application/pdf"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="mt-2 block text-sm text-ink-600"
        />
      </div>

      {status === 'done' && <p className="text-sm font-semibold text-success-700">{t.done}</p>}
      {status === 'error' && <p className="text-sm font-semibold text-danger-600">{t.error}</p>}
      {status === 'need-file' && <p className="text-sm font-semibold text-danger-600">{t.needFile}</p>}

      <Button onClick={submit} disabled={status === 'sending' || title.trim() === ''}>
        {status === 'sending' ? t.publishing : t.publish}
      </Button>
    </div>
  );
}
