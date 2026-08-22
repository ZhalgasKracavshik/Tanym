'use client';

/**
 * Портфолио достижений ученика.
 *
 * Показывает подтверждённые достижения и — владельцу — его собственные
 * заявки в любом статусе, включая отклонённые. Скрывать отказ нельзя:
 * ученик должен понимать, почему баллы не начислились.
 */

import { useEffect, useState } from 'react';
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
import { Icon } from './Icon';
import { PressButton, Spinner, StaggerGroup, StaggerItem } from './motion';

interface Row {
  id: string;
  student_id: string;
  title: string;
  description: string;
  category: string;
  level: AchievementLevel;
  place: AchievementPlace;
  happened_on: string;
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
   * портфолио это нормально — владелец смотрит на свой документ. Если такая
   * же сетка когда-нибудь появится в общешкольной ленте или в чужом
   * профиле, сюда передаётся `false`: карточка уйдёт на заливку, а сам
   * документ останется доступен по ссылке «Диплом» — то есть по осознанному
   * действию, а не в превью для всех подряд.
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
  ]
    .filter(Boolean)
    .join(' · ');

  const hasActions = Boolean(proofUrl || onDelete);

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
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  async function submit() {
    if (!title.trim() || !happenedOn) {
      setStatus('error');
      return;
    }
    setStatus('sending');

    const supabase = createClient();
    let proofPath: string | null = null;

    if (file) {
      const path = `${studentId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('achievement-proofs').upload(path, file);
      if (uploadError) {
        setStatus('error');
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
          className="flex h-12 items-center gap-2 rounded-[var(--radius-control)] px-6 text-sm font-bold text-white shadow-[var(--shadow-glow)]"
          style={{ background: 'var(--gradient-brand)' }}
        >
          <Icon name="plus" size={17} />
          Добавить достижение
        </PressButton>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-[var(--radius-card)] border border-ink-200 bg-white p-6 shadow-[var(--shadow-rest)]">
      <h3 className="font-bold text-ink-900">Новое достижение</h3>

      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Например: Городская олимпиада по математике"
        className={INPUT}
      />

      <div className="grid gap-3 sm:grid-cols-2">
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
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="Направление: математика, спорт…"
          className={INPUT}
        />
        <input
          type="date"
          value={happenedOn}
          onChange={(event) => setHappenedOn(event.target.value)}
          className={INPUT}
        />
      </div>

      <textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        rows={2}
        placeholder="Пара слов: что за конкурс, сколько было участников"
        className={`${INPUT} h-auto py-3`}
      />

      <div>
        <label className="text-sm font-semibold text-ink-700" htmlFor="proof">
          Диплом или грамота (фото либо PDF)
        </label>
        <input
          id="proof"
          type="file"
          accept="image/*,application/pdf"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="mt-2 block text-sm text-ink-600"
        />
        <p className="mt-1 text-xs text-ink-400">
          Без подтверждения заявку скорее всего отклонят.
        </p>
      </div>

      {status === 'error' && (
        <p className="text-sm font-semibold text-danger-600">
          Проверьте название и дату — без них отправить не получится.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <PressButton
          onClick={submit}
          disabled={status === 'sending'}
          className="flex h-12 items-center gap-2 rounded-[var(--radius-control)] px-6 text-sm font-bold text-white shadow-[var(--shadow-glow)] disabled:opacity-60"
          style={{ background: 'var(--gradient-brand)' }}
        >
          {status === 'sending' ? <Spinner /> : null}
          Отправить на проверку
        </PressButton>
        <PressButton
          onClick={() => setOpen(false)}
          className="h-12 rounded-[var(--radius-control)] border border-ink-200 px-6 text-sm font-bold text-ink-700"
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
    <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
