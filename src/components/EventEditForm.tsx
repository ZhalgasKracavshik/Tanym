'use client';

/**
 * Правка уже опубликованного события.
 *
 * Поля те же, что и при публикации, и это не совпадение: человек, который
 * заполнял форму неделю назад, ищет ту же форму, а не «редактор» с другим
 * порядком полей. Отличий ровно два, и оба по делу.
 *
 * Первое — автора здесь нет. admin_id не выводится в форму и не попадает в
 * update: это не поле события, а ответ на вопрос «кто за него отвечает».
 * Разрешить его менять означало бы дать автору передать чужую публикацию
 * кому угодно, а администратору — переписать историю задним числом.
 * Политика в базе всё равно проверяет права по этой колонке, так что
 * подмена ещё и выбила бы человека из собственной записи.
 *
 * Второе — картинки. При публикации их только выбирают, при правке они уже
 * лежат в бакете: старые показываются как есть (переставить, убрать), новые
 * добавляются файлами и догружаются при сохранении. Полная перезагрузка
 * галереи ради смены порядка — не вариант: на телефоне это мегабайты
 * трафика за перестановку двух кадров.
 */

import { useMemo, useState } from 'react';
import { EVENT_TYPES } from '@/lib/events';
import type { EventType } from '@/lib/events';
import type { Language } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { normalizeSocialUrl } from '@/lib/social';
import { Button } from './ui';
import { Icon } from './Icon';
import { ImageGalleryField, MAX_IMAGES } from './ImageGalleryField';

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
    covers: 'Уже загруженные изображения',
    coversHint: 'Первое изображение — обложка в афише.',
    coversFull: `Загружено ${MAX_IMAGES} из ${MAX_IMAGES} — чтобы добавить новое, уберите старое.`,
    left: 'Левее',
    right: 'Правее',
    remove: 'Убрать',
    cover: 'обложка',
    save: 'Сохранить',
    saving: 'Сохраняем…',
    cancel: 'Отмена',
    error: 'Не получилось сохранить. Проверьте название и обе даты.',
    denied: 'Изменения не приняты: править событие может только его автор или администратор.',
  },
} as const;

/** Значения, с которых открывается форма. Ровно поля строки, без admin_id. */
export interface EventEditInitial {
  type: EventType;
  title: string;
  organizer: string;
  description: string;
  /** «ГГГГ-ММ-ДД». */
  startsAt: string;
  /** «ГГГГ-ММ-ДД». */
  deadline: string;
  location: string;
  online: boolean;
  grades: number[];
  prize: string;
  free: boolean;
  /** Пустая строка — ссылки для записи нет. */
  registrationUrl: string;
  /** Пути в бакете card-covers, а не публичные ссылки. */
  coverPaths: string[];
}

