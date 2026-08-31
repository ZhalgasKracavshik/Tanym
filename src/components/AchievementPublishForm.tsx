'use client';

/**
 * Форма публикации достижения с фото.
 *
 * Загрузка идёт прямо из браузера в Supabase Storage — без промежуточного
 * серверного роута, потому что политика RLS уже разрешает это любому
 * вошедшему пользователю, а лишний прокси-роут только добавил бы задержку.
 */

import { useState } from 'react';
import { evaluateAchievements } from '@/lib/achievements';
import type { AppState, Language } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui';
import { Icon } from './Icon';
import { isSafeExternalUrl } from '@/lib/safeUrl';

/*
  Что можно приложить к записи.

  Списки совпадают с тем, что разрешено бакету в хранилище: там это
  запрет, здесь — предупреждение до загрузки. Держать два разных набора
  нельзя, иначе форма пообещает то, что сервер не примет.
*/
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/ogg'];
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const TEXT = {
  ru: {
    which: 'Какое достижение показать',
    caption: 'Подпись (необязательно)',
    captionPlaceholder: 'Расскажи, как этого добился',
    audioLabel: 'Аудиозапись (необязательно)',
    videoLabel: 'Ссылка на видео (необязательно)',
    videoPlaceholder: 'https://…',
    badPhoto: 'Для фотографии подойдёт JPG, PNG или WebP.',
    badAudio: 'Для записи подойдёт MP3, M4A, WAV или OGG.',
    badVideo: 'Ссылка должна начинаться с http:// или https://.',
    tooBig: 'Файл больше 10 МБ. Возьмите файл поменьше.',
    photo: 'Фото (необязательно)',
    publish: 'Опубликовать',
    publishing: 'Публикуем…',
    done: 'Опубликовано! Другие ученики увидят это в ленте.',
    error: 'Не получилось опубликовать. Попробуй ещё раз.',
    noneUnlocked: 'Открой хотя бы одно достижение, чтобы поделиться им.',
  },
  kk: {
    which: 'Қай жетістікті көрсету',
    caption: 'Жазба (міндетті емес)',
    captionPlaceholder: 'Мұған қалай жеттің',
    audioLabel: 'Аудиожазба (міндетті емес)',
    videoLabel: 'Бейнеге сілтеме (міндетті емес)',
    videoPlaceholder: 'https://…',
    badPhoto: 'Фотосурет үшін JPG, PNG немесе WebP жарайды.',
    badAudio: 'Жазба үшін MP3, M4A, WAV немесе OGG жарайды.',
    badVideo: 'Сілтеме http:// немесе https:// деп басталуы керек.',
    tooBig: 'Файл 10 МБ-тан үлкен. Кішірек файл таңдаңыз.',
    photo: 'Фото (міндетті емес)',
    publish: 'Жариялау',
    publishing: 'Жариялануда…',
    done: 'Жарияланды! Басқа оқушылар лентада көреді.',
    error: 'Жариялау мүмкін болмады. Қайта көріңіз.',
    noneUnlocked: 'Бөлісу үшін кемінде бір жетістікті аш.',
  },
  en: {
    which: 'Which achievement to show',
    caption: 'Caption (optional)',
    captionPlaceholder: 'Tell how you got there',
    audioLabel: 'Audio recording (optional)',
    videoLabel: 'Video link (optional)',
    videoPlaceholder: 'https://…',
    badPhoto: 'A photo can be JPG, PNG or WebP.',
    badAudio: 'A recording can be MP3, M4A, WAV or OGG.',
    badVideo: 'The link must start with http:// or https://.',
    tooBig: 'The file is larger than 10 MB. Pick a smaller one.',
    photo: 'Photo (optional)',
    publish: 'Publish',
    publishing: 'Publishing…',
    done: 'Published! Other students will see it in the feed.',
    error: "Couldn't publish. Please try again.",
    noneUnlocked: 'Unlock at least one achievement to share it.',
  },
} as const;

