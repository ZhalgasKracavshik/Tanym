'use client';

/**
 * Доска объявлений школьной администрации.
 *
 * Экран заменяет рассылку в WhatsApp, поэтому главный критерий — не полнота,
 * а скорость: ученик должен за десять секунд понять, что важного объявила школа.
 * Отсюда все решения на странице: закреплённое сверху, истёкшее приглушено и
 * внизу, непрочитанное помечено, а фильтр по классу убирает чужие объявления.
 */

import { useEffect, useState } from 'react';
import { ANNOUNCEMENTS } from '@/data/announcements';
import {
  ANNOUNCEMENT_CATEGORIES,
  formatAnnouncementDate,
  isExpired,
  isRelevantFor,
} from '@/lib/announcements';
import type { Announcement, AnnouncementCategory } from '@/lib/announcements';
import type { Dict } from '@/lib/i18n';
import { useStore } from '@/components/StoreProvider';
import { Badge, Card, EmptyState, Skeleton } from '@/components/ui';

const TEXT: Dict<{
  title: string;
  subtitle: string;
  all: string;
  myGrade: string;
  unread: (n: number) => string;
  pinned: string;
  isNew: string;
  expired: string;
  until: (date: string) => string;
  forGrades: (list: string) => string;
  forAll: string;
  emptyTitle: string;
  emptyText: string;
}> = {
  ru: {
    title: 'Объявления',
    subtitle: 'Всё, что объявила школа. Закреплённое и свежее — сверху.',
    all: 'Все',
    myGrade: 'Только для моего класса',
    unread: (n) => (n === 1 ? '1 новое объявление' : n < 5 ? `${n} новых объявления` : `${n} новых объявлений`),
    pinned: 'Закреплено',
    isNew: 'Новое',
    expired: 'Срок истёк',
    until: (date) => `Актуально до ${date}`,
    forGrades: (list) => `Для ${list} классов`,
    forAll: 'Для всех классов',
    emptyTitle: 'Здесь пока пусто',
    emptyText: 'В этом фильтре объявлений нет. Выберите «Все», чтобы увидеть остальные.',
  },
  kk: {
    title: 'Хабарландырулар',
    subtitle: 'Мектеп әкімшілігі хабарлағанның бәрі. Бекітілгені мен жаңасы — жоғарыда.',
    all: 'Барлығы',
    myGrade: 'Тек менің сыныбыма',
    unread: (n) => `${n} жаңа хабарландыру`,
    pinned: 'Бекітілген',
    isNew: 'Жаңа',
    expired: 'Мерзімі өтті',
    until: (date) => `${date} дейін өзекті`,
    forGrades: (list) => `${list} сыныптарға`,
    forAll: 'Барлық сыныптарға',
    emptyTitle: 'Әзірге бос',
    emptyText: 'Бұл сүзгіде хабарландыру жоқ. Қалғанын көру үшін «Барлығы» дегенді таңдаңыз.',
  },
  en: {
    title: 'Announcements',
    subtitle: 'Everything the school has announced. Pinned and recent notices come first.',
    all: 'All',
    myGrade: 'Only for my grade',
    unread: (n) => (n === 1 ? '1 new announcement' : `${n} new announcements`),
    pinned: 'Pinned',
    isNew: 'New',
    expired: 'Expired',
    until: (date) => `Relevant until ${date}`,
    forGrades: (list) => `For grades ${list}`,
    forAll: 'For all grades',
    emptyTitle: 'Nothing here yet',
    emptyText: 'No announcements match this filter. Choose “All” to see the rest.',
  },
};

/** Цвет плашки категории. «Важное» выделено намеренно — иначе его не отличить от общего. */
const CATEGORY_TONE: Record<AnnouncementCategory, 'brand' | 'danger' | 'accent' | 'neutral'> = {
  important: 'danger',
  schedule: 'accent',
  medical: 'brand',
  assembly: 'brand',
  general: 'neutral',
};

