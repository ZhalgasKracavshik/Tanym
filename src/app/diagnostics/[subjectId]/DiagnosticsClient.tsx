'use client';

/**
 * Диагностика уровня: 8 заданий, по одному на экране.
 *
 * Важное решение: во время теста НЕ показываем, верно ли ответил ученик.
 * Иначе это уже не измерение уровня, а обучение: увидев «неверно», человек
 * меняет стратегию ответов, и оценка перестаёт отражать реальные знания.
 * Результат целиком показывается в конце.
 */

import { useState } from 'react';
import Link from 'next/link';
import { getSkillTitle, getSubject } from '@/data';
import { checkAnswer } from '@/lib/grading';
import { scoreDiagnostic } from '@/lib/personalization';
import type { DiagnosticAnswer, DiagnosticResult, Task } from '@/lib/types';
import { useStore } from '@/components/StoreProvider';
import type { Dict } from '@/lib/i18n';
import { Badge, Button, ButtonLink, EmptyState, Kicker, ProgressBar } from '@/components/ui';
import { Scratchpad } from '@/components/Scratchpad';
import { Icon } from '@/components/Icon';
import { MathText } from '@/components/MathText';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { StudentOnlyNotice } from '@/components/StudentOnlyNotice';

/** Подписи страницы на трёх языках. Ключи одинаковые — за этим следит TypeScript. */
const TEXT: Dict<{
  notFoundTitle: string;
  notFoundText: string;
  toSubjects: string;
  title: string;
  introText: (count: number) => string;
  start: string;
  question: (index: number, total: number) => string;
  numericPlaceholder: string;
  finish: string;
  answer: string;
  levelBeginner: string;
  levelIntermediate: string;
  levelAdvanced: string;
  done: string;
  levelLabel: string;
  correctOf: (correct: number, total: number) => string;
  skillMap: string;
  skillMapHint: string;
  toPlan: string;
  toDashboard: string;
}> = {
  ru: {
    notFoundTitle: 'Предмет не найден',
    notFoundText: 'Возможно, ссылка устарела. Выберите предмет заново.',
    toSubjects: 'К выбору предметов',
    title: 'Диагностика',
    introText: (count) =>
      `${count} заданий, примерно 7 минут. Отвечай честно: по результатам построится твой персональный план. Ошибиться не страшно, это не оценка, а замер.`,
    start: 'Начать диагностику',
    question: (index, total) => `Вопрос ${index} из ${total}`,
    numericPlaceholder: 'Введите ответ числом',
    finish: 'Завершить',
    answer: 'Ответить',
    levelBeginner: 'Начальный',
    levelIntermediate: 'Средний',
    levelAdvanced: 'Продвинутый',
    done: 'Диагностика пройдена',
    levelLabel: 'Уровень:',
    correctOf: (correct, total) => `верно ${correct} из ${total}`,
    skillMap: 'Карта навыков',
    skillMapHint: 'Именно по этим цифрам система дальше подбирает темы и сложность заданий.',
    toPlan: 'Смотреть мой план',
    toDashboard: 'Перейти в кабинет',
  },
  kk: {
    notFoundTitle: 'Пән табылмады',
    notFoundText: 'Сілтеме ескірген болуы мүмкін. Пәнді қайта таңдаңыз.',
    toSubjects: 'Пәндерді таңдауға',
    title: 'Диагностика',
    introText: (count) =>
      `${count} тапсырма, шамамен 7 минут. Шыныңды жаз: нәтиже бойынша жеке жоспарың құрылады. Қателессең де ештеңе етпейді, бұл баға емес, өлшем.`,
    start: 'Диагностиканы бастау',
    question: (index, total) => `${index}-сұрақ, барлығы ${total}`,
    numericPlaceholder: 'Жауапты санмен жаз',
    finish: 'Аяқтау',
    answer: 'Жауап беру',
    levelBeginner: 'Бастапқы',
    levelIntermediate: 'Орта',
    levelAdvanced: 'Жоғары',
    done: 'Диагностика аяқталды',
    levelLabel: 'Деңгей:',
    correctOf: (correct, total) => `${total} сұрақтан ${correct} дұрыс`,
    skillMap: 'Дағдылар картасы',
    skillMapHint: 'Жүйе келесі тақырыптар мен тапсырма деңгейін дәл осы көрсеткіштерге қарап таңдайды.',
    toPlan: 'Жоспарымды көру',
    toDashboard: 'Кабинетке өту',
  },
  en: {
    notFoundTitle: 'Subject not found',
    notFoundText: 'The link may be out of date. Pick a subject again.',
    toSubjects: 'Choose a subject',
    title: 'Diagnostic',
    introText: (count) =>
      `${count} questions, about 7 minutes. Answer honestly: your personal plan is built from the result. Mistakes are fine, this is a measurement, not a grade.`,
    start: 'Start the diagnostic',
    question: (index, total) => `Question ${index} of ${total}`,
    numericPlaceholder: 'Enter your answer as a number',
    finish: 'Finish',
    answer: 'Answer',
    levelBeginner: 'Beginner',
    levelIntermediate: 'Intermediate',
    levelAdvanced: 'Advanced',
    done: 'Diagnostic complete',
    levelLabel: 'Level:',
    correctOf: (correct, total) => `${correct} of ${total} correct`,
    skillMap: 'Skill map',
    skillMapHint: 'These numbers are what the system uses to pick your next topics and task difficulty.',
    toPlan: 'View my plan',
    toDashboard: 'Go to dashboard',
  },
};

