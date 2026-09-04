'use client';

/**
 * Портфолио достижений ученика.
 *
 * Показывает подтверждённые достижения и — владельцу — его собственные
 * заявки в любом статусе, включая отклонённые. Скрывать отказ нельзя:
 * ученик должен понимать, почему баллы не начислились.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  LEVELS,
  LEVEL_TITLES,
  PLACES,
  PLACE_TITLES,
  placeTone,
  type AchievementLevel,
  type AchievementPlace,
  type AchievementStatus,
  type PortfolioAchievement,
} from '@/lib/portfolio';
import type { Language } from '@/lib/types';
import {
  ACHIEVEMENT_ACTION_CLASS,
  AchievementCard as AchievementPhotoCard,
  type AchievementCardTone,
} from './AchievementCard';
import { normalizeSocialUrl } from '@/lib/social';
import { Icon } from './Icon';
import { PressButton, Spinner, StaggerGroup, StaggerItem } from './motion';
import { storageObjectName } from '@/lib/storageKey';

interface Row {
  id: string;
  student_id: string;
  title: string;
  description: string;
  category: string;
  level: AchievementLevel;
  place: AchievementPlace;
  happened_on: string;
  organizer: string | null;
  proof_url: string | null;
  proof_path: string | null;
  status: AchievementStatus;
  points: number;
  created_at: string;
}

function rowToAchievement(row: Row): PortfolioAchievement {
  return {
    id: row.id,
    studentId: row.student_id,
    title: row.title,
    description: row.description,
    category: row.category,
    level: row.level,
    place: row.place,
    happenedOn: row.happened_on,
    organizer: row.organizer,
    proofLink: row.proof_url,
    proofPath: row.proof_path,
    status: row.status,
    points: row.points,
    createdAt: row.created_at,
  };
}

export function usePortfolio(studentId: string | null, refreshKey = 0) {
  /*
    Достижения хранятся вместе с тем, чьи они.

    Раньше в начале эффекта стоял setItems([]) на случай неизвестного
    ученика. Это давало две беды сразу: лишний синхронный setState внутри
    эффекта и — что хуже — «пусто» вместо «грузится». Пока профиль
    подтягивается, studentId равен null, и владельцу полного портфолио
    успевал мигнуть экран «здесь появятся ваши олимпиады». Несовпадение
    идентификаторов само означает «ещё грузится», и подставить чужие
    достижения в этой схеме невозможно.
  */
  const [loaded, setLoaded] = useState<{ studentId: string; items: PortfolioAchievement[] } | null>(
    null,
  );

  useEffect(() => {
    if (!studentId) return;

    const supabase = createClient();
    let cancelled = false;

    supabase
      .from('portfolio_achievements')
      .select('*')
      .eq('student_id', studentId)
      .order('happened_on', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setLoaded({
          studentId,
          items: ((data as Row[] | null) ?? []).map(rowToAchievement),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [studentId, refreshKey]);

  return loaded !== null && loaded.studentId === studentId ? loaded.items : null;
}

/**
 * Подтверждённые достижения всей школы — для учителя и администрации.
 *
 * Своего портфолио у них нет и быть не может: олимпиады сдают ученики.
 * Но страница достижений до сих пор показывала им только ленту и чужие
 * значки тренажёра, то есть ровно то, что их не касается. Учителю нужно
 * видеть, чего добились его ученики, — иначе раздел для него пустой.
 *
 * Берутся только подтверждённые: заявка на проверке — это ещё не
 * достижение, и показывать её всей школе рано.
 */
export function useSchoolPortfolio(enabled: boolean, refreshKey = 0) {
  const [items, setItems] = useState<{ achievement: PortfolioAchievement; author: string }[] | null>(
    null,
  );

  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from('portfolio_achievements')
        .select('*')
        .eq('status', 'approved')
        .order('happened_on', { ascending: false });
      if (cancelled) return;

      const rows = (data as Row[] | null) ?? [];
      const ids = [...new Set(rows.map((row) => row.student_id))];
      // Имена отдельным запросом и пачкой: во вложенном select они пришли
      // бы через связь, которой у таблицы нет.
      const names: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', ids);
        for (const profile of (profiles ?? []) as { id: string; name: string }[]) {
          names[profile.id] = profile.name;
        }
      }
      if (cancelled) return;
      setItems(rows.map((row) => ({ achievement: rowToAchievement(row), author: names[row.student_id] ?? '—' })));
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [enabled, refreshKey]);

  return items;
}

/**
 * Медальный оттенок места — в заливку карточки, когда фото нет.
 *
 * Второе место и участие делят один тёмно-синий: придумывать им отдельные
 * цвета — значит вводить различие, которого в предметной области нет.
 */
const PLACE_FILL: Record<ReturnType<typeof placeTone>, AchievementCardTone> = {
  gold: 'accent',
  silver: 'ink',
  bronze: 'brand',
  neutral: 'ink',
};

/** Скан PDF нельзя положить фоном — только открыть ссылкой. */
function isImageProof(url: string): boolean {
  return !/\.pdf(\?|#|$)/i.test(url);
}

/** Отсканированный диплом весит больше декоративной обложки — 8 МБ вместо 4. */
const MAX_PROOF_BYTES = 8 * 1024 * 1024;

/**
 * Загрузка подтверждения — фото или PDF, с настоящим превью.
 *
 * Раньше здесь стоял голый `<input type="file">`: выбранный файл никак не
 * подтверждался на экране, кроме системной подписи браузера. На это и была
 * жалоба «изображение разместить негде» — поле было, а результат выбора
 * не был виден.
 *
 * Общий ImageField не подходит без переделки: он принимает только
 * jpeg/png/webp и не умеет предпросматривать PDF, а грамоту чаще всего
 * сканируют именно в PDF — терять эту возможность нельзя.
 */
function ProofField({ file, onChange }: { file: File | null; onChange: (file: File | null) => void }) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPdf = file?.type === 'application/pdf';
  const preview = useMemo(() => (file && !isPdf ? URL.createObjectURL(file) : null), [file, isPdf]);
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function pick(next: File | null) {
    if (!next) {
      setError(null);
      onChange(null);
      return;
    }
    const isAllowed = next.type.startsWith('image/') || next.type === 'application/pdf';
    if (!isAllowed) {
      setError('Подойдёт фото (JPG, PNG, WebP) или PDF.');
      onChange(null);
      return;
    }
    if (next.size > MAX_PROOF_BYTES) {
      setError(`Файл больше ${Math.round(MAX_PROOF_BYTES / 1024 / 1024)} МБ. Пересканируйте с меньшим разрешением.`);
      onChange(null);
      return;
    }
    setError(null);
    onChange(next);
  }

  return (
    <div>
      <span className="text-sm font-semibold text-ink-700">Диплом или грамота</span>

      {file ? (
        <div className="mt-2 overflow-hidden rounded-[var(--radius-control)] border border-ink-200">
          {preview ? (
            <div className="relative aspect-[16/10] bg-ink-100">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob-ссылка на локальный файл */}
              <img src={preview} alt="" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-ink-50 px-4 py-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-danger-600 shadow-[var(--shadow-rest)]">
                <Icon name="folder" size={20} />
              </span>
              <span className="min-w-0 text-sm font-semibold text-ink-700">PDF-документ</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 bg-white px-3 py-2">
            <span className="min-w-0 truncate text-xs text-ink-500">{file.name}</span>
            <button
              type="button"
              onClick={() => {
                pick(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
              className="shrink-0 text-xs font-semibold text-ink-400 underline-offset-2 hover:text-danger-600 hover:underline"
            >
              Убрать
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-2 flex w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-control)] border border-dashed border-ink-300 bg-ink-50/60 px-4 py-8 text-center transition-colors duration-150 hover:border-brand-400 hover:bg-brand-50/50 focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-500 shadow-[var(--shadow-rest)]">
            <Icon name="image" size={20} />
          </span>
          <span className="text-sm font-semibold text-ink-700">Загрузить диплом</span>
          <span className="text-xs text-ink-400">Фото или PDF, до 8 МБ</span>
        </button>
      )}

      {error ? (
        <p className="mt-2 text-xs font-medium text-danger-600">{error}</p>
      ) : (
        <p className="mt-2 text-xs text-ink-400">Без подтверждения заявку скорее всего отклонят.</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        onChange={(event) => pick(event.target.files?.[0] ?? null)}
      />
    </div>
  );
}

/**
 * Достижение портфолио в виде карточки-снимка.
 *
 * Здесь живёт только перевод предметной модели в подписи: заголовок — само
 * событие, подзаголовок — место, уровень и направление, третья строка —
 * рассказ ученика.
 */
export function AchievementCard({
  achievement,
  language,
  onDelete,
  showProof = true,
}: {
  achievement: PortfolioAchievement;
  language: Language;
  onDelete?: () => void;
  /**
   * Разворачивать ли скан грамоты на всю карточку.
   *
   * На скане обычно напечатано имя ребёнка и название школы. В собственном
   * портфолио это нормально — владелец смотрит на свой документ. Страницы
   * чужого портфолио в проекте пока нет; когда она появится, ей сюда нужно
   * передать `false`: карточка уйдёт на заливку, а сам документ останется
   * доступен по ссылке «Диплом» — то есть по осознанному действию, а не в
   * превью для всех подряд. Ради этого проп и заведён заранее, чтобы правило
   * было записано там же, где решение о показе скана.
   *
   * В общешкольных лентах то же правило уже действует, только решается оно
   * там самостоятельно — см. ActivityFeed.tsx: записи
   * 'achievement_approved' идут вообще без вложения.
   */
  showProof?: boolean;
}) {
  const proofUrl = achievement.proofPath
    ? createClient().storage.from('achievement-proofs').getPublicUrl(achievement.proofPath).data.publicUrl
    : null;

  const subtitle = [
    PLACE_TITLES[achievement.place][language],
    LEVEL_TITLES[achievement.level][language],
    achievement.category.trim(),
    achievement.organizer?.trim(),
  ]
    .filter(Boolean)
    .join(' · ');

  /*
    Ссылка на протокол проверяется здесь ещё раз. Записи в базе старше
    проверки в форме, и доверять им как безопасным нельзя: href с чужой
    схемой — это исполняемый код на странице проверяющего.
  */
  const resultsUrl = achievement.proofLink ? normalizeSocialUrl(achievement.proofLink) : null;
  const hasActions = Boolean(proofUrl || resultsUrl || onDelete);

  return (
    <AchievementPhotoCard
      title={achievement.title}
      subtitle={subtitle}
      description={achievement.description}
      date={achievement.happenedOn}
      language={language}
      photoUrl={showProof && proofUrl && isImageProof(proofUrl) ? proofUrl : null}
      status={achievement.status}
      points={achievement.points}
      tone={PLACE_FILL[placeTone(achievement.place)]}
      icon="medal"
      actions={
        hasActions ? (
          <>
            {proofUrl && (
              <a
                href={proofUrl}
                target="_blank"
                rel="noreferrer"
                className={ACHIEVEMENT_ACTION_CLASS}
              >
                Диплом
              </a>
            )}

            {resultsUrl && (
              <a
                href={resultsUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className={ACHIEVEMENT_ACTION_CLASS}
              >
                Результаты
              </a>
            )}

            {onDelete && (
              <button onClick={onDelete} className={`ml-auto ${ACHIEVEMENT_ACTION_CLASS}`}>
                Удалить
              </button>
            )}
          </>
        ) : undefined
      }
    />
  );
}

const INPUT =
  'h-12 w-full rounded-[var(--radius-control)] border border-ink-200 bg-white px-4 text-sm text-ink-900 outline-none transition-all placeholder:text-ink-300 focus:border-brand-400 focus:ring-4 focus:ring-brand-100';

/** Форма подачи достижения. Показывается только владельцу-ученику. */
export function AchievementForm({
  studentId,
  language,
  onSubmitted,
}: {
  studentId: string;
  language: Language;
  onSubmitted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState<AchievementLevel>('city');
  const [place, setPlace] = useState<AchievementPlace>('first');
  const [happenedOn, setHappenedOn] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  /*
    Отказ загрузки и незаполненные поля — разные вещи, и раньше они
    показывали одно сообщение: «проверьте название и дату». Человек с
    заполненными названием и датой читал это как поломку продукта, а
    отказ на самом деле приходил от хранилища.
  */
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error' | 'upload-failed'>('idle');

  async function submit() {
    if (!title.trim() || !happenedOn) {
      setStatus('error');
      return;
    }
    setStatus('sending');

    const supabase = createClient();
    let proofPath: string | null = null;

    if (file) {
      const path = `${studentId}/${storageObjectName(file.name)}`;
      const { error: uploadError } = await supabase.storage.from('achievement-proofs').upload(path, file);
      if (uploadError) {
        setStatus('upload-failed');
        return;
      }
      proofPath = path;
    }

    // points и status намеренно не передаём: их ставит проверяющий,
    // а политика RLS не пропустит строку с ненулевыми баллами от ученика.
    const { error } = await supabase.from('portfolio_achievements').insert({
      student_id: studentId,
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      level,
      place,
      happened_on: happenedOn,
      organizer: organizer.trim() === '' ? null : organizer.trim(),
      /*
        Ссылка нормализуется при сохранении: «olympiad.kz» без схемы
        браузер считает путём внутри Tanym, а чужая схема в href — это
        исполняемый код на странице проверяющего.
      */
      proof_url: proofUrl.trim() === '' ? null : normalizeSocialUrl(proofUrl.trim()),
      proof_path: proofPath,
    });

    if (error) {
      setStatus('error');
      return;
    }

    setStatus('done');
    setTitle('');
    setDescription('');
    setCategory('');
    setOrganizer('');
    setProofUrl('');
    setFile(null);
    setOpen(false);
    onSubmitted();
  }

  if (!open) {
    return (
      <div>
        {status === 'done' && (
          <p className="mb-3 rounded-[var(--radius-control)] border border-success-200 bg-success-50 px-4 py-3 text-sm font-medium text-success-700">
            Отправлено на проверку. Баллы начислятся после подтверждения.
          </p>
        )}
        <PressButton
          onClick={() => {
            setStatus('idle');
            setOpen(true);
          }}
          className="flex h-12 items-center gap-2 rounded-[var(--radius-pill)] px-6 text-sm font-medium bg-ink-900 text-white transition-colors hover:bg-ink-800 shadow-[var(--shadow-rest)]"
            >
          <Icon name="plus" size={17} />
          Добавить достижение
        </PressButton>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-[var(--radius-card)] border border-ink-200 bg-white p-6 shadow-[var(--shadow-rest)]">
      <h3 className="font-medium text-ink-900">Новое достижение</h3>

      {/*
        У каждого поля своя подпись, а не только placeholder.

        Подпись в placeholder исчезает, как только начали печатать: человек
        дописывает третье поле и уже не помнит, что в нём. Хуже всего это
        было с датой — там placeholder невозможен в принципе, и поле стояло
        вообще без объяснения, какую дату спрашивают.
      */}
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink-800">Название</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Например: Городская олимпиада по математике"
          className={INPUT}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-800">Уровень</span>
        <select
          value={level}
          onChange={(event) => setLevel(event.target.value as AchievementLevel)}
          className={INPUT}
        >
          {LEVELS.map((item) => (
            <option key={item} value={item}>
              {LEVEL_TITLES[item][language]}
            </option>
          ))}
        </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-800">Результат</span>
        <select
          value={place}
          onChange={(event) => setPlace(event.target.value as AchievementPlace)}
          className={INPUT}
        >
          {PLACES.map((item) => (
            <option key={item} value={item}>
              {PLACE_TITLES[item][language]}
            </option>
          ))}
        </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-800">Направление</span>
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Математика, спорт, робототехника…"
            className={INPUT}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-800">Когда прошло</span>
          <input
            type="date"
            value={happenedOn}
            onChange={(event) => setHappenedOn(event.target.value)}
            className={INPUT}
          />
        </label>
      </div>

      {/*
        Организатор и ссылка на протокол нужны проверяющему, а не витрине.
        У одного названия бывают и школьный тур, и настоящий городской этап
        от управления образования — по фотографии грамоты их не различить.
      */}
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink-800">Кто проводил</span>
        <input
          value={organizer}
          onChange={(event) => setOrganizer(event.target.value)}
          placeholder="Например: Управление образования Астаны, НИШ, Дарын"
          maxLength={160}
          className={INPUT}
        />
        <span className="mt-1.5 block text-xs text-ink-400">
          По организатору школа отличит городской этап от школьного тура.
        </span>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink-800">
          Ссылка на результаты (необязательно)
        </span>
        <input
          type="url"
          value={proofUrl}
          onChange={(event) => setProofUrl(event.target.value)}
          placeholder="https://"
          maxLength={300}
          className={INPUT}
        />
        <span className="mt-1.5 block text-xs text-ink-400">
          Протокол или страница с итогами — по ней проверят быстрее всего.
        </span>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink-800">Описание</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          placeholder="Пара слов: что за конкурс, сколько было участников"
          className={`${INPUT} h-auto py-3`}
        />
      </label>

      <ProofField file={file} onChange={setFile} />

      {status === 'error' && (
        <p className="text-sm font-semibold text-danger-600">
          Проверьте название и дату — без них отправить не получится.
        </p>
      )}

      {status === 'upload-failed' && (
        <p className="text-sm font-semibold text-danger-600">
          Не удалось загрузить файл. Попробуйте другой — или отправьте без него, диплом можно
          приложить позже.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <PressButton
          onClick={submit}
          disabled={status === 'sending'}
          className="flex h-12 items-center gap-2 rounded-[var(--radius-pill)] px-6 text-sm font-medium bg-ink-900 text-white transition-colors hover:bg-ink-800 shadow-[var(--shadow-rest)] disabled:opacity-60"
            >
          {status === 'sending' ? <Spinner /> : null}
          Отправить на проверку
        </PressButton>
        <PressButton
          onClick={() => setOpen(false)}
          className="h-12 rounded-[var(--radius-control)] border border-ink-200 px-6 text-sm font-medium text-ink-700"
        >
          Отмена
        </PressButton>
      </div>
    </div>
  );
}

/** Сетка достижений с пустым состоянием. */
export function PortfolioGrid({
  items,
  language,
  onDelete,
  emptyText,
  showProof = true,
}: {
  items: PortfolioAchievement[];
  language: Language;
  onDelete?: (id: string) => void;
  emptyText: string;
  /** См. одноимённый проп `AchievementCard`: сетка только передаёт его дальше. */
  showProof?: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-ink-200 bg-white/60 px-6 py-12 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[var(--radius-control)] bg-brand-50 text-brand-500">
          <Icon name="trophy" size={26} />
        </span>
        <p className="mt-4 text-sm text-ink-500">{emptyText}</p>
      </div>
    );
  }

  return (
    /* Зазор шире прежнего: «глиняная» тень карточки крупная и на gap-4
       наползала на соседку, из-за чего ряд выглядел слипшимся. */
    <StaggerGroup className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <StaggerItem key={item.id}>
          <AchievementCard
            achievement={item}
            language={language}
            onDelete={onDelete ? () => onDelete(item.id) : undefined}
            showProof={showProof}
          />
        </StaggerItem>
      ))}
    </StaggerGroup>
  );
}

/**
 * Сумма подтверждённых баллов — она же вклад в рейтинг.
 * Обычная функция, не хук: состояния у неё нет, а имя на use- заставило бы
 * вызывающий код соблюдать правила хуков без всякой причины.
 */
export function portfolioPoints(items: PortfolioAchievement[] | null): number {
  return (items ?? [])
    .filter((item) => item.status === 'approved')
    .reduce((sum, item) => sum + item.points, 0);
}