export function AchievementPublishForm({
  state,
  language,
  userId,
  onPublished,
}: {
  state: AppState;
  language: Language;
  userId: string;
  onPublished: () => void;
}) {
  const t = TEXT[language];
  const unlocked = evaluateAchievements(state).filter((item) => item.unlocked);
  const [achievementKey, setAchievementKey] = useState(unlocked[0]?.id ?? '');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [problem, setProblem] = useState<string | null>(null);

  if (unlocked.length === 0) {
    return <p className="text-sm text-ink-500">{t.noneUnlocked}</p>;
  }

  /*
    Проверка вложений до отправки.

    Хранилище ограничивает тип и размер само, но узнать об этом ученик
    должен до загрузки, а не после отказа сервера: файл может быть
    большим, и ждать его ради сообщения об ошибке незачем.
  */
  function attachmentProblem(): string | null {
    if (file && !PHOTO_TYPES.includes(file.type)) return t.badPhoto;
    if (file && file.size > MAX_ATTACHMENT_BYTES) return t.tooBig;
    if (audio && !AUDIO_TYPES.includes(audio.type)) return t.badAudio;
    if (audio && audio.size > MAX_ATTACHMENT_BYTES) return t.tooBig;
    if (videoUrl.trim() !== '' && !isSafeExternalUrl(videoUrl)) return t.badVideo;
    return null;
  }

  async function submit() {
    const found = attachmentProblem();
    if (found) {
      setProblem(found);
      return;
    }
    setProblem(null);
    setStatus('sending');
    const supabase = createClient();

    /** Общая загрузка: путь начинается с идентификатора автора — по нему разграничен доступ. */
    async function upload(item: File): Promise<string | null> {
      const path = `${userId}/${Date.now()}-${item.name}`;
      const { error: uploadError } = await supabase.storage.from('achievement-photos').upload(path, item);
      return uploadError ? null : path;
    }

    let photoPath: string | null = null;
    if (file) {
      photoPath = await upload(file);
      if (photoPath === null) {
        setStatus('error');
        return;
      }
    }

    let audioPath: string | null = null;
    if (audio) {
      audioPath = await upload(audio);
      if (audioPath === null) {
        setStatus('error');
        return;
      }
    }

    const { error } = await supabase.from('achievement_posts').insert({
      student_id: userId,
      achievement_key: achievementKey,
      caption,
      photo_path: photoPath,
      audio_path: audioPath,
      video_url: videoUrl.trim() === '' ? null : videoUrl.trim(),
    });

    if (error) {
      setStatus('error');
      return;
    }

    setStatus('done');
    setCaption('');
    setFile(null);
    setAudio(null);
    setVideoUrl('');
    onPublished();
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-semibold text-ink-700">{t.which}</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {unlocked.map((item) => (
            <button
              key={item.id}
              onClick={() => setAchievementKey(item.id)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all duration-150 ${
                achievementKey === item.id
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

      <div>
        <label className="text-sm font-semibold text-ink-700" htmlFor="achievement-caption">
          {t.caption}
        </label>
        <textarea
          id="achievement-caption"
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder={t.captionPlaceholder}
          rows={2}
          className="mt-2 w-full rounded-xl border border-ink-200 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        />
      </div>

      {/*
        Вложения. Все три необязательны и не исключают друг друга: к
        песне уместна и обложка, а к выступлению — и запись, и ссылка на
        полное видео.

        accept перечисляет типы явно, а не «audio/*»: у части браузеров
        подстановочная маска пропускает форматы, которые не примет ни
        хранилище, ни проигрыватель, и человек узнаёт об этом только
        после загрузки.
      */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold text-ink-700" htmlFor="achievement-photo">
            {t.photo}
          </label>
          <input
            id="achievement-photo"
            type="file"
            accept={PHOTO_TYPES.join(',')}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="mt-2 block w-full text-sm text-ink-600"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-ink-700" htmlFor="achievement-audio">
            {t.audioLabel}
          </label>
          <input
            id="achievement-audio"
            type="file"
            accept={AUDIO_TYPES.join(',')}
            onChange={(event) => setAudio(event.target.files?.[0] ?? null)}
            className="mt-2 block w-full text-sm text-ink-600"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-ink-700" htmlFor="achievement-video">
          {t.videoLabel}
        </label>
        <input
          id="achievement-video"
          type="url"
          inputMode="url"
          value={videoUrl}
          onChange={(event) => setVideoUrl(event.target.value)}
          placeholder={t.videoPlaceholder}
          className="mt-2 w-full rounded-xl border border-ink-200 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        />
      </div>

      {problem && <p className="text-sm font-semibold text-danger-600">{problem}</p>}
      {status === 'done' && <p className="text-sm font-semibold text-success-700">{t.done}</p>}
      {status === 'error' && <p className="text-sm font-semibold text-danger-600">{t.error}</p>}

      <Button onClick={submit} disabled={status === 'sending'}>
        {status === 'sending' ? t.publishing : t.publish}
      </Button>
    </div>
  );
}
