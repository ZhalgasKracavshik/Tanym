'use client';

/**
 * Архив заданий: материалы ЕНТ, олимпиад, IELTS, SAT и суммативных работ.
 *
 * Здесь нет ни рекомендаций, ни адаптации — это сознательно. Ученик приходит
 * сюда с конкретным намерением («мне нужен SAT»), и подстраивать под него
 * выдачу значило бы мешать. Персонализация живёт на странице плана.
 */

import { useEffect, useState } from 'react';
import { ARCHIVE } from '@/data/archive';
import { ARCHIVE_CATEGORIES } from '@/lib/archive';
import type { ArchiveCategory } from '@/lib/archive';
import type { Difficulty } from '@/lib/types';
import type { Dict } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';
import { Badge, ButtonLink, EmptyState, Kicker, RailRow } from '@/components/ui';
import { PublishAction } from '@/components/PublishAction';

const TEXT: Dict<{
  kicker: string;
  title: string;
  subtitle: string;
  all: string;
  tasks: (n: number) => string;
  open: string;
  empty: string;
  socratic: string;
  socraticHint: string;
  year: string;
  fromTeacher: string;
  withFile: string;
  publish: string;
  difficulty: Record<Difficulty, string>;
}> = {
  ru: {
    kicker: 'Материалы',
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
    fromTeacher: 'От учителя',
    withFile: 'С файлом',
    publish: 'Добавить материал',
    difficulty: { 1: 'Базовый', 2: 'Простой', 3: 'Средний', 4: 'Продвинутый', 5: 'Олимпиадный' },
  },
  kk: {
    kicker: 'Материалдар',
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
    fromTeacher: 'Мұғалімнен',
    withFile: 'Файлмен',
    publish: 'Материал қосу',
    difficulty: { 1: 'Бастапқы', 2: 'Жеңіл', 3: 'Орташа', 4: 'Күрделі', 5: 'Олимпиадалық' },
  },
  en: {
    kicker: 'Materials',
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
    fromTeacher: 'From a teacher',
    withFile: 'With a file',
    publish: 'Add material',
    difficulty: { 1: 'Basic', 2: 'Easy', 3: 'Medium', 4: 'Advanced', 5: 'Olympiad' },
  },
};

/**
 * Цвет рейки кодирует категорию материала.
 *
 * Категорий пять и оттенков ровно пять, так что соответствие однозначное:
 * список читается сканированием по левому краю. Цвет при этом ничего не решает
 * сам по себе: название категории стоит словами в первой же строке.
 */
const CATEGORY_TONE: Record<ArchiveCategory, 'brand' | 'accent' | 'success' | 'danger' | 'neutral'> = {
  ent: 'brand',
  olympiad: 'accent',
  ielts: 'success',
  sat: 'danger',
  'sor-soch': 'neutral',
};

/** Строка материала учителя из базы. */
interface PublishedRow {
  id: string;
  title: string;
  subject: string;
  category: string | null;
  description: string | null;
  file_path: string | null;
  tasks: unknown;
  created_at: string;
  teacher_id: string;
  difficulty: number | null;
  year: number | null;
  grades: number[] | null;
  source: string | null;
}

/** Готовый материал и материал учителя, приведённые к одному виду. */
interface ListItem {
  id: string;
  title: string;
  category: ArchiveCategory;
  description: string;
  difficulty: Difficulty;
  year: number;
  /** Кто автор: составитель готового архива или имя учителя. */
  source: string;
  taskCount: number;
  hasFile: boolean;
  fromTeacher: boolean;
}

type PublishedMaterial = ListItem;

