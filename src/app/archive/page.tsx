'use client';

/**
 * Архив заданий: материалы ЕНТ, олимпиад, IELTS, SAT и суммативных работ.
 *
 * Здесь нет ни рекомендаций, ни адаптации — это сознательно. Ученик приходит
 * сюда с конкретным намерением («мне нужен SAT»), и подстраивать под него
 * выдачу значило бы мешать. Персонализация живёт на странице плана.
 */

import { useState } from 'react';
import { ARCHIVE } from '@/data/archive';
import { ARCHIVE_CATEGORIES } from '@/lib/archive';
import type { ArchiveCategory } from '@/lib/archive';
import type { Difficulty } from '@/lib/types';
import type { Dict } from '@/lib/i18n';
import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';
import { Badge, ButtonLink, Card, EmptyState } from '@/components/ui';

const TEXT: Dict<{
  title: string;
  subtitle: string;
  all: string;
  tasks: (n: number) => string;
  open: string;
  empty: string;
  socratic: string;
  socraticHint: string;
  year: string;
  difficulty: Record<Difficulty, string>;
}> = {
  ru: {
    title: 'Архив заданий',
    subtitle: 'Задания прошлых лет и подготовка к экзаменам с наставником, который не даёт ответ.',
    all: 'Все',
    tasks: (n) => `${n} заданий`,
    open: 'Разобрать',
    empty: 'В этой категории пока нет материалов.',
    socratic: 'Метод Сократа',
    socraticHint:
      'Наставник здесь работает иначе: он не выдаёт решение, а задаёт вопросы, пока ты не дойдёшь до ответа сам.',
    year: 'год',
    difficulty: { 1: 'Базовый', 2: 'Простой', 3: 'Средний', 4: 'Продвинутый', 5: 'Олимпиадный' },
  },
  kk: {
    title: 'Тапсырмалар мұрағаты',
    subtitle: 'Өткен жылдардың тапсырмалары және емтиханға дайындық, жауап бермейтін тәлімгермен.',
    all: 'Барлығы',
    tasks: (n) => `${n} тапсырма`,
    open: 'Талдау',
    empty: 'Бұл санатта әзірге материал жоқ.',
    socratic: 'Сократ әдісі',
    socraticHint:
      'Мұндағы тәлімгер басқаша жұмыс істейді: ол шешімді бермейді, сен өзің жауапқа жеткенше сұрақ қояды.',
    year: 'жыл',
    difficulty: { 1: 'Бастапқы', 2: 'Жеңіл', 3: 'Орташа', 4: 'Күрделі', 5: 'Олимпиадалық' },
  },
  en: {
    title: 'Task archive',
    subtitle: 'Past papers and exam prep with a mentor that refuses to hand you the answer.',
    all: 'All',
    tasks: (n) => `${n} tasks`,
    open: 'Work through it',
    empty: 'No materials in this category yet.',
    socratic: 'Socratic method',
    socraticHint:
      'The mentor works differently here: instead of giving the solution, it asks questions until you reach the answer yourself.',
    year: 'year',
    difficulty: { 1: 'Basic', 2: 'Easy', 3: 'Medium', 4: 'Advanced', 5: 'Olympiad' },
  },
};

export default function ArchivePage() {
  const { state } = useStore();
  const t = TEXT[state.language];

  const [category, setCategory] = useState<ArchiveCategory | 'all'>('all');

  const materials = category === 'all' ? ARCHIVE : ARCHIVE.filter((item) => item.category === category);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">{t.title}</h1>
      <p className="mt-2 text-ink-500">{t.subtitle}</p>

      {/* Пояснение метода — иначе ученик решит, что наставник сломался */}
      <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 p-4">
        <p className="flex items-center gap-2 font-bold text-brand-800">
          <Icon name="columns" size={18} />
          {t.socratic}
        </p>
        <p className="mt-3 text-sm text-brand-800">{t.socraticHint}</p>
      </div>

      {/* Фильтр по категориям */}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => setCategory('all')}
          className={chip(category === 'all')}
        >
          {t.all}
        </button>
        {ARCHIVE_CATEGORIES.map((item) => (
          <button
            key={item.id}
            onClick={() => setCategory(item.id)}
            className={chip(category === item.id)}
          >
            <Icon name={item.icon} size={16} />
            {item.title[state.language]}
          </button>
        ))}
      </div>

      {materials.length === 0 ? (
        <div className="mt-6">
          <EmptyState title={t.empty} description="" />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {materials.map((material) => {
            const meta = ARCHIVE_CATEGORIES.find((item) => item.id === material.category);
            return (
              <Card
                key={material.id}
                className="transition-all duration-150 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand">
                    {meta && <Icon name={meta.icon} size={14} />}
                    {meta?.title[state.language]}
                  </Badge>
                  <Badge>{t.difficulty[material.difficulty]}</Badge>
                  <span className="text-xs tabular-nums text-ink-400">
                    {material.year} {t.year}
                  </span>
                </div>

                <h2 className="mt-3 font-bold text-ink-900">{material.title}</h2>
                <p className="mt-3 text-sm text-ink-500">{material.description}</p>

                <p className="mt-3 text-xs text-ink-400">{material.source}</p>

                <div className="mt-6 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold tabular-nums text-brand-600">
                    {t.tasks(material.tasks.length)}
                  </span>
                  <ButtonLink href={`/archive/${material.id}`} size="sm">
                    {t.open}
                  </ButtonLink>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Стиль кнопки-фильтра. Вынесен, чтобы не повторять длинную строку классов. */
function chip(active: boolean): string {
  return `inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
    active
      ? 'border-brand-500 bg-brand-50 text-brand-700'
      : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]'
  }`;
}