export default function AnnouncementsPage() {
  const { state, hydrated, markAnnouncementsRead } = useStore();
  const t = TEXT[state.language];

  const [category, setCategory] = useState<AnnouncementCategory | 'all'>('all');
  const [onlyMyGrade, setOnlyMyGrade] = useState(false);

  /**
   * Список непрочитанного фиксируем один раз за посещение.
   *
   * Причина та же, что на странице достижений: как только объявления помечены
   * прочитанными, state.readAnnouncements обновится, страница перерисуется —
   * и плашки «Новое» исчезнут за доли секунды, раньше, чем ученик их заметит.
   * Снимок живёт до ухода со страницы, при следующем заходе объявления уже старые.
   */
  const [unreadIds, setUnreadIds] = useState<string[]>([]);

  useEffect(() => {
    if (!hydrated) return;
    // Истёкшие в счётчик не берём: плашку «Новое» они всё равно не получают,
    // и без этого фильтра счётчик обещал бы восемь новых там, где помечено семь.
    const unseen = ANNOUNCEMENTS.filter(
      (announcement) => !state.readAnnouncements.includes(announcement.id) && !isExpired(announcement),
    ).map((announcement) => announcement.id);

    // Прочитанными помечаем всё, включая истёкшие: иначе они всплывут как
    // «новые», если однажды перестанут быть истёкшими.
    const everything = ANNOUNCEMENTS.filter(
      (announcement) => !state.readAnnouncements.includes(announcement.id),
    ).map((announcement) => announcement.id);

    if (everything.length === 0) return;

    setUnreadIds(unseen);
    // Помечаем весь список: страница открывается без фильтров, значит ученик
    // увидел всё разом. Помечать по мере прокрутки — сложность без пользы.
    markAnnouncementsRead(everything);
    // Намеренно только по hydrated: снимок нужен один раз за посещение страницы.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const grade = state.profile?.grade ?? null;

  const visible = ANNOUNCEMENTS.filter((announcement) => {
    if (category !== 'all' && announcement.category !== category) return false;
    if (onlyMyGrade && !isRelevantFor(announcement, grade)) return false;
    return true;
  });

  /**
   * Порядок вывода. Истёкшее уходит в самый низ независимо от закрепления:
   * закреплённое объявление про линейку 1 сентября второго сентября уже мусор,
   * но убирать его совсем нельзя — по нему ученик сверяет, что ничего не пропустил.
   */
  const sorted = [...visible].sort((a, b) => {
    const rank = (announcement: Announcement) => {
      if (isExpired(announcement)) return 2;
      return announcement.pinned ? 0 : 1;
    };
    const byRank = rank(a) - rank(b);
    // Внутри группы — свежие сверху, поэтому сравнение перевёрнуто.
    return byRank !== 0 ? byRank : b.publishedAt.localeCompare(a.publishedAt);
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">{t.title}</h1>
      <p className="mt-2 text-ink-500">{t.subtitle}</p>
      {unreadIds.length > 0 && (
        <p className="mt-2 text-sm font-semibold text-accent-700">🔔 {t.unread(unreadIds.length)}</p>
      )}

      {/* Фильтры */}
      <div className="mt-6 flex flex-wrap gap-2">
        <button onClick={() => setCategory('all')} className={chip(category === 'all')}>
          {t.all}
        </button>
        {ANNOUNCEMENT_CATEGORIES.map((item) => (
          <button key={item.id} onClick={() => setCategory(item.id)} className={chip(category === item.id)}>
            <span aria-hidden>{item.icon}</span> {item.title[state.language]}
          </button>
        ))}
        {/* Фильтр по классу — переключатель, а не ещё одна категория: он сужает
            любой выбранный раздел, а не заменяет его. */}
        {grade !== null && (
          <button
            onClick={() => setOnlyMyGrade((previous) => !previous)}
            aria-pressed={onlyMyGrade}
            className={chip(onlyMyGrade)}
          >
            🎯 {t.myGrade} ({grade})
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon="📭" title={t.emptyTitle} description={t.emptyText} />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {sorted.map((announcement) => {
            const meta = ANNOUNCEMENT_CATEGORIES.find((item) => item.id === announcement.category);
            const expired = isExpired(announcement);
            const unread = unreadIds.includes(announcement.id);

            return (
              <Card
                key={announcement.id}
                className={
                  expired
                    ? 'opacity-55'
                    : announcement.pinned
                      ? 'border-brand-500/40 bg-brand-50'
                      : ''
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  {announcement.pinned && (
                    <Badge tone="brand">
                      <span aria-hidden>📌</span> {t.pinned}
                    </Badge>
                  )}
                  <Badge tone={CATEGORY_TONE[announcement.category]}>
                    <span aria-hidden>{meta?.icon}</span> {meta?.title[state.language]}
                  </Badge>
                  {/* Непрочитанное помечаем и точкой, и словом: одна точка теряется
                      на экране телефона, одно слово теряется среди других плашек. */}
                  {unread && !expired && (
                    <Badge tone="accent">
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent-700" />
                      {t.isNew}
                    </Badge>
                  )}
                  {expired && <Badge tone="neutral">{t.expired}</Badge>}
                </div>

                <h2 className="mt-3 text-lg font-bold text-ink-900">{announcement.title}</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-600">
                  {announcement.body}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-ink-200 pt-3 text-xs text-ink-400">
                  <span className="font-semibold text-ink-600">{announcement.author}</span>
                  <span aria-hidden>·</span>
                  <span>{formatAnnouncementDate(announcement.publishedAt, state.language)}</span>
                  <span aria-hidden>·</span>
                  <span>
                    {announcement.targetGrades === null
                      ? t.forAll
                      : t.forGrades(announcement.targetGrades.join(', '))}
                  </span>
                  {announcement.expiresAt && (
                    <>
                      <span aria-hidden>·</span>
                      <span>
                        {t.until(formatAnnouncementDate(announcement.expiresAt, state.language))}
                      </span>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function chip(active: boolean): string {
  return `rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
    active
      ? 'border-brand-500 bg-brand-50 text-brand-700'
      : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300'
  }`;
}
