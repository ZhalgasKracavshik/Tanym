'use client';

/**
 * Публикация объявления — доступно только роли admin: объявление это
 * официальный голос школы, а не сообщение отдельного учителя.
 */

import { useState } from 'react';
import { ANNOUNCEMENT_CATEGORIES } from '@/lib/announcements';
import type { AnnouncementCategory } from '@/lib/announcements';
import type { Language } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui';
import { Icon } from './Icon';

const TEXT = {
  category: 'Категория',
  title: 'Заголовок',
  body: 'Текст объявления',
  author: 'Кто публикует (должность)',
  authorPlaceholder: 'Например: Директор школы',
  expiresAt: 'Актуально до (необязательно)',
  grades: 'Классы через запятую (пусто — вся школа)',
  pinned: 'Закрепить наверху',
  publish: 'Опубликовать',
  publishing: 'Публикуем…',
  done: 'Объявление опубликовано.',
  error: 'Не получилось опубликовать. Проверьте поля.',
} as const;

export function AnnouncementPublishForm({
  language,
  adminId,
  onPublished,
}: {
  language: Language;
  adminId: string;
  onPublished: () => void;
}) {
  const [category, setCategory] = useState<AnnouncementCategory>('general');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [author, setAuthor] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [grades, setGrades] = useState('');
  const [pinned, setPinned] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  async function submit() {
    if (!title.trim() || !body.trim()) {
      setStatus('error');
      return;
    }
    setStatus('sending');

    const gradeList = grades
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item) && item > 0);

    const supabase = createClient();
    const { error } = await supabase.from('published_announcements').insert({
      admin_id: adminId,
      category,
      title,
      body,
      author,
      expires_at: expiresAt || null,
      pinned,
      // Пустой список означает «вся школа», а не «ни одному классу».
      target_grades: gradeList.length > 0 ? gradeList : null,
    });

    if (error) {
      setStatus('error');
      return;
    }

    setStatus('done');
    setTitle('');
    setBody('');
    onPublished();
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-semibold text-ink-700">{TEXT.category}</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {ANNOUNCEMENT_CATEGORIES.map((item) => (
            <button
              key={item.id}
              onClick={() => setCategory(item.id)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all duration-150 ${
                category === item.id
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-ink-200 text-ink-600 hover:border-brand-300'
              }`}
            >
              <Icon name={item.icon} size={16} />
              {item.title[language]}
            </button>
          ))}
        </div>
      </div>

      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={TEXT.title} className={inputCls} />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={TEXT.body} rows={4} className={inputCls} />
      <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder={TEXT.authorPlaceholder} className={inputCls} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-ink-500">{TEXT.expiresAt}</label>
          <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={`${inputCls} mt-1`} />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-500">{TEXT.grades}</label>
          <input value={grades} onChange={(e) => setGrades(e.target.value)} placeholder="9,10,11" className={`${inputCls} mt-1`} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
        {TEXT.pinned}
      </label>

      {status === 'done' && <p className="text-sm font-semibold text-success-700">{TEXT.done}</p>}
      {status === 'error' && <p className="text-sm font-semibold text-danger-600">{TEXT.error}</p>}

      <Button onClick={submit} disabled={status === 'sending'}>
        {status === 'sending' ? TEXT.publishing : TEXT.publish}
      </Button>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-ink-200 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