export function EventEditForm({
  eventId,
  language,
  initial,
  onSaved,
  onCancel,
}: {
  eventId: string;
  language: Language;
  initial: EventEditInitial;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const t = TEXT.ru;

  const [type, setType] = useState<EventType>(initial.type);
  const [title, setTitle] = useState(initial.title);
  const [organizer, setOrganizer] = useState(initial.organizer);
  const [description, setDescription] = useState(initial.description);
  // Колонка типа date может прийти с временем — input[type=date] понимает
  // только первые десять символов, поэтому режем на входе, а не на выходе.
  const [startsAt, setStartsAt] = useState(initial.startsAt.slice(0, 10));
  const [deadline, setDeadline] = useState(initial.deadline.slice(0, 10));
  const [location, setLocation] = useState(initial.location);
  const [online, setOnline] = useState(initial.online);
  const [grades, setGrades] = useState(initial.grades.join(','));
  const [prize, setPrize] = useState(initial.prize);
  const [free, setFree] = useState(initial.free);
  const [registrationUrl, setRegistrationUrl] = useState(initial.registrationUrl);

  /** Что из уже загруженного остаётся, в том порядке, в каком останется. */
  const [keptPaths, setKeptPaths] = useState<string[]>(initial.coverPaths);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<'idle' | 'sending' | 'error' | 'denied' | 'bad-url'>('idle');

  const room = MAX_IMAGES - keptPaths.length;

  const keptUrls = useMemo(() => {
    const supabase = createClient();
    return keptPaths.map(
      (path) => supabase.storage.from('card-covers').getPublicUrl(path).data.publicUrl,
    );
  }, [keptPaths]);

  function moveKept(from: number, to: number) {
    if (to < 0 || to >= keptPaths.length) return;
    const next = [...keptPaths];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setKeptPaths(next);
  }

  /**
   * Догружает добавленные файлы и возвращает их пути по порядку.
   * undefined — сорвалась загрузка; сохранять после этого нельзя, иначе в
   * галерее окажется половина картинок, а автор об этом не узнает.
   */
  async function uploadNew(supabase: ReturnType<typeof createClient>): Promise<string[] | undefined> {
    if (newFiles.length === 0) return [];

    const paths: string[] = [];
    for (const [position, file] of newFiles.entries()) {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
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

    const uploaded = await uploadNew(supabase);
    if (uploaded === undefined) {
      setStatus('error');
      return;
    }

    /*
      Возврат строки обязателен. Политика UPDATE отсекает чужие правки не
      ошибкой, а тем, что до строки дело просто не доходит: запрос
      завершается успешно и меняет ноль строк. Без select мы бы показали
      «сохранено» там, где база ничего не сохранила.
    */
    const { data, error } = await supabase
      .from('published_events')
      .update({
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
        cover_paths: [...keptPaths, ...uploaded],
        /*
          Старая одиночная колонка гасится намеренно. Если её оставить, то
          у события, опубликованного до появления галереи, убранная обложка
          вернулась бы обратно: разбор строки берёт cover_path, когда
          cover_paths пуст. Сам путь при этом не теряется — если автор
          обложку оставил, он лежит в списке выше.
        */
        cover_path: null,
        // admin_id здесь нет и не будет: автор публикации не редактируемое поле.
      })
      .eq('id', eventId)
      .select('id');

    if (error) {
      setStatus('error');
      return;
    }
    if (!data || data.length === 0) {
      setStatus('denied');
      return;
    }

    onSaved();
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
                type === item.id
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

      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.title} className={inputCls} />
      <input
        value={organizer}
        onChange={(e) => setOrganizer(e.target.value)}
        placeholder={t.organizer}
        className={inputCls}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={t.description}
        rows={4}
        className={inputCls}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-ink-500">{t.startsAt}</label>
          <input
            type="date"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className={`${inputCls} mt-1`}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-500">{t.deadline}</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={`${inputCls} mt-1`}
          />
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
        <label className="text-sm font-semibold text-ink-700" htmlFor="event-edit-registration-url">
          {t.registrationUrl}
        </label>
        <input
          id="event-edit-registration-url"
          value={registrationUrl}
          onChange={(e) => setRegistrationUrl(e.target.value)}
          placeholder={t.registrationUrlPlaceholder}
          className={`${inputCls} mt-2`}
        />
        <p className="mt-1 text-xs text-ink-400">{t.registrationUrlHint}</p>
      </div>

      {keptPaths.length > 0 && (
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-ink-800">{t.covers}</span>
            <span className="text-xs text-ink-400">
              {keptPaths.length} из {MAX_IMAGES}
            </span>
          </div>

          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {keptPaths.map((path, index) => (
              <li key={path} className="overflow-hidden rounded-[var(--radius-control)] border border-ink-200">
                <div className="relative aspect-[16/9] bg-ink-100">
                  {/* eslint-disable-next-line @next/next/no-img-element -- публичная ссылка из бакета */}
                  <img src={keptUrls[index]} alt="" className="h-full w-full object-cover" />
                  {index === 0 && (
                    <span className="absolute left-2 top-2 rounded-[var(--radius-pill)] bg-white/90 px-2 py-0.5 text-[11px] font-bold text-ink-800">
                      {t.cover}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 bg-white px-2 py-1.5">
                  <div className="flex gap-1">
                    <MoveButton
                      label={t.left}
                      icon="chevron-left"
                      disabled={index === 0}
                      onClick={() => moveKept(index, index - 1)}
                    />
                    <MoveButton
                      label={t.right}
                      icon="chevron-right"
                      disabled={index === keptPaths.length - 1}
                      onClick={() => moveKept(index, index + 1)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setKeptPaths(keptPaths.filter((_, i) => i !== index))}
                    className="text-xs font-semibold text-ink-400 underline-offset-2 hover:text-danger-600 hover:underline"
                  >
                    {t.remove}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-2 text-xs text-ink-400">{t.coversHint}</p>
        </div>
      )}

      {room > 0 ? (
        /*
          Предел общий на старые и новые: поле считает только свои файлы и
          про уже загруженные не знает, поэтому лишнее отсекаем здесь.
        */
        <ImageGalleryField files={newFiles} onChange={(files) => setNewFiles(files.slice(0, room))} />
      ) : (
        <p className="text-xs text-ink-400">{t.coversFull}</p>
      )}

      {status === 'error' && <p className="text-sm font-semibold text-danger-600">{t.error}</p>}
      {status === 'denied' && <p className="text-sm font-semibold text-danger-600">{t.denied}</p>}
      {status === 'bad-url' && <p className="text-sm font-semibold text-danger-600">{t.registrationUrlError}</p>}

      <div className="flex flex-wrap gap-3">
        <Button onClick={submit} disabled={status === 'sending'}>
          {status === 'sending' ? t.saving : t.save}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={status === 'sending'}>
          {t.cancel}
        </Button>
      </div>
    </div>
  );
}

function MoveButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: 'chevron-left' | 'chevron-right';
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-control)] text-ink-500 transition-colors duration-150 hover:bg-ink-100 hover:text-ink-800 disabled:opacity-30 disabled:hover:bg-transparent focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <Icon name={icon} size={15} />
    </button>
  );
}

const inputCls =
  'w-full rounded-xl border border-ink-200 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
