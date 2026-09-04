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
import {
  ANNOUNCEMENT_CATEGORIES,
  formatAnnouncementDate,
  isExpired,
  isRelevantFor,
} from '@/lib/announcements';
import type { Announcement, AnnouncementCategory } from '@/lib/announcements';
import type { Dict } from '@/lib/i18n';
import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';
import { Badge, EmptyState, RailRow, Skeleton } from '@/components/ui';
import { OwnerActions } from '@/components/OwnerActions';
import { usePublishedAnnouncements } from '@/lib/supabase/announcements';
import { PublishAction } from '@/components/PublishAction';

const TEXT: Dict<{
  title: string;
  statNew: string;
  statTotal: string;
  statPinned: string;
  all: string;
  myGrade: string;
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
    statNew: 'Новых',
    statTotal: 'Всего',
    statPinned: 'Закреплённых',
    all: 'Все',
    myGrade: 'Только для моего класса',
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
    statNew: 'Жаңа',
    statTotal: 'Барлығы',
    statPinned: 'Бекітілген',
    all: 'Барлығы',
    myGrade: 'Тек менің сыныбыма',
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
    statNew: 'New',
    statTotal: 'Total',
    statPinned: 'Pinned notices',
    all: 'All',
    myGrade: 'Only for my grade',
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
  /*
    Сеттер убран: публикация ушла на отдельную страницу и возвращает сюда
    обычным переходом, а список перечитывается при монтировании. Значение
    остаётся как стабильный аргумент хука.
  */
  /*
    Ключ снова изменяемый: после удаления объявления список обязан
    перечитаться, иначе убранная запись остаётся на экране до перезагрузки
    и человек жмёт «Убрать» второй раз.
  */
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const published = usePublishedAnnouncements(feedRefreshKey);
  const ANNOUNCEMENTS = published ?? [];
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
    // published === null означает «ещё грузится»: без этой проверки эффект
    // отработал бы на пустом списке, ушёл в ранний return и больше никогда
    // не пометил бы объявления прочитанными.
    if (!hydrated || published === null) return;
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

    /*
      Снимок нельзя заменить вычислением: он снимается ровно перед тем,
      как объявления помечаются прочитанными, и после этого исходные
      данные для него уже не существуют — state.readAnnouncements
      включает всё. Вычисляемое значение здесь всегда давало бы пустой
      список, то есть плашки «Новое» не показались бы никогда.
    */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUnreadIds(unseen);
    // Помечаем весь список: страница открывается без фильтров, значит ученик
    // увидел всё разом. Помечать по мере прокрутки — сложность без пользы.
    markAnnouncementsRead(everything);
    // Снимок нужен один раз за посещение — но только после того, как список
    // реально пришёл из базы, отсюда published в зависимостях.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, published]);

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

  const pinnedCount = ANNOUNCEMENTS.filter(
    (announcement) => announcement.pinned && !isExpired(announcement),
  ).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {/*
        Страница открывается заголовком без описания и сразу показывает цифры.
        Описание того, что такое доска объявлений, ученик прочитает один раз,
        а цифру непрочитанного он приходит смотреть каждый день.
      */}
      {/* Заголовок и действие в одной строке: кнопка живёт в постоянном
          углу, а не внизу под списком. */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-medium text-ink-900 sm:text-4xl">{t.title}</h1>
        <PublishAction href="/announcements/new" label="Опубликовать" requireRole="admin" />
      </div>

      {/*
        Полоса показателей лежит прямо на фоне между двумя волосяными линиями.
        Непрочитанное набрано крупнее остального: это единственное число,
        ради которого сюда заходят.
      */}
      <div className="mt-10 grid grid-cols-3 gap-x-8 border-y border-ink-200 py-6 sm:divide-x sm:divide-ink-200">
        <div className="sm:pr-8">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.statNew}</p>
          <p className="mt-2 flex items-center gap-2 text-5xl font-medium tabular-nums text-ink-900">
            <Icon
              name="bell"
              size={28}
              className={unreadIds.length > 0 ? 'text-accent-500' : 'text-ink-300'}
            />
            {unreadIds.length}
          </p>
        </div>
        <div className="sm:px-8">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.statTotal}</p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-ink-900">{ANNOUNCEMENTS.length}</p>
        </div>
        <div className="sm:px-8">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.statPinned}</p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-ink-900">{pinnedCount}</p>
        </div>
      </div>

      {/* Фильтры лежат на голом фоне и отделены линией, а не рамкой карточки */}
      <div className="mt-10 flex flex-wrap gap-2 border-b border-ink-200 pb-4">
        <button onClick={() => setCategory('all')} className={chip(category === 'all')}>
          {t.all}
        </button>
        {ANNOUNCEMENT_CATEGORIES.map((item) => (
          <button key={item.id} onClick={() => setCategory(item.id)} className={chip(category === item.id)}>
            <Icon name={item.icon} size={16} />
            {item.title[state.language]}
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
            <Icon name="crosshair" size={16} />
            <span className="tabular-nums">
              {t.myGrade} ({grade})
            </span>
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="mt-10">
          {/* Иконка стоит рядом с блоком: проп icon в EmptyState принимает строку,
              а строкой иконку из набора не передать. */}
          <div className="mb-3 flex justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-card)] border border-ink-200 bg-white text-ink-400">
              <Icon name="megaphone" size={24} />
            </span>
          </div>
          <EmptyState title={t.emptyTitle} description={t.emptyText} />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {sorted.map((announcement) => {
            const meta = ANNOUNCEMENT_CATEGORIES.find((item) => item.id === announcement.category);
            const expired = isExpired(announcement);
            const unread = unreadIds.includes(announcement.id);

            return (
              /*
                Объявление перестало быть карточкой: карточка нужна самодостаточной
                единице, а лента однотипных объявлений это перечисление, и решётка
                одинаковых прямоугольников в нём не даёт глазу зацепки. Рейка слева
                кодирует категорию цветом, но название категории всё равно стоит
                словами над заголовком: цвет не может быть единственным носителем
                смысла. Закреплённое выделено фоном, истёкшее приглушено.
              */
              <RailRow
                key={announcement.id}
                tone={CATEGORY_TONE[announcement.category]}
                className={
                  expired
                    ? 'opacity-55'
                    : announcement.pinned
                      ? 'border-brand-500/40 bg-brand-50'
                      : ''
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-400">
                      {meta && <Icon name={meta.icon} size={14} />}
                      {meta?.title[state.language]}
                    </p>
                    <h2 className="mt-2 text-lg font-medium text-ink-900">{announcement.title}</h2>
                  </div>

                  {/* В шапке не больше двух плашек: остальное ушло в строку
                      подробностей ниже обычным текстом. */}
                  <div className="flex flex-wrap items-center gap-2">
                    {announcement.pinned && (
                      <Badge tone="brand">
                        <Icon name="pin" size={14} />
                        {t.pinned}
                      </Badge>
                    )}
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
                </div>

                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-600">
                  {announcement.body}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-ink-200 pt-3 text-xs tabular-nums text-ink-400">
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

                  {/*
                    Убрать можно прямо здесь, а не только в админке.
                    Возможность там была, но добраться до неё значило уйти
                    со страницы, где ты видишь ошибку.
                  */}
                  <span className="ml-auto">
                    <OwnerActions
                      table="published_announcements"
                      id={announcement.id}
                      authorId={null}
                      onRemoved={() => setFeedRefreshKey((key) => key + 1)}
                    />
                  </span>
                </div>
              </RailRow>
            );
          })}
        </div>
      )}
    </div>
  );
}

function chip(active: boolean): string {
  return `inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
    active
      ? 'border-brand-500 bg-brand-50 text-brand-700'
      : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]'
  }`;
}
