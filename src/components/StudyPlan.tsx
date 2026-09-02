'use client';

/**
 * Учебный план внутри кабинета.
 *
 * Раньше это была отдельная страница /plan. Она отвечала на тот же
 * вопрос, что и кабинет, — «где я и что дальше», — и разводить один
 * вопрос по двум пунктам меню значило заставлять ученика ходить между
 * ними, чтобы собрать полную картину.
 *
 * Проверки состояния (загрузка, роль, наличие профиля) здесь не
 * дублируются: кабинет делает их до того, как дойдёт до этого блока.
 * Если профиля всё же нет, компонент просто ничего не рисует.
 */

import { useEffect, useRef, useState } from 'react';
import { getSubject } from '@/data';
import { daysUntil, rankTopics, weakestSkills } from '@/lib/personalization';
import type { PlanRequest, PlanResponse } from '@/lib/ai/contracts';
import { useStore } from '@/components/StoreProvider';
import { useEffectiveProfile } from '@/lib/useEffectiveProfile';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import type { Dict } from '@/lib/i18n';
import { AiBadge } from '@/components/AiBadge';
import { Icon } from '@/components/Icon';
import {
  Alert,
  Button,
  ButtonLink,
  Kicker,
  Panel,
  ProgressBar,
  RailRow,
  Skeleton,
} from '@/components/ui';

const STATUS = {
  weak: { tone: 'danger' as const },
  'in-progress': { tone: 'accent' as const },
  mastered: { tone: 'success' as const },
  new: { tone: 'neutral' as const },
};

