'use client';

/**
 * Персональный план — витрина персонализации.
 *
 * На экране два источника: слева объяснение от языковой модели, справа —
 * сами рекомендации, посчитанные движком. Порядок именно такой, потому что
 * модель объясняет ровно те цифры, которые ученик видит рядом. Если бы модель
 * считала сама, текст и список могли бы разойтись.
 */

import { useEffect, useState } from 'react';
import { getSubject } from '@/data';
import { daysUntil, rankTopics, weakestSkills } from '@/lib/personalization';
import type { PlanRequest, PlanResponse } from '@/lib/ai/contracts';
import { useStore } from '@/components/StoreProvider';
import { AiBadge } from '@/components/AiBadge';
import { Alert, Badge, Button, ButtonLink, Card, EmptyState, ProgressBar, Skeleton } from '@/components/ui';

/** Подписи и цвета для статуса темы. */
const STATUS = {
  weak: { label: 'Слабое место', tone: 'danger' as const },
  'in-progress': { label: 'В работе', tone: 'accent' as const },
  mastered: { label: 'Освоено', tone: 'success' as const },
  new: { label: 'Новая тема', tone: 'neutral' as const },
};

export default function PlanPage() {
  const { state, hydrated, cachePlan } = useStore();
  const profile = state.profile;

  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Первый выбранный предмет становится активным, как только загрузился профиль.
  useEffect(() => {
    if (profile && subjectId === null) setSubjectId(profile.subjectIds[0] ?? null);
  }, [profile, subjectId]);

  const subject = getSubject(subjectId);
  const ranked = subject ? rankTopics(subject, state, state.customTopics) : [];
  const weak = subject ? weakestSkills(subject, state) : [];
  const diagnostic = subjectId ? (state.diagnostics[subjectId] ?? null) : null;
  const daysLeft = daysUntil(profile?.targetDate);

  /**
   * Сигнатура состояния: пока она не изменилась, повторный запрос к модели
   * не нужен. Без этого план перезапрашивался бы при каждом заходе на страницу
   * и быстро выжег бы бесплатную квоту.
   */
  const signature = `${subjectId}|${state.attempts.length}|${ranked.slice(0, 3).map((r) => r.topic.id).join(',')}`;

  useEffect(() => {
    if (!subject || !subjectId) return;

    const cached = state.plans[subjectId];
    if (cached && cached.signature === signature) {
      setPlan({ text: cached.text, live: cached.live });
      return;
    }

    loadPlan();
    // Намеренно следим только за сигнатурой: остальные поля состояния меняются
    // часто, а план должен пересобираться лишь при значимых изменениях.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  async function loadPlan() {
    if (!subject || !subjectId) return;

    setLoading(true);
    const body: PlanRequest = {
      subjectId,
      profile,
      diagnostic,
      ranked: ranked.slice(0, 3).map((item) => ({
        topicId: item.topic.id,
        mastery: item.mastery,
        reasons: item.reasons,
      })),
      weakSkills: weak.map((item) => ({
        skillId: item.skill.id,
        title: item.skill.title,
        mastery: item.mastery,
      })),
      daysLeft,
    };

    try {
      const response = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data: PlanResponse = await response.json();

      setPlan(data);

      // Кэшируем только живой ответ. Иначе разовый сбой модели «прилипал» бы
      // к ученику: запасной текст сохранился бы под текущей сигнатурой, и план
      // не обновился бы даже после восстановления связи.
      if (data.live) {
        cachePlan({
          subjectId,
          text: data.text,
          live: data.live,
          generatedAt: new Date().toISOString(),
          signature,
        });
      }
    } catch {
      // Сеть недоступна — страница остаётся рабочей, план просто не показывается.
      setPlan({ text: 'Не удалось получить объяснение. Рекомендации ниже посчитаны без интернета.', live: false });
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- Состояния до основного экрана ---------------- */

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          icon="🧭"
          title="Сначала нужен профиль"
          description="Укажите класс, предметы и цель — без этого план построить не из чего."
          action={<ButtonLink href="/onboarding">Создать профиль</ButtonLink>}
        />
      </div>
    );
  }

  if (!subject) return null;

  /* ---------------- Основной экран ---------------- */

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">Мой план</h1>
      <p className="mt-2 text-ink-500">Темы отобраны под твой уровень, класс и цель.</p>

      {/* Переключатель предметов появляется, только если их больше одного */}
      {profile.subjectIds.length > 1 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {profile.subjectIds.map((id) => {
            const item = getSubject(id);
            if (!item) return null;
            return (
              <button
                key={id}
                onClick={() => setSubjectId(id)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                  id === subjectId
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300'
                }`}
              >
                <span aria-hidden>{item.icon}</span> {item.title}
              </button>
            );
          })}
        </div>
      )}

      {!diagnostic && (
        <div className="mt-5">
          <Alert>
            Диагностика по предмету ещё не пройдена — план построен по классу и цели.{' '}
            <a href={`/diagnostics/${subject.id}`} className="font-semibold underline">
              Пройти диагностику
            </a>
            , чтобы он стал точнее.
          </Alert>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Левая колонка: объяснение и темы */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-ink-900">Что говорит наставник</h2>
              <div className="flex items-center gap-2">
                {plan && <AiBadge live={plan.live} reason={plan.fallbackReason} />}
                <Button size="sm" variant="ghost" onClick={loadPlan} disabled={loading}>
                  Обновить
                </Button>
              </div>
            </div>

            {loading || !plan ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-9/12" />
              </div>
            ) : (
              // whitespace-pre-line сохраняет переносы строк из ответа модели
              <p className="mt-4 whitespace-pre-line leading-relaxed text-ink-700">{plan.text}</p>
            )}
          </Card>

          <div>
            <h2 className="mb-3 text-lg font-bold text-ink-900">Рекомендованные темы</h2>
            <ul className="space-y-3">
              {ranked.slice(0, 5).map((item) => (
                <Card as="li" key={item.topic.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-bold text-ink-900">{item.topic.title}</h3>
                    <Badge tone={STATUS[item.status].tone}>{STATUS[item.status].label}</Badge>
                  </div>
                  <p className="mt-1.5 text-sm text-ink-500">{item.topic.summary}</p>

                  <ProgressBar className="mt-4" label="Освоено" value={item.mastery} />

                  {/* Причины — самое ценное для защиты: видно, что рекомендация
                      не случайная, а посчитанная */}
                  <ul className="mt-3 space-y-1">
                    {item.reasons.map((reason) => (
                      <li key={reason} className="text-xs text-ink-400">
                        — {reason}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-xs text-ink-400">≈ {item.topic.estimatedMinutes} мин</span>
                    <ButtonLink href={`/learn/${item.topic.id}`} size="sm">
                      Изучать
                    </ButtonLink>
                  </div>
                </Card>
              ))}
            </ul>
          </div>
        </div>

        {/* Правая колонка: слабые места и цель */}
        <div className="space-y-4">
          {daysLeft !== null && daysLeft >= 0 && (
            <Card>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">До цели</h2>
              <p className="mt-2 text-4xl font-black text-ink-900">{daysLeft}</p>
              <p className="text-sm text-ink-500">дней осталось</p>
            </Card>
          )}

          <Card>
            <h2 className="text-lg font-bold text-ink-900">Слабые места</h2>
            {weak.length === 0 ? (
              <p className="mt-3 text-sm text-ink-500">
                Пока данных мало. Пройди диагностику или реши несколько заданий — здесь появятся
                навыки, которые стоит подтянуть.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {weak.map((item) => (
                  <ProgressBar key={item.skill.id} label={item.skill.title} value={item.mastery} />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
