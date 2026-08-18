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
import { Button, ButtonLink, Card, EmptyState, ProgressBar } from '@/components/ui';

/** Подписи страницы на трёх языках. Ключи одинаковые — за этим следит TypeScript. */
const TEXT: Dict<{
  notFoundTitle: string;
  notFoundText: string;
  toSubjects: string;
  introTitle: (subject: string) => string;
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
    introTitle: (subject) => `Диагностика: ${subject}`,
    introText: (count) =>
      `${count} заданий, примерно 7 минут. Отвечай честно — по результатам построится твой персональный план. Ошибиться не страшно: это не оценка, а замер.`,
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
    introTitle: (subject) => `Диагностика: ${subject}`,
    introText: (count) =>
      `${count} тапсырма, шамамен 7 минут. Шыныңды жаз — нәтиже бойынша жеке жоспарың құрылады. Қателессең де ештеңе етпейді: бұл баға емес, өлшем.`,
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
    introTitle: (subject) => `Diagnostic: ${subject}`,
    introText: (count) =>
      `${count} questions, about 7 minutes. Answer honestly — your personal plan is built from the result. Mistakes are fine: this is a measurement, not a grade.`,
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
  const { state, saveDiagnostic } = useStore();
  const t = TEXT[state.language];
  const subject = getSubject(subjectId);

  // 'intro' — экран перед началом, число — номер вопроса, 'result' — итог.
  const [stage, setStage] = useState<'intro' | 'quiz' | 'result'>('intro');
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState('');
  const [answers, setAnswers] = useState<{ task: Task; answer: string; correct: boolean }[]>([]);
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  if (!subject) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          icon="🔍"
          title={t.notFoundTitle}
          description={t.notFoundText}
          action={<ButtonLink href="/onboarding">{t.toSubjects}</ButtonLink>}
        />
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

    // Вопросы закончились — считаем итог движком персонализации.
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
  }

  /* ---------------- Экран 1: вступление ---------------- */

  if (stage === 'intro') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <Card className="text-center">
          <span className="text-5xl" aria-hidden>
            {subject.icon}
          </span>
          <h1 className="mt-4 text-2xl font-bold text-ink-900">{t.introTitle(subject.title)}</h1>
          <p className="mt-3 text-ink-500">{t.introText(questions.length)}</p>
          <Button size="lg" className="mt-7" onClick={() => setStage('quiz')}>
            {t.start}
          </Button>
        </Card>
      </div>
    );
  }

  /* ---------------- Экран 2: вопросы ---------------- */

  if (stage === 'quiz' && task) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <p className="text-sm font-semibold text-brand-600">{t.question(current + 1, questions.length)}</p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${(current / questions.length) * 100}%` }}
          />
        </div>

        <Card className="mt-6">
          <p className="text-lg font-semibold text-ink-900">{task.prompt}</p>

          {task.kind === 'single' && task.options && (
            <div className="mt-5 grid gap-2.5">
              {task.options.map((option, index) => (
                <button
                  key={option}
                  onClick={() => setAnswer(String(index))}
                  aria-pressed={answer === String(index)}
                  className={`rounded-xl border-2 p-4 text-left transition-colors ${
                    answer === String(index)
                      ? 'border-brand-500 bg-brand-50 text-brand-800'
                      : 'border-ink-200 bg-white text-ink-700 hover:border-brand-300'
                  }`}
                >
                  {option}
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
              className="mt-5 w-full rounded-xl border border-ink-200 px-4 py-3 text-ink-900 outline-none focus:border-brand-500"
            />
          )}

          <Button className="mt-6 w-full" size="lg" onClick={submit} disabled={answer === ''}>
            {current + 1 === questions.length ? t.finish : t.answer}
          </Button>
        </Card>
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
        <Card className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">{t.done}</p>
          <p className="mt-3 text-5xl font-black text-ink-900">{Math.round(result.score * 100)}%</p>
          <p className="mt-2 text-ink-500">
            {t.levelLabel} <span className="font-semibold text-ink-800">{levelText}</span> ·{' '}
            {t.correctOf(result.answers.filter((item) => item.correct).length, result.answers.length)}
          </p>
        </Card>

        <Card className="mt-4">
          <h2 className="text-lg font-bold text-ink-900">{t.skillMap}</h2>
          <p className="mt-1 text-sm text-ink-500">{t.skillMapHint}</p>
          <div className="mt-5 space-y-4">
            {testedSkills.map((skillId) => (
              <ProgressBar
                key={skillId}
                label={getSkillTitle(skillId)}
                value={result.skillMastery[skillId] ?? 0}
              />
            ))}
          </div>
        </Card>

        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/plan" size="lg">
            {t.toPlan}
          </ButtonLink>
          <Link href="/dashboard" className="self-center text-sm font-semibold text-brand-600 hover:underline">
            {t.toDashboard}
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