/** Подписи страницы на трёх языках. */
const TEXT: Dict<{
  title: string;
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
  daysLeft: (n: number) => string;
  weakSpots: string;
  weakEmpty: string;
  planError: string;
  status: Record<'weak' | 'in-progress' | 'mastered' | 'new', string>;
}> = {
  ru: {
    title: 'Мой план',
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

export function StudyPlan() {
  const { state, hydrated, cachePlan } = useStore();
  const t = TEXT[state.language];
  /*
    Не state.profile напрямую: локальная копия пуста в новом браузере, и
    вошедший ученик получал бы «профиль не создан» поверх заполненного
    профиля. Подробности — в useEffectiveProfile.
  */
  const profile = useEffectiveProfile();
  const { profile: schoolProfile } = useSchoolAuth();

  /*
    Выбранный вручную предмет. null означает «ученик ещё не выбирал» —
    тогда активным берётся первый предмет из профиля, см. subjectId ниже.
  */
  const [chosenSubjectId, setChosenSubjectId] = useState<string | null>(null);
  /*
    Загруженный план вместе с сигнатурой, для которой он получен.

    Сигнатура хранится рядом не для порядка: без неё ответ, пришедший для
    математики, продолжал бы висеть на экране после переключения на
    физику — до тех пор, пока не приедет новый. Сравнение с текущей
    сигнатурой делает такой показ невозможным по построению.
  */
  const [fetched, setFetched] = useState<{ signature: string; plan: PlanResponse } | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Номер последнего запроса. Ученик может переключить предмет, не дождавшись
   * ответа: тогда приходят два ответа, и более медленный затирал более свежий. Ответ применяется, только если его номер всё ещё последний. */
  const requestRef = useRef(0);

  /*
    Активный предмет вычисляется, а не досылается эффектом.

    Раньше первый предмет профиля подставлялся эффектом после рендера:
    первый кадр страницы рисовался вообще без предмета, и только
    следующим проходом появлялся план. Здесь нечего «досылать» — это
    ровно то же самое значение, выраженное как вычисление.
  */
  const subjectId = chosenSubjectId ?? profile?.subjectIds[0] ?? null;

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

  /*
    План из кэша — вычисление, а не результат эффекта.

    Раньше подходящий кэш всё равно проезжал через setState в эффекте:
    страница показывала пустое место, и только следующим кадром — уже
    сохранённый текст. Кэш известен во время рендера, доставать его
    оттуда незачем.
  */
  const cachedEntry = subjectId ? state.plans[subjectId] : null;
  /*
    Тип указан явно: у сохранённого плана нет поля с причиной запасного
    ответа (оно осмысленно только для свежего запроса), и без аннотации
    вывод сузил бы тип всего plan до кэша, потеряв это поле.
  */
  const cachedPlan: PlanResponse | null =
    cachedEntry && cachedEntry.signature === signature
      ? { text: cachedEntry.text, live: cachedEntry.live }
      : null;
  const plan = fetched?.signature === signature ? fetched.plan : cachedPlan;

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

      // Пока ждали ответ, ученик мог переключить предмет такой ответ устарел.
      if (requestRef.current !== requestId) return;

      setFetched({ signature, plan: data });

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
      // Сеть недоступна страница остаётся рабочей, план просто не показывается.
      setFetched({ signature, plan: { text: t.planError, live: false } });
    } finally {
      // Индикатор гасит только последний запрос, иначе он погаснет раньше времени.
      if (requestRef.current === requestId) setLoading(false);
    }
  }

  /*
    Запрос к модели — единственное, ради чего здесь остался эффект: это
    обращение к сети, то есть настоящий побочный эффект, а не вычисление.

    Объявлен ПОСЛЕ loadPlan намеренно. Объявление функции поднимается, и
    вызов сработал бы и выше, но статический анализ справедливо считает
    обращение к переменной до её объявления ошибкой — а спорить с ним
    здесь не из-за чего.

    Запрос не уходит, если план на эту же сигнатуру уже есть: либо в
    кэше, либо только что загружен. Без этой проверки каждый заход на
    страницу тратил бы квоту ключа заново.
  */
  useEffect(() => {
    if (!subject || !subjectId) return;
    if (cachedPlan) return;
    if (fetched?.signature === signature) return;
    /*
      loadPlan синхронно зажигает индикатор загрузки перед обращением к
      сети, и правило справедливо это замечает. Убрать его нельзя:
      индикатор нужен при ручном обновлении плана, когда прежний текст
      ещё на экране и по одному его наличию отличить «идёт запрос» от
      «всё готово» невозможно. Это флаг настоящей асинхронной операции,
      а не досылка вычислимого значения.
    */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPlan();
    // Намеренно следим только за сигнатурой: остальные поля состояния меняются
    // часто, а план должен пересобираться лишь при значимых изменениях.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  /* Кабинет уже показал скелетон, проверил роль и наличие профиля. */
  if (!hydrated || !profile) return null;
  if (schoolProfile && schoolProfile.role !== 'student') return null;

  if (!subject) return null;

  /* osnovnoy ekran*/

  return (
    <div>
      {/* Заголовок раздела внутри кабинета, а не страницы: сама страница
          уже представилась выше своим заголовком. */}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-2xl font-semibold text-ink-900">{t.title}</h2>
        <p className="text-sm text-ink-400">
          {subject.title}
          {daysLeft !== null && daysLeft >= 0 && ` · ${daysLeft} ${t.daysLeft(daysLeft)}`}
        </p>
      </div>

      {/*
        Переключатель предметов появляется, только если их больше одного.
        Это панель фильтра, а не содержимое: она лежит на голом фоне и отделена
        волосяной линией, чтобы не выглядеть ещё одним рядом карточек.
        Выбранный предмет помечен не только цветом, но и подчёркиванием
        и состоянием aria-pressed.
      */}
      {profile.subjectIds.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-x-6 border-b border-ink-200">
          {profile.subjectIds.map((id) => {
            const item = getSubject(id);
            if (!item) return null;
            const active = id === subjectId;
            return (
              <button
                key={id}
                onClick={() => setChosenSubjectId(id)}
                aria-pressed={active}
                className={`-mb-px flex min-h-11 items-center gap-2 border-b-2 px-1 text-sm font-semibold transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  active
                    ? 'border-brand-500 text-brand-700'
                    : 'border-transparent text-ink-500 hover:text-ink-800'
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
        <div className="mt-4">
          <Alert>
            {t.alertBefore}{' '}
            <a href={`/diagnostics/${subject.id}`} className="font-semibold underline">
              {t.alertLink}
            </a>
            {t.alertAfter}
          </Alert>
        </div>
      )}

      {/*
        Объяснение наставника главный элемент экрана, поэтому оно набрано
        заметно крупнее всего остального и лежит прямо на фоне, без рамки.
        Карточкой оно быть не может этот текст посчитан под конкретный предмет
        и конкретного ученика, перенести его на другой экран целиком нельзя.
      */}
      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Kicker>{t.mentorSays}</Kicker>
          <div className="flex items-center gap-2">
            {plan && <AiBadge live={plan.live} reason={plan.fallbackReason} />}
            <Button size="sm" variant="ghost" onClick={loadPlan} disabled={loading}>
              {t.refresh}
            </Button>
          </div>
        </div>

        {loading || !plan ? (
          <div className="mt-4 max-w-3xl space-y-3">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-11/12" />
            <Skeleton className="h-7 w-8/12" />
          </div>
        ) : (
          // whitespace-pre-line сохраняет переносы строк из ответа модели
          <p className="mt-4 max-w-3xl whitespace-pre-line text-xl leading-relaxed text-ink-800 sm:text-2xl sm:leading-[1.55]">
            {plan.text}
          </p>
        )}
      </section>

      {/*
        Список рекомендаций начинается новой областью, далеко от объяснения.
        Строки с рейкой вместо карточек цвет рейки кодирует статус темы,
        и список читается сканированием по левому краю. Подпись статуса словами
        стоит справа в шапке строки, поэтому смысл не держится на одном цвете.
      */}
      <section className="mt-16">
        <h2 className="text-lg font-bold text-ink-900">{t.recommendedTopics}</h2>
        <ul className="mt-4 space-y-2">
          {ranked.slice(0, 5).map((item) => (
            <li key={item.topic.id}>
              <RailRow tone={STATUS[item.status].tone} interactive>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="font-bold text-ink-900">{item.topic.title}</h3>
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {t.status[item.status]}
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink-500">{item.topic.summary}</p>

                <ProgressBar className="mt-4" label={t.mastered} value={item.mastery} />

                {/*
                  Время и причины идут одной строкой подробностей обычным текстом.
                  Причины важны по ним видно, что рекомендация посчитана, а не
                  выдана наугад. Отдельными плашками они превращали шапку строки
                  в гроздь ярлыков.
                */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                  <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-ink-400">
                    <Icon name="clock" size={14} className="shrink-0" />
                    <span className="tabular-nums">
                      ≈ {item.topic.estimatedMinutes} {t.minutes}
                    </span>
                    {item.reasons.length > 0 && <span>· {item.reasons.join(' · ')}</span>}
                  </p>
                  <ButtonLink href={`/learn/${item.topic.id}`} size="sm">
                    {t.study}
                  </ButtonLink>
                </div>
              </RailRow>
            </li>
          ))}
        </ul>
      </section>

      {/*
        Слабые места это плотные данные, а не самостоятельная единица панель
        без тени, строки разделены волосяными линиями.
      */}
      <section className="mt-16">
        <h2 className="text-lg font-bold text-ink-900">{t.weakSpots}</h2>
        {weak.length === 0 ? (
          <p className="mt-4 max-w-2xl text-sm text-ink-500">{t.weakEmpty}</p>
        ) : (
          <Panel className="mt-4 divide-y divide-ink-200">
            {weak.map((item) => (
              <div key={item.skill.id} className="p-4">
                <ProgressBar label={item.skill.title} value={item.mastery} />
              </div>
            ))}
          </Panel>
        )}
      </section>
    </div>
  );
}
