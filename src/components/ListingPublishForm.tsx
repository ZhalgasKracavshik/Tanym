'use client';

/**
 * Публикация объявления возможностей — доступно только роли admin.
 */

import { useState } from 'react';
import { LISTING_TYPES } from '@/lib/listings';
import type { ListingType } from '@/lib/listings';

type ListingFormat = 'online' | 'offline' | 'both';
import type { Language } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui';
import { Icon } from './Icon';
import { ImageField } from './ImageField';

const TEXT = {
  ru: {
    type: 'Вид объявления',
    title: 'Название',
    authorName: 'Кто размещает',
    authorRole: 'Роль автора',
    description: 'Описание',
    category: 'Категория',
    format: 'Формат',
    online: 'Онлайн',
    offline: 'Очно',
    both: 'Очно и онлайн',
    price: 'Цена (пусто — бесплатно)',
    priceNote: 'Уточнение к цене (например «за занятие»)',
    spots: 'Свободных мест (необязательно)',
    schedule: 'Когда',
    contact: 'Контакт',
    verified: 'Проверено школой',
    publish: 'Опубликовать',
    publishing: 'Публикуем…',
    done: 'Объявление опубликовано.',
    error: 'Не получилось опубликовать. Проверьте поля.',
  },
} as const;

export function ListingPublishForm({ language, adminId, onPublished }: { language: Language; adminId: string; onPublished: () => void }) {
  const t = TEXT.ru;
  const [type, setType] = useState<ListingType>('school-club');
  const [title, setTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorRole, setAuthorRole] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [format, setFormat] = useState<ListingFormat>('offline');
  const [price, setPrice] = useState('');
  const [priceNote, setPriceNote] = useState('');
  const [spots, setSpots] = useState('');
  const [schedule, setSchedule] = useState('');
  const [contact, setContact] = useState('');
  const [verified, setVerified] = useState(true);
  const [cover, setCover] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');


  /**
   * Кладёт обложку в бакет и возвращает путь.
   *
   * undefined — настоящая ошибка загрузки, null — картинки просто нет.
   * Разделять важно: публикацию без обложки останавливать не за что, а
   * публикацию с потерянной обложкой — есть.
   */
  async function uploadCover(supabase: ReturnType<typeof createClient>): Promise<string | null | undefined> {
    if (!cover) return null;
    const extension = cover.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${extension}`;
    const { error } = await supabase.storage.from('card-covers').upload(path, cover);
    return error ? undefined : path;
  }

  async function submit() {
    if (!title.trim()) {
      setStatus('error');
      return;
    }
    setStatus('sending');
    const supabase = createClient();

    const coverPath = await uploadCover(supabase);
    if (coverPath === undefined) {
      setStatus('error');
      return;
    }

    const { error } = await supabase.from('published_listings').insert({
      cover_path: coverPath,
      admin_id: adminId,
      type,
      title,
      author_name: authorName,
      author_role: authorRole,
      description,
      category,
      format,
      price: price.trim() === '' ? null : Number(price),
      price_note: priceNote || null,
      spots: spots.trim() === '' ? null : Number(spots),
      schedule,
      contact,
      verified,
    });

    if (error) {
      setStatus('error');
      return;
    }
    setStatus('done');
    setCover(null);
    setTitle('');
    setDescription('');
    onPublished();
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-semibold text-ink-700">{t.type}</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {LISTING_TYPES.map((item) => (
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
      <div className="grid grid-cols-2 gap-3">
        <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder={t.authorName} className={inputCls} />
        <input value={authorRole} onChange={(e) => setAuthorRole(e.target.value)} placeholder={t.authorRole} className={inputCls} />
      </div>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.description} rows={2} className={inputCls} />
      <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t.category} className={inputCls} />

      <div>
        <label className="text-sm font-semibold text-ink-700">{t.format}</label>
        <div className="mt-2 flex gap-2">
          {(['offline', 'online', 'both'] as ListingFormat[]).map((item) => (
            <button
              key={item}
              onClick={() => setFormat(item)}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                format === item ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600'
              }`}
            >
              {item === 'offline' ? t.offline : item === 'online' ? t.online : t.both}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder={t.price} className={inputCls} />
        <input value={priceNote} onChange={(e) => setPriceNote(e.target.value)} placeholder={t.priceNote} className={inputCls} />
        <input value={spots} onChange={(e) => setSpots(e.target.value)} placeholder={t.spots} className={inputCls} />
      </div>

      <input value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder={t.schedule} className={inputCls} />
      <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder={t.contact} className={inputCls} />

      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
        {t.verified}
      </label>

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
