'use client';

/**
 * Публикация события афиши — доступно только роли admin.
 */

import { useState } from 'react';
import { EVENT_TYPES } from '@/lib/events';
import type { EventType } from '@/lib/events';
import type { Language } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { normalizeSocialUrl } from '@/lib/social';
import { Button } from './ui';
import { Icon } from './Icon';
import { ImageGalleryField } from './ImageGalleryField';

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
    registrationUrl: 'Ссылка для записи (необязательно)',
    registrationUrlPlaceholder: 'Google-форма, чат или страница курса',
    registrationUrlHint:
      'Если оставить пустым, на странице события останется только личная отметка «иду», без перехода куда-либо.',
    registrationUrlError: 'Проверьте ссылку для записи — она должна быть настоящим адресом.',
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
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [covers, setCovers] = useState<File[]>([]);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error' | 'bad-url'>('idle');


  /**
   * Кладёт изображения в бакет и возвращает их пути по порядку.
   *
   * undefined — настоящая ошибка загрузки, пустой массив — картинок просто
   * нет. Разделять важно: публикацию без изображений останавливать не за
   * что, а публикацию, где половина картинок потерялась, — есть, иначе
   * карточка выйдет с дырами, а организатор об этом не узнает.
   */
  async function uploadCovers(supabase: ReturnType<typeof createClient>): Promise<string[] | undefined> {
    if (covers.length === 0) return [];

    const paths: string[] = [];
    for (const [position, file] of covers.entries()) {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      // Позиция в имени — чтобы порядок читался прямо по бакету при разборе.
      const path = `${Date.now()}-${position}-${Math.round(Math.random() * 1e6)}.${extension}`;
      const { error } = await supabase.storage.from('card-covers').upload(path, file);
      if (error) return undefined;
      paths.push(path);
    }
    return paths;
  }

  async function submit() {
    if (!title.trim() || !startsAt || !deadline) {
      setStatus('error');
      return;
    }

    /*
      Пустая ссылка допустима — событие может быть без внешней записи, тогда
      на странице останется только личная отметка. А вот непустая, но
      нерабочая строка сохраняться не должна: она превратилась бы в мёртвую
      кнопку «Записаться», ведущую в никуда, и это заметили бы только те,
      кто на неё нажал.
    */
    const safeRegistrationUrl = registrationUrl.trim() === '' ? null : normalizeSocialUrl(registrationUrl);
    if (registrationUrl.trim() !== '' && safeRegistrationUrl === null) {
      setStatus('bad-url');
      return;
    }

    setStatus('sending');
    const supabase = createClient();
    const gradeList = grades
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item) && item > 0);

    const coverPaths = await uploadCovers(supabase);
    if (coverPaths === undefined) {
      setStatus('error');
      return;
    }

    const { error } = await supabase.from('published_events').insert({
      cover_paths: coverPaths,
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
      registration_url: safeRegistrationUrl,
    });

    if (error) {
      setStatus('error');
      return;
    }
    setStatus('done');
    setCovers([]);
    setTitle('');
    setOrganizer('');
    setDescription('');
    setPrize('');
    setRegistrationUrl('');
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

      <div>
        <label className="text-sm font-semibold text-ink-700" htmlFor="event-registration-url">
          {t.registrationUrl}
        </label>
        <input
          id="event-registration-url"
          value={registrationUrl}
          onChange={(e) => setRegistrationUrl(e.target.value)}
          placeholder={t.registrationUrlPlaceholder}
          className={`${inputCls} mt-2`}
        />
        <p className="mt-1 text-xs text-ink-400">{t.registrationUrlHint}</p>
      </div>

      {status === 'done' && <p className="text-sm font-semibold text-success-700">{t.done}</p>}
      {status === 'error' && <p className="text-sm font-semibold text-danger-600">{t.error}</p>}
      {status === 'bad-url' && <p className="text-sm font-semibold text-danger-600">{t.registrationUrlError}</p>}

      <ImageGalleryField files={covers} onChange={setCovers} />

      <Button onClick={submit} disabled={status === 'sending'}>
        {status === 'sending' ? t.publishing : t.publish}
      </Button>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-ink-200 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
