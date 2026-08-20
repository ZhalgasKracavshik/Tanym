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

const TEXT = {
  ru: {
    which: 'Какое достижение показать',
    caption: 'Подпись (необязательно)',
    captionPlaceholder: 'Расскажи, как этого добился',
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
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  if (unlocked.length === 0) {
    return <p className="text-sm text-ink-500">{t.noneUnlocked}</p>;
  }

  async function submit() {
    setStatus('sending');
    const supabase = createClient();
    let photoPath: string | null = null;

    if (file) {
      const path = `${userId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('achievement-photos').upload(path, file);
      if (uploadError) {
        setStatus('error');
        return;
      }
      photoPath = path;
    }

    const { error } = await supabase.from('achievement_posts').insert({
      student_id: userId,
      achievement_key: achievementKey,
      caption,
      photo_path: photoPath,
    });

    if (error) {
      setStatus('error');
      return;
    }

    setStatus('done');
    setCaption('');
    setFile(null);
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

      <div>
        <label className="text-sm font-semibold text-ink-700" htmlFor="achievement-photo">
          {t.photo}
        </label>
        <input
          id="achievement-photo"
          type="file"
          accept="image/*"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="mt-2 block text-sm text-ink-600"
        />
      </div>

      {status === 'done' && <p className="text-sm font-semibold text-success-700">{t.done}</p>}
      {status === 'error' && <p className="text-sm font-semibold text-danger-600">{t.error}</p>}

      <Button onClick={submit} disabled={status === 'sending'}>
        {status === 'sending' ? t.publishing : t.publish}
      </Button>
    </div>
  );
}
