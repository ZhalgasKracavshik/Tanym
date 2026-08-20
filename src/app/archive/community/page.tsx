'use client';

/**
 * Материалы, опубликованные учителями и админами — вторая подстраница
 * архива. Отдельно от стандартного архива (тот собран и проверен командой
 * заранее), потому что здесь контент появляется постоянно и без модерации
 * редакцией — это честно другое доверие, и смешивать оба списка означало бы
 * стереть разницу.
 */

import { Suspense, useState } from 'react';
import type { Dict } from '@/lib/i18n';
import { useStore } from '@/components/StoreProvider';
import { Kicker } from '@/components/ui';
import { SchoolAuthGate } from '@/components/SchoolAuthGate';
import { ArchiveMaterialPublishForm } from '@/components/ArchiveMaterialPublishForm';
import { ArchiveMaterialFeed } from '@/components/ArchiveMaterialFeed';
import { ArchiveTabs } from '../ArchiveTabs';

const TEXT: Dict<{
  kicker: string;
  title: string;
  subtitle: string;
  feedTitle: string;
  publishTitle: string;
}> = {
  ru: {
    kicker: 'Материалы',
    title: 'От учителей и админов',
    subtitle: 'Материалы для подготовки, которые публикуют учителя и администраторы школы — с теми же диалогами по методу Сократа.',
    feedTitle: 'Опубликованные материалы',
    publishTitle: 'Опубликовать материал',
  },
  kk: {
    kicker: 'Материалдар',
    title: 'Мұғалімдер мен админдерден',
    subtitle: 'Мектеп мұғалімдері мен әкімшілері жариялайтын дайындық материалдары — Сократ әдісі бойынша сол диалогтармен.',
    feedTitle: 'Жарияланған материалдар',
    publishTitle: 'Материал жариялау',
  },
  en: {
    kicker: 'Materials',
    title: 'From teachers and admins',
    subtitle: 'Prep materials published by teachers and school administrators — with the same Socratic-method dialogue.',
    feedTitle: 'Published materials',
    publishTitle: 'Publish a material',
  },
};

export default function CommunityArchivePage() {
  const { state } = useStore();
  const t = TEXT[state.language];
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Kicker>{t.kicker}</Kicker>
      <h1 className="mt-2 text-3xl font-semibold text-ink-900 sm:text-4xl">{t.title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-500">{t.subtitle}</p>

      <ArchiveTabs active="community" language={state.language} />

      <div className="mt-10">
        <Kicker>{t.feedTitle}</Kicker>
        <div className="mt-4">
          <ArchiveMaterialFeed language={state.language} refreshKey={refreshKey} />
        </div>
      </div>

      <div className="mt-10 border-t border-ink-200 pt-10">
        <Kicker>{t.publishTitle}</Kicker>
        <div className="mt-4">
          <Suspense fallback={null}>
            <SchoolAuthGate requireRole={['teacher', 'admin']} language={state.language}>
              {(profile) => (
                <ArchiveMaterialPublishForm
                  language={state.language}
                  userId={profile.id}
                  onPublished={() => setRefreshKey((key) => key + 1)}
                />
              )}
            </SchoolAuthGate>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
