'use client';

/**
 * Персональный план — витрина персонализации.
 *
 * На экране два источника: слева объяснение от языковой модели, справа —
 * сами рекомендации, посчитанные движком. Порядок именно такой, потому что
 * модель объясняет ровно те цифры, которые ученик видит рядом. Если бы модель
 * считала сама, текст и список могли бы разойтись.
 */

import { useEffect, useRef, useState } from 'react';
import { getSubject } from '@/data';
import { daysUntil, rankTopics, weakestSkills } from '@/lib/personalization';
import type { PlanRequest, PlanResponse } from '@/lib/ai/contracts';
import { useStore } from '@/components/StoreProvider';
import type { Dict } from '@/lib/i18n';
import { AiBadge } from '@/components/AiBadge';
import { Icon } from '@/components/Icon';
import { Alert, Badge, Button, ButtonLink, Card, EmptyState, ProgressBar, Skeleton } from '@/components/ui';

/** Цвета для статуса темы. Подписи — в TEXT, потому что зависят от языка. */
const STATUS = {
  weak: { tone: 'danger' as const },
  'in-progress': { tone: 'accent' as const },
  mastered: { tone: 'success' as const },
  new: { tone: 'neutral' as const },
};

/** Подписи страницы на трёх языках. Ключи одинаковые — за этим следит TypeScript. */
const TEXT: Dict<{
  title: string;
  subtitle: string;
  noProfileTitle: string;
  noProfileText: string;
  createProfile: string;
  alertBefore: string;
  alertLink: string;
  alertAfter: string;
  mentorSays: string;
  refresh: string;
  recommendedTopics: string;
  mastered: string;
  minutes: string;
  study: string;
  untilGoal: string;
  daysLeft: (n: number) => string;
  weakSpots: string;
  weakEmpty: string;
  planError: string;
  status: Record<'weak' | 'in-progress' | 'mastered' | 'new', string>;
}> = {
  ru: {
    title: 'Мой план',
    subtitle: 'Темы отобраны под твой уровень, класс и цель.',
    noProfileTitle: 'Сначала нужен профиль',
    noProfileText: 'Укажите класс, предметы и цель: без этого план построить не из чего.',
    createProfile: 'Создать профиль',
    alertBefore: 'Диагностика по предмету ещё не пройдена, поэтому план построен по классу и цели.',
    alertLink: 'Пройти диагностику',
    alertAfter: ', чтобы он стал точнее.',
    mentorSays: 'Что говорит наставник',
    refresh: 'Обновить',
    recommendedTopics: 'Рекомендованные темы',
    mastered: 'Освоено',
    minutes: 'мин',
    study: 'Изучать',
    untilGoal: 'До цели',
    daysLeft: (n: number) => {
      const last = n % 10;
      const teen = n % 100 >= 11 && n % 100 <= 14;
      if (!teen && last === 1) return 'день остался';
      if (!teen && last >= 2 && last <= 4) return 'дня осталось';
      return 'дней осталось';
    },
    weakSpots: 'Слабые места',
    weakEmpty:
      'Пока данных мало. Пройди диагностику или реши несколько заданий, и здесь появятся навыки, которые стоит подтянуть.',
    planError: 'Не удалось получить объяснение. Рекомендации ниже посчитаны без интернета.',
    status: {
      weak: 'Слабое место',
      'in-progress': 'В работе',
      mastered: 'Освоено',
      new: 'Новая тема',
    },
  },
  kk: {
    title: 'Жоспарым',
    subtitle: 'Тақырыптар сенің деңгейіңе, сыныбыңа және мақсатыңа қарай таңдалды.',
    noProfileTitle: 'Алдымен профиль қажет',
    noProfileText: 'Сыныбыңды, пәндерді және мақсатыңды көрсет, онсыз жоспар құруға негіз жоқ.',
    createProfile: 'Профиль құру',
    alertBefore: 'Пән бойынша диагностика әлі өтілмеген, сондықтан жоспар сынып пен мақсат бойынша құрылды.',
    alertLink: 'Диагностикадан өту',
    alertAfter: ', сонда ол дәлірек болады.',
    mentorSays: 'Тәлімгер не дейді',
    refresh: 'Жаңарту',
    recommendedTopics: 'Ұсынылған тақырыптар',
    mastered: 'Меңгерілді',
    minutes: 'мин',
    study: 'Оқу',
    untilGoal: 'Мақсатқа дейін',
    daysLeft: () => 'күн қалды',
    weakSpots: 'Әлсіз тұстар',
    weakEmpty:
      'Әзірге дерек аз. Диагностикадан өт немесе бірнеше тапсырма шеш, сонда пысықтауға тұрарлық дағдылар осында шығады.',
    planError: 'Түсіндірмені алу мүмкін болмады. Төмендегі ұсыныстар интернетсіз есептелген.',
    status: {
      weak: 'Әлсіз тұс',
      'in-progress': 'Оқылуда',
      mastered: 'Меңгерілді',
      new: 'Жаңа тақырып',
    },
  },
  en: {
    title: 'My plan',
    subtitle: 'Topics picked for your level, grade and goal.',
    noProfileTitle: 'A profile is needed first',
    noProfileText: 'Set your grade, subjects and goal: without them there is nothing to build a plan from.',
    createProfile: 'Create profile',
    alertBefore: 'The subject diagnostic has not been taken yet, so the plan is based on your grade and goal.',
    alertLink: 'Take the diagnostic',
    alertAfter: ' to make it more accurate.',
    mentorSays: 'What your mentor says',
    refresh: 'Refresh',
    recommendedTopics: 'Recommended topics',
    mastered: 'Mastered',
    minutes: 'min',
    study: 'Learn',
    untilGoal: 'Until your goal',
    daysLeft: (n: number) => (n === 1 ? 'day left' : 'days left'),
    weakSpots: 'Weak spots',
    weakEmpty:
      'Not enough data yet. Take the diagnostic or solve a few tasks, and the skills worth working on will show up here.',
    planError: 'Could not load the explanation. The recommendations below were calculated offline.',
    status: {
      weak: 'Weak spot',
      'in-progress': 'In progress',
      mastered: 'Mastered',
      new: 'New topic',
    },
  },
};