export function DiagnosticsClient({ subjectId }: { subjectId: string }) {
  const { profile: schoolProfile } = useSchoolAuth();
  const { state, saveDiagnostic } = useStore();
  const t = TEXT[state.language];
  const subject = getSubject(subjectId);

  // 'intro' — экран перед началом, число — номер вопроса, 'result' — итог.
  const [stage, setStage] = useState<'intro' | 'quiz' | 'result'>('intro');
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState('');
  const [answers, setAnswers] = useState<{ task: Task; answer: string; correct: boolean }[]>([]);
  const [result, setResult] = useState<DiagnosticResult | null>(null);


  /*
    Учителю и администратору задания ученика не нужны: попытки пишутся на
    его имя и попадают в его же прогресс. Кабинет и наставник уже
    закрыты так же — раздел должен вести себя одинаково во всех своих
    страницах, иначе закрытость выглядит случайной.
  */
  if (schoolProfile && schoolProfile.role !== 'student') {
    return <StudentOnlyNotice role={schoolProfile.role} />;
  }

  if (!subject) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[var(--radius-card)] bg-ink-100 text-ink-400">
          <Icon name="compass" size={28} />
        </div>
        <div className="mt-4">
          <EmptyState
           
            title={t.notFoundTitle}
            description={t.notFoundText}
            action={<ButtonLink href="/onboarding">{t.toSubjects}</ButtonLink>}
          />
        </div>
      </div>
    );
  }

  const questions = subject.diagnostic;
  const task = questions[current];

  /** Сохраняет ответ на текущий вопрос и переходит дальше или к результату. */
  function submit() {
    if (!task) return;

    const correct = checkAnswer(task, answer);
    const updated = [...answers, { task, answer, correct }];

    setAnswers(updated);
    setAnswer('');

    if (current + 1 < questions.length) {
      setCurrent(current + 1);
      return;
    }

    /*
      Вопросы закончились. Итог считаем локально, чтобы показать результат
      сразу, и параллельно отправляем ответы на сервер — там он
      пересчитывается заново и сохраняется.

      Почему и то, и другое. Локальный расчёт нужен ради мгновенного
      экрана результата: ждать сеть после семи минут работы неприятно.
      Серверный — потому что диагностика задаёт стартовую сложность, и
      верить браузеру в этом нельзя, а ещё потому, что иначе результат
      исчезает при входе с другого устройства.
    */
    const scored = scoreDiagnostic(subject!, updated);
    const diagnosticResult: DiagnosticResult = {
      subjectId: subject!.id,
      answers: updated.map(
        (item): DiagnosticAnswer => ({
          taskId: item.task.id,
          skillId: item.task.skillId,
          difficulty: item.task.difficulty,
          correct: item.correct,
          answer: item.answer,
        }),
      ),
      skillMastery: scored.skillMastery,
      score: scored.score,
      level: scored.level,
      startingDifficulty: scored.startingDifficulty,
      completedAt: new Date().toISOString(),
    };

    saveDiagnostic(diagnosticResult);
    setResult(diagnosticResult);
    setStage('result');

    /*
      Отправка не блокирует показ результата и не роняет экран при
      отсутствии сети: ученик уже увидел свой уровень, а несохранённая
      строка — меньшая беда, чем ошибка вместо результата.
    */
    void fetch('/api/diagnostics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subjectId: subject!.id,
        answers: updated.map((item) => ({ taskId: item.task.id, answer: item.answer })),
      }),
    }).catch(() => {});
  }

  /* ---------------- Экран 1: вступление ---------------- */

  if (stage === 'intro') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {/*
          Вступление открывается контекстной строкой: сначала предмет плашкой,
          под ним название экрана. Раньше здесь стоял тот же одинаковый заголовок
          с серым подзаголовком, что и на остальных страницах, и по первому экрану
          нельзя было понять, куда именно попал ученик.

          Карточки тут нет намеренно: вступление занимает экран целиком,
          перенести его на другой экран нельзя, значит это не самодостаточная
          единица, а сама страница.
        */}
        <Badge tone="brand">
          <Icon name={subject.icon} size={14} />
          {subject.title}
        </Badge>
        <h1 className="mt-2 text-3xl font-medium text-ink-900 sm:text-4xl">{t.title}</h1>
        <p className="mt-4 text-ink-500">{t.introText(questions.length)}</p>

        <Button size="lg" className="mt-10" onClick={() => setStage('quiz')}>
          {t.start}
        </Button>
      </div>
    );
  }

  /* ---------------- Экран 2: вопросы ---------------- */

  if (stage === 'quiz' && task) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {/*
          Ход теста это служебная строка, а не самостоятельный блок, поэтому она
          лежит прямо на фоне. Номер вопроса набран подписью, чтобы не спорить
          с условием задания: на этом экране крупнее всего должен быть вопрос.
        */}
        <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
          {t.question(current + 1, questions.length)}
        </p>
        <div aria-hidden className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-100">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${(current / questions.length) * 100}%` }}
          />
        </div>

        <p className="mt-10 text-3xl font-medium leading-snug text-ink-900 sm:text-4xl"><MathText>{task.prompt}</MathText></p>

        {task.kind === 'single' && task.options && (
          <div className="mt-4 grid gap-2">
            {task.options.map((option, index) => (
              <button
                key={option}
                onClick={() => setAnswer(String(index))}
                aria-pressed={answer === String(index)}
                className={`rounded-xl border-2 p-4 text-left transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  answer === String(index)
                    ? 'border-brand-500 bg-brand-50 text-brand-800'
                    : 'border-ink-200 bg-white text-ink-700 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]'
                }`}
              >
                <MathText>{option}</MathText>
              </button>
            ))}
          </div>
        )}

        {task.kind === 'numeric' && (
          <input
            type="text"
            inputMode="decimal"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder={t.numericPlaceholder}
            className="mt-4 w-full rounded-xl border border-ink-200 px-4 py-3 text-ink-900 outline-none focus:border-brand-500"
          />
        )}

        {/* Диагностика — те же задания, и считать в ней приходится так же. */}
        <div className="mt-8">
          <Scratchpad key={task.id} />
        </div>

        <Button className="mt-6 w-full" size="lg" onClick={submit} disabled={answer === ''}>
          {current + 1 === questions.length ? t.finish : t.answer}
        </Button>
      </div>
    );
  }

  /* ---------------- Экран 3: результат ---------------- */

  if (stage === 'result' && result) {
    const levelText =
      result.level === 'advanced'
        ? t.levelAdvanced
        : result.level === 'intermediate'
          ? t.levelIntermediate
          : t.levelBeginner;

    // Навыки показываем только те, что реально проверялись в тесте.
    const testedSkills = [...new Set(result.answers.map((item) => item.skillId))];

    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {/*
          Итог держится на одном числе. Раньше процент стоял в карточке рядом
          с рамкой и тенью и терялся среди блоков одного веса, хотя ради него
          ученик и проходил тест. Теперь он лежит на голом фоне и заметно крупнее
          всего остального на экране, а уровень и число верных ответов ушли
          в строку подробностей под ним.
        */}
        <Kicker>{t.done}</Kicker>
        <p className="mt-2 text-6xl font-medium tabular-nums text-ink-900">
          {Math.round(result.score * 100)}
          <span className="text-3xl text-ink-300">%</span>
        </p>
        <p className="mt-2 tabular-nums text-ink-500">
          {t.levelLabel} <span className="font-semibold text-ink-800">{levelText}</span> ·{' '}
          {t.correctOf(result.answers.filter((item) => item.correct).length, result.answers.length)}
        </p>

        {/*
          Карта навыков это таблица показателей, а не самодостаточная единица:
          перенести её на другой экран целиком нельзя. Поэтому голый фон
          с волосяными линиями вместо карточки.
        */}
        <section className="mt-10">
          <h2 className="text-lg font-medium text-ink-900">{t.skillMap}</h2>
          <p className="mt-2 text-sm text-ink-500">{t.skillMapHint}</p>
          <div className="mt-4 divide-y divide-ink-200 border-y border-ink-200">
            {testedSkills.map((skillId) => (
              <div key={skillId} className="py-4">
                <ProgressBar label={getSkillTitle(skillId)} value={result.skillMastery[skillId] ?? 0} />
              </div>
            ))}
          </div>
        </section>

        <div className="mt-16 flex flex-wrap items-center gap-4">
          <ButtonLink href="/plan" size="lg">
            {t.toPlan}
          </ButtonLink>
          <Link href="/dashboard" className="text-sm font-semibold text-brand-600 hover:underline">
            {t.toDashboard}
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
