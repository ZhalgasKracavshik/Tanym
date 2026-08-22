'use client';

/**
 * Публикация события афиши — доступно только роли admin.
 */

import { useState } from 'react';
import { EVENT_TYPES } from '@/lib/events';
import type { EventType } from '@/lib/events';
import type { Language } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui';
import { Icon } from './Icon';
import { ImageField } from './ImageField';

const TEXT = {
  ru: {
    type: 'Вид события',
    title: 'Название',
    organizer: 'Организатор',
    description: 'Описание',
    startsAt: 'Дата проведения',
    deadline: 'Регистрация до',
    location: 'Место',
    online: 'Онлайн',
    grades: 'Классы (через запятую, например 9,10,11)',
    prize: 'Что даёт участие (необязательно)',
    free: 'Бесплатно',
    publish: 'Опубликовать',
    publishing: 'Публикуем…',
    done: 'Событие опубликовано и видно в афише.',
    error: 'Не получилось опубликовать. Проверьте поля.',
  },
} as const;

export function EventPublishForm({ language, adminId, onPublished }: { language: Language; adminId: string; onPublished: () => void }) {
  const t = TEXT.ru;
  const [type, setType] = useState<EventType>('olympiad');
  const [title, setTitle] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [deadline, setDeadline] = useState('');
  const [location, setLocation] = useState('');
  const [online, setOnline] = useState(false);
  const [grades, setGrades] = useState('9,10,11');
  const [prize, setPrize] = useState('');
  const [free, setFree] = useState(true);
  const [cover, setCover] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');


  /**
   * Кладёт обложку в бакет и возвращает путь.
   *
   * Возвращает undefined только при настоящей ошибке загрузки; отсутствие
   * файла — это null, штатный случай. Разделять важно: публикацию без
   * картинки останавливать не за что, а публикацию с потерянной картинкой —
   * есть, иначе карточка молча выйдет пустой.
   */
  async function uploadCover(supabase: ReturnType<typeof createClient>): Promise<string | null | undefined> {
    if (!cover) return null;
    const extension = cover.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${extension}`;
    const { error } = await supabase.storage.from('card-covers').upload(path, cover);
    return error ? undefined : path;
  }

  async function submit() {
    if (!title.trim() || !startsAt || !deadline) {
      setStatus('error');
      return;
    }
    setStatus('sending');
    const supabase = createClient();
    const gradeList = grades
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item) && item > 0);

    const coverPath = await uploadCover(supabase);
    if (coverPath === undefined) {
      setStatus('error');
      return;
    }

    const { error } = await supabase.from('published_events').insert({
      cover_path: coverPath,
      admin_id: adminId,
      type,
      title,
      organizer,
      description,
      starts_at: startsAt,
      registration_deadline: deadline,
      location,
      online,
      grades: gradeList,
      prize: prize || null,
      free,
    });

    if (error) {
      setStatus('error');
      return;
    }
    setStatus('done');
    setCover(null);
    setTitle('');
    setOrganizer('');
    setDescription('');
    setPrize('');
    onPublished();
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-semibold text-ink-700">{t.type}</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {EVENT_TYPES.map((item) => (
            <button
              key={item.id}
              onClick={() => setType(item.id)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all duration-150 ${
                type === item.id ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600 hover:border-brand-300'
              }`}
            >
              <Icon name={item.icon} size={16} />
              {item.title[language]}
            </button>
          ))}
        </div>
      </div>

      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.title} className={inputCls} />
      <input value={organizer} onChange={(e) => setOrganizer(e.target.value)} placeholder={t.organizer} className={inputCls} />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.description} rows={2} className={inputCls} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-ink-500">{t.startsAt}</label>
          <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={`${inputCls} mt-1`} />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-500">{t.deadline}</label>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={`${inputCls} mt-1`} />
        </div>
      </div>

      <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t.location} className={inputCls} />
      <input value={grades} onChange={(e) => setGrades(e.target.value)} placeholder={t.grades} className={inputCls} />
      <input value={prize} onChange={(e) => setPrize(e.target.value)} placeholder={t.prize} className={inputCls} />

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" checked={online} onChange={(e) => setOnline(e.target.checked)} />
          {t.online}
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" checked={free} onChange={(e) => setFree(e.target.checked)} />
          {t.free}
        </label>
      </div>

      {status === 'done' && <p className="text-sm font-semibold text-success-700">{t.done}</p>}
      {status === 'error' && <p className="text-sm font-semibold text-danger-600">{t.error}</p>}


      <ImageField file={cover} onChange={setCover} />

      <Button onClick={submit} disabled={status === 'sending'}>
        {status === 'sending' ? t.publishing : t.publish}
      </Button>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-ink-200 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
