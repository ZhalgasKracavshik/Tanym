'use client';

/**
 * Публикация и правка объявления — доступно только роли admin: объявление
 * это официальный голос школы, а не сообщение отдельного учителя.
 *
 * Правка живёт в этой же форме, а не в отдельной копии. Поля у создания и
 * у изменения одни и те же, а две формы с одинаковыми полями расходятся
 * при первом же новом поле: добавишь его в одну — и объявление, созданное
 * с ним, перестанет открываться на правку без него.
 */

import { useState } from 'react';
import { ANNOUNCEMENT_CATEGORIES } from '@/lib/announcements';
import type { AnnouncementCategory } from '@/lib/announcements';
import type { Language } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui';
import { Icon } from './Icon';
import { ImageField } from './ImageField';

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
  save: 'Сохранить изменения',
  saving: 'Сохраняем…',
  saved: 'Изменения сохранены.',
  saveError: 'Не удалось сохранить. Проверьте поля.',
  coverKept: 'Изображение остаётся прежним. Выберите файл, чтобы заменить его.',
} as const;

/** Объявление, открытое на правку. */
export interface AnnouncementDraft {
  id: string;
  category: AnnouncementCategory;
  title: string;
  body: string;
  author: string;
  expires_at: string | null;
  pinned: boolean;
  target_grades: number[] | null;
  cover_path: string | null;
}

export function AnnouncementPublishForm({
  language,
  adminId,
  onPublished,
  editing,
}: {
  language: Language;
  adminId: string;
  onPublished: () => void;
  /** Если передано — форма правит это объявление, а не создаёт новое. */
  editing?: AnnouncementDraft;
}) {
  const [category, setCategory] = useState<AnnouncementCategory>(editing?.category ?? 'general');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [body, setBody] = useState(editing?.body ?? '');
  const [author, setAuthor] = useState(editing?.author ?? '');
  /*
    Дата приходит из базы как ISO со временем, а input[type=date] принимает
    только «ГГГГ-ММ-ДД». Без обрезки поле молча оставалось бы пустым, и
    правка снимала бы срок актуальности с объявления.
  */
  const [expiresAt, setExpiresAt] = useState(editing?.expires_at?.slice(0, 10) ?? '');
  const [grades, setGrades] = useState((editing?.target_grades ?? []).join(','));
  const [pinned, setPinned] = useState(editing?.pinned ?? false);
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
    const coverPath = await uploadCover(supabase);
    if (coverPath === undefined) {
      setStatus('error');
      return;
    }

    const fields = {
      category,
      title,
      body,
      author,
      expires_at: expiresAt || null,
      pinned,
      // Пустой список означает «вся школа», а не «ни одному классу».
      target_grades: gradeList.length > 0 ? gradeList : null,
    };

    /*
      При правке обложка переписывается, только если выбрали новый файл.
      Иначе coverPath здесь null — «картинки нет», — и записать его значило
      бы стирать существующее изображение каждый раз, когда правят опечатку
      в заголовке.
    */
    const { error } = editing
      ? await supabase
          .from('published_announcements')
          .update(coverPath === null ? fields : { ...fields, cover_path: coverPath })
          .eq('id', editing.id)
      : await supabase.from('published_announcements').insert({
          ...fields,
          cover_path: coverPath,
          admin_id: adminId,
        });

    if (error) {
      setStatus('error');
      return;
    }

    setStatus('done');
    setCover(null);
    if (!editing) {
      setTitle('');
      setBody('');
    }
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

      {status === 'done' && (
        <p className="text-sm font-semibold text-success-700">{editing ? TEXT.saved : TEXT.done}</p>
      )}
      {status === 'error' && (
        <p className="text-sm font-semibold text-danger-600">{editing ? TEXT.saveError : TEXT.error}</p>
      )}

      <ImageField
        file={cover}
        onChange={setCover}
        hint={editing?.cover_path ? TEXT.coverKept : undefined}
      />

      <Button onClick={submit} disabled={status === 'sending'}>
        {status === 'sending'
          ? editing
            ? TEXT.saving
            : TEXT.publishing
          : editing
            ? TEXT.save
            : TEXT.publish}
      </Button>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-ink-200 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