export default function ArchivePage() {
  const { state } = useStore();
  const t = TEXT[state.language];

  const [category, setCategory] = useState<ArchiveCategory | 'all'>('all');

  /*
    Материалы учителей лежат в одном списке с готовыми, а не в отдельной
    вкладке.

    Разделение было продиктовано разницей в доверии: готовый архив собран
    заранее, учительский появляется постоянно. Но ученику, который ищет
    задачи по теме, эта разница не помогает выбрать — она заставляет его
    открыть две вкладки и сравнить. Происхождение материала честнее
    показать плашкой на самой строке: видно сразу и не делит поиск надвое.
  */
  const [published, setPublished] = useState<PublishedMaterial[]>([]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const { data } = await supabase
        .from('archive_materials')
        .select('id, title, subject, category, description, file_path, tasks, created_at, teacher_id, difficulty, year, grades, source')
        .order('created_at', { ascending: false })
        .limit(100);
      if (cancelled) return;

      const rows = (data ?? []) as PublishedRow[];
      const ids = [...new Set(rows.map((row) => row.teacher_id))];
      const names: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', ids);
        for (const profile of (profiles ?? []) as { id: string; name: string }[]) {
          names[profile.id] = profile.name;
        }
      }
      if (cancelled) return;

      setPublished(
        rows.map((row) => ({
          id: row.id,
          title: row.title,
          category: (row.category ?? 'ent') as ArchiveCategory,
          description: row.description ?? '',
          difficulty: (row.difficulty ?? 3) as Difficulty,
          year: row.year ?? new Date().getFullYear(),
          source: names[row.teacher_id] ?? '—',
          taskCount: Array.isArray(row.tasks) ? row.tasks.length : 0,
          hasFile: Boolean(row.file_path),
          fromTeacher: true,
        })),
      );
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const all: ListItem[] = [
    ...ARCHIVE.map((item) => ({
      id: item.id,
      title: item.title,
      category: item.category,
      description: item.description,
      difficulty: item.difficulty,
      year: item.year,
      source: item.source,
      taskCount: item.tasks.length,
      hasFile: false,
      fromTeacher: false,
    })),
    ...published,
  ];

  const materials = category === 'all' ? all : all.filter((item) => item.category === category);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/*
        Страница открывается микроподписью над заголовком, а не заголовком
        с серой строкой под ним. Архив это раздел, а не очередной экран,
        и открытие должно отличаться от кабинета, куда ученик ходит каждый день.
      */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Kicker>{t.kicker}</Kicker>
          <h1 className="mt-2 text-3xl font-medium text-ink-900 sm:text-4xl">{t.title}</h1>
        </div>
        <PublishAction href="/archive/community/new" label={t.publish} requireRole={['teacher', 'admin']} />
      </div>
      <p className="mt-2 max-w-2xl text-sm text-ink-500">{t.subtitle}</p>


      {/*
        Главный элемент экрана.

        Метод Сократа это единственное, чем архив отличается от папки с PDF,
        и раньше объяснение лежало в цветной коробке между заголовком и фильтром,
        то есть ровно там, куда взгляд не попадает. Теперь оно набрано крупнее
        всего остального и стоит на голом фоне между двумя волосяными линиями:
        без коробки фраза читается как утверждение продукта, а не как сноска.
      */}
      <section className="mt-10 border-y border-ink-200 py-8">
        <p className="flex items-center gap-2 text-[13px] font-medium text-ink-500">
          <Icon name="columns" size={14} />
          {t.socratic}
        </p>
        <p className="mt-4 max-w-3xl text-2xl font-medium leading-snug text-ink-900 sm:text-4xl">
          {t.socraticHint}
        </p>
      </section>

      {/* Фильтр по категориям: голый фон, снизу волосяная линия */}
      <div className="mt-10 flex flex-wrap gap-2 border-b border-ink-200 pb-4">
        <button onClick={() => setCategory('all')} className={chip(category === 'all')}>
          {t.all}
        </button>
        {ARCHIVE_CATEGORIES.map((item) => (
          <button key={item.id} onClick={() => setCategory(item.id)} className={chip(category === item.id)}>
            <Icon name={item.icon} size={16} />
            {item.title[state.language]}
          </button>
        ))}
      </div>

      {materials.length === 0 ? (
        <div className="mt-10">
          <EmptyState title={t.empty} description="" />
        </div>
      ) : (
        /*
          Материалы это перечисление, а не набор самодостаточных единиц:
          сетка из одинаковых карточек превращала список в решётку, где все
          строки весят одинаково. Строка с рейкой держит тот же объём данных
          плотнее, а левый край сразу показывает категорию.
        */
        <ul className="mt-4 space-y-2">
          {materials.map((material) => {
            const meta = ARCHIVE_CATEGORIES.find((item) => item.id === material.category);
            return (
              <li key={material.id}>
                <RailRow tone={CATEGORY_TONE[material.category]}>
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                    <div className="min-w-0 flex-1">
                      {/* В шапке строки не больше двух плашек. Год, источник
                          и число заданий ушли в строку подробностей ниже. */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="brand">
                          {meta && <Icon name={meta.icon} size={14} />}
                          {meta?.title[state.language]}
                        </Badge>
                        <Badge>{t.difficulty[material.difficulty]}</Badge>
                        {/*
                          Происхождение материала — плашкой, а не отдельной
                          вкладкой: разница в доверии настоящая, но делить
                          из-за неё поиск надвое незачем.
                        */}
                        {material.fromTeacher && <Badge tone="accent">{t.fromTeacher}</Badge>}
                        {material.hasFile && <Badge>{t.withFile}</Badge>}
                      </div>

                      <h2 className="mt-2 font-medium text-ink-900">{material.title}</h2>
                      <p className="mt-2 text-sm text-ink-500">{material.description}</p>
                      <p className="mt-2 text-xs text-ink-400">
                        <span className="tabular-nums">
                          {material.year} {t.year}
                        </span>
                        {' · '}
                        {material.source}
                        {' · '}
                        <span className="tabular-nums">{t.tasks(material.taskCount)}</span>
                      </p>
                    </div>

                    <ButtonLink
                      href={material.fromTeacher ? `/archive/community/${material.id}` : `/archive/${material.id}`}
                      size="sm"
                      variant="secondary"
                    >
                      {t.open}
                    </ButtonLink>
                  </div>
                </RailRow>
              </li>
            );
          })}
        </ul>
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
