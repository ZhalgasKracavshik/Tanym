'use client';

/**
 * Шапка лендинга.
 *
 * Вместо кнопки «Начать» отображает стильную аватарку пользователя,
 * ведущую прямо в профиль.
 */

import Link from 'next/link';
import { useStore } from './StoreProvider';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { LANGUAGES } from '@/lib/i18n-shared';
import type { Dict } from '@/lib/i18n';
import { Logo } from './Logo';
import { Avatar } from './Avatar';
import { avatarPhotoUrl } from '@/lib/supabase/avatarPhoto';

const TEXT: Dict<{
  profile: string;
  language: string;
}> = {
  ru: { profile: 'Мой профиль', language: 'Язык интерфейса' },
  kk: { profile: 'Менің профилім', language: 'Интерфейс тілі' },
  en: { profile: 'My profile', language: 'Interface language' },
};

export function SiteHeader() {
  const { state, setLanguage } = useStore();
  const { profile: schoolProfile } = useSchoolAuth();
  const t = TEXT[state.language];
  const profile = state.profile;
  const displayName = schoolProfile?.name ?? profile?.name ?? '';

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <Logo />
        </Link>

        <div className="flex shrink-0 items-center gap-3">
          <div className="flex rounded-lg border border-ink-200 p-0.5" role="group" aria-label={t.language}>
            {LANGUAGES.map((item) => (
              <button
                key={item.id}
                onClick={() => setLanguage(item.id)}
                title={item.title}
                aria-pressed={state.language === item.id}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  state.language === item.id ? 'bg-brand-500 text-white shadow-sm' : 'text-ink-400 hover:text-ink-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <Link
            href="/profile"
            title={displayName ? `${t.profile}: ${displayName}` : t.profile}
            className="group relative flex items-center justify-center rounded-full p-0.5 transition-transform duration-150 hover:scale-105 outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <Avatar
              name={displayName}
              colorId={schoolProfile?.avatar_color}
              photoUrl={state.profile?.avatarPhotoUrl || avatarPhotoUrl(schoolProfile?.avatar_photo_path)}
              size={38}
              className="ring-2 ring-transparent transition-all group-hover:ring-brand-400 shadow-sm"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