export default function PlanPage() {
  const { state, hydrated, cachePlan } = useStore();
  const t = TEXT[state.language];
  const profile = state.profile;

  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Номер последнего запроса. Ученик может переключить предмет, не дождавшись
   * ответа: тогда приходят два ответа, и более медленный (по старому предмету)
   * затирал более свежий. Ответ применяется, только если его номер всё ещё
   * последний.
   */
  const requestRef = useRef(0);

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
   *
   * Язык входит в сигнатуру обязательно: без него после переключения на казахский
   * страница переводилась, а объяснение наставника молча оставалось русским.
   */
  const signature = `${subjectId}|${state.language}|${state.attempts.length}|${ranked
    .slice(0, 3)
    .map((r) => r.topic.id)
    .join(',')}`;

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

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const requestedSubjectId = subjectId;

    setLoading(true);
    const body: PlanRequest = {
      subjectId,
      language: state.language,
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
      // Роуты отвечают {error} с кодом 4xx (например, при срабатывании
      // ограничителя частоты). Без этой проверки такой ответ разбирался бы как
      // обычный результат: поля пришли бы пустыми, и в прогресс ученика ушла бы
      // ложная неверная попытка по заданию, которое сервер даже не проверял.
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data: PlanResponse = await response.json();

      // Пока ждали ответ, ученик мог переключить предмет — такой ответ устарел.
      if (requestRef.current !== requestId) return;

      setPlan(data);

      // Кэшируем только живой ответ. Иначе разовый сбой модели «прилипал» бы
      // к ученику: запасной текст сохранился бы под текущей сигнатурой, и план
      // не обновился бы даже после восстановления связи.
      if (data.live) {
        cachePlan({
          subjectId: requestedSubjectId,
          text: data.text,
          live: data.live,
          generatedAt: new Date().toISOString(),
          signature,
        });
      }
    } catch {
      if (requestRef.current !== requestId) return;
      // Сеть недоступна — страница остаётся рабочей, план просто не показывается.
      setPlan({ text: t.planError, live: false });
    } finally {
      // Индикатор гасит только последний запрос, иначе он погаснет раньше времени.
      if (requestRef.current === requestId) setLoading(false);
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
        {/* Иконка вынесена наружу: проп icon у EmptyState принимает строку,
            а рисованные иконки набора приходят готовым элементом. */}
        <div className="mb-3 flex justify-center text-ink-300">
          <Icon name="compass" size={40} />
        </div>
        <EmptyState
          title={t.noProfileTitle}
          description={t.noProfileText}
          action={<ButtonLink href="/onboarding">{t.createProfile}</ButtonLink>}
        />
      </div>
    );
  }

  if (!subject) return null;

  /* ---------------- Основной экран ---------------- */

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">{t.title}</h1>
      <p className="mt-2 text-ink-500">{t.subtitle}</p>

      {/* Переключатель предметов появляется, только если их больше одного */}
      {profile.subjectIds.length > 1 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {profile.subjectIds.map((id) => {
            const item = getSubject(id);
            if (!item) return null;
            return (
              <button
                key={id}
                onClick={() => setSubjectId(id)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  id === subjectId
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]'
                }`}
              >
                <Icon name={item.icon} size={18} />
                {item.title}
              </button>
            );
          })}
        </div>
      )}

      {!diagnostic && (
        <div className="mt-6">
          <Alert>
            {t.alertBefore}{' '}
            <a href={`/diagnostics/${subject.id}`} className="font-semibold underline">
              {t.alertLink}
            </a>
            {t.alertAfter}
          </Alert>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Левая колонка: объяснение и темы */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-ink-900">{t.mentorSays}</h2>
              <div className="flex items-center gap-2">
                {plan && <AiBadge live={plan.live} reason={plan.fallbackReason} />}
                <Button size="sm" variant="ghost" onClick={loadPlan} disabled={loading}>
                  {t.refresh}
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
            <h2 className="mb-3 text-lg font-bold text-ink-900">{t.recommendedTopics}</h2>
            <ul className="space-y-3">
              {ranked.slice(0, 5).map((item) => (
                <Card
                  as="li"
                  key={item.topic.id}
                  className="transition-all duration-150 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-bold text-ink-900">{item.topic.title}</h3>
                    <Badge tone={STATUS[item.status].tone}>{t.status[item.status]}</Badge>
                  </div>
                  <p className="mt-1.5 text-sm text-ink-500">{item.topic.summary}</p>

                  <ProgressBar className="mt-4" label={t.mastered} value={item.mastery} />

                  {/* Причины — самое ценное для защиты: видно, что рекомендация
                      не случайная, а посчитанная */}
                  <ul className="mt-3 space-y-1">
                    {item.reasons.map((reason) => (
                      <li key={reason} className="flex items-start gap-2 text-xs text-ink-400">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-300" aria-hidden />
                        {reason}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-xs text-ink-400">
                      <Icon name="clock" size={14} />
                      <span className="tabular-nums">
                        ≈ {item.topic.estimatedMinutes} {t.minutes}
                      </span>
                    </span>
                    <ButtonLink href={`/learn/${item.topic.id}`} size="sm">
                      {t.study}
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
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">{t.untilGoal}</h2>
              <p className="mt-2 text-4xl font-black tabular-nums text-ink-900">{daysLeft}</p>
              <p className="text-sm text-ink-500">{t.daysLeft(daysLeft)}</p>
            </Card>
          )}

          <Card>
            <h2 className="text-lg font-bold text-ink-900">{t.weakSpots}</h2>
            {weak.length === 0 ? (
              <p className="mt-3 text-sm text-ink-500">{t.weakEmpty}</p>
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
