'use client';

/**
 * Страница одного достижения портфолио.
 *
 * У достижения не было отдельного адреса: строку в ленте активности всегда
 * вело на /profile — свою собственную страницу, а не на достижение того,
 * кто его опубликовал. Клик по чужому достижению открывал профиль
 * кликнувшего, что бессмысленно. Заодно это был единственный экран, где
 * администратор видел диплом целиком, а не превью-ссылкой в тесной строке
 * очереди модерации — здесь же он и решает, начислять баллы или нет.
 *
 * RLS отдаёт строку одобренным всем, автору — свою в любом статусе,
 * администратору — любую вообще. Если запрос вернул строку, значит
 * смотреть на неё уже можно; отдельная проверка прав в коде не нужна.
 */

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LEVEL_TITLES,
  PLACE_TITLES,
  achievementPoints,
  placeTone,
  type AchievementLevel,
  type AchievementPlace,
  type AchievementStatus,
} from '@/lib/portfolio';
import { useStore } from '@/components/StoreProvider';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { createClient } from '@/lib/supabase/client';
import { avatarPhotoUrl } from '@/lib/supabase/avatarPhoto';
import { AchievementCard, ACHIEVEMENT_ACTION_CLASS, type AchievementCardTone } from '@/components/AchievementCard';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { Button, EmptyState, Skeleton } from '@/components/ui';

/** Тот же выбор заливки без фото, что и в портфолио: место определяет тон. */
const PLACE_FILL: Record<ReturnType<typeof placeTone>, AchievementCardTone> = {
  gold: 'accent',
  silver: 'ink',
  bronze: 'brand',
  neutral: 'ink',
};

/** Скан PDF нельзя положить фоном карточки — только открыть ссылкой. */
function isImageProof(url: string): boolean {
  return !/\.pdf(\?|#|$)/i.test(url);
}

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
}

interface StudentInfo {
  name: string;
  avatarColor: string | null;
  avatarPhoto: string | null;
}

export default function AchievementPage({ params }: PageProps<'/achievements/[id]'>) {
  const { id } = use(params);
  const { state } = useStore();
  const { profile } = useSchoolAuth();
  const lang = state.language;

  const [row, setRow] = useState<Row | null | undefined>(undefined);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deciding, setDeciding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase
      .from('portfolio_achievements')
      .select('id, student_id, title, description, category, level, place, happened_on, proof_path, status, points')
      .eq('id', id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (cancelled) return;
        const found = (data as Row | null) ?? null;
        setRow(found);
        if (!found) return;

        const { data: person } = await supabase
          .from('profiles')
          .select('name, avatar_color, avatar_photo_path')
          .eq('id', found.student_id)
          .maybeSingle();
        if (cancelled) return;
        setStudent({
          name: person?.name ?? 'Ученик',
          avatarColor: (person?.avatar_color as string | null) ?? null,
          avatarPhoto: avatarPhotoUrl((person?.avatar_photo_path as string | null) ?? null),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [id, refreshKey]);

  if (row === undefined) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="aspect-[4/5] w-full max-w-sm" />
      </div>
    );
  }

  if (row === null) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <EmptyState
          icon="medal"
          title="Достижение не найдено"
          description="Его могли удалить, ссылка устарела, или у вас нет доступа — заявки на проверке видны только автору и администрации."
          action={
            <Link href="/achievements" className="text-sm font-semibold text-brand-600 hover:underline">
              К достижениям школы
            </Link>
          }
        />
      </div>
    );
  }

  const proofUrl = row.proof_path
    ? createClient().storage.from('achievement-proofs').getPublicUrl(row.proof_path).data.publicUrl
    : null;
  const isAdmin = profile?.role === 'admin';
  const isPending = row.status === 'pending';
  const willGivePoints = achievementPoints(row.level, row.place);

  async function decide(decision: 'approved' | 'rejected') {
    setDeciding(true);
    await createClient()
      .from('portfolio_achievements')
      .update({
        status: decision,
        points: decision === 'approved' ? willGivePoints : 0,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);
    setDeciding(false);
    setRefreshKey((key) => key + 1);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href="/achievements"
        className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-ink-500 outline-none transition-colors duration-150 hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <Icon name="arrow-left" size={16} />
        Назад к достижениям
      </Link>

      {student && (
        <div className="mt-6 flex items-center gap-3">
          <Avatar name={student.name} colorId={student.avatarColor} photoUrl={student.avatarPhoto} size={40} />
          <p className="font-semibold text-ink-900">{student.name}</p>
        </div>
      )}

      <div className="mt-4 w-full max-w-sm">
        <AchievementCard
          title={row.title}
          subtitle={`${PLACE_TITLES[row.place][lang]} · ${LEVEL_TITLES[row.level][lang]}`}
          date={row.happened_on}
          language={lang}
          photoUrl={proofUrl && isImageProof(proofUrl) ? proofUrl : null}
          tone={PLACE_FILL[placeTone(row.place)]}
          status={row.status}
          points={row.points}
        />
      </div>

      {row.description && (
        <p className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-ink-700">{row.description}</p>
      )}

      {proofUrl && !isImageProof(proofUrl) && (
        <a
          href={proofUrl}
          target="_blank"
          rel="noreferrer"
          className={`mt-4 inline-block ${ACHIEVEMENT_ACTION_CLASS}`}
        >
          Открыть диплом (PDF)
        </a>
      )}

      {!proofUrl && (
        <p className="mt-4 text-sm text-ink-400">Без подтверждения — диплом или грамота не приложены.</p>
      )}

      {/*
        Решение принимается здесь, глядя на диплом целиком, а не по ссылке
        «Диплом» в тесной строке очереди — ради этого страница и заведена.
      */}
      {isAdmin && isPending && (
        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-ink-200 pt-6">
          <p className="text-sm font-semibold text-ink-800">Начислит {willGivePoints} баллов при подтверждении</p>
          <div className="flex gap-3">
            <Button size="sm" onClick={() => decide('approved')} disabled={deciding}>
              <Icon name="check" size={14} />
              Подтвердить
            </Button>
            <Button size="sm" variant="ghost" onClick={() => decide('rejected')} disabled={deciding}>
              Отклонить
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
