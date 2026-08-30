'use client';

/**
 * Изучение темы: теория и задания с разбором ошибок.
 *
 * Это главный цикл продукта: ученик отвечает → сервер проверяет и просит модель
 * объяснить → результат записывается в прогресс → сложность следующих заданий
 * подстраивается. Всё остальное в приложении обслуживает этот цикл.
 */

import { useEffect, useState } from 'react';
import { getSubject, getTopic } from '@/data';
import { computeSkillMastery, difficultyExplanation, selectTasks } from '@/lib/personalization';
import type { Difficulty, Task } from '@/lib/types';
import type { Dict } from '@/lib/i18n';
import type { FeedbackRequest, FeedbackResponse } from '@/lib/ai/contracts';
import { useStore } from '@/components/StoreProvider';
import { AiBadge } from '@/components/AiBadge';
import { Badge, Button, ButtonLink, Card, EmptyState, Panel, RailRow, Skeleton } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { MathText } from '@/components/MathText';

/**
 * Подписи страницы на трёх языках. Ключи одинаковые — за этим следит TypeScript.
 * Уровни сложности переведены здесь, а не в types.ts: там подписи общие для сервера.
 */
const TEXT: Dict<{
  notFoundTitle: string;
  notFoundText: string;
  backToPlan: string;
  teacherTopic: string;
  theory: string;
  tasksTab: (n: number) => string;
  keyPoints: string;
  example: (n: number) => string;
  goToTasks: string;
  topicDone: string;
  solved: (n: number, total: number) => string;
  restart: string;
  taskCounter: (n: number, total: number) => string;
  difficulty: Record<Difficulty, string>;
  numericPlaceholder: string;
  showHint: string;
  correct: string;
  incorrect: string;
  correctAnswer: string;
  explanation: string;
  nextTask: string;
  finishTopic: string;
  answer: string;
  networkError: string;
}> = {
  ru: {
    notFoundTitle: 'Тема не найдена',
    notFoundText: 'Возможно, ссылка устарела или тему удалили.',
    backToPlan: 'Вернуться к плану',
    teacherTopic: 'Тема учителя',
    theory: 'Теория',
    tasksTab: (n) => `Задания (${n})`,
    keyPoints: 'Главное запомнить',
    example: (n) => `Пример ${n}`,
    goToTasks: 'Перейти к заданиям',
    topicDone: 'Тема пройдена',
    solved: (n, total) => `Верно решено ${n} из ${total}.`,
    restart: 'Решить ещё раз',
    taskCounter: (n, total) => `Задание ${n} из ${total}`,
    difficulty: {
      1: 'Базовый',
      2: 'Простой',
      3: 'Средний',
      4: 'Продвинутый',
      5: 'Олимпиадный',
    },
    numericPlaceholder: 'Ответ числом',
    showHint: 'Показать подсказку',
    correct: 'Верно',
    incorrect: 'Пока не верно',
    correctAnswer: 'Правильный ответ:',
    explanation: 'Разбор',
    nextTask: 'Следующее задание',
    finishTopic: 'Завершить тему',
    answer: 'Ответить',
    networkError: 'Не удалось связаться с сервером. Проверь интернет и попробуй ещё раз.',
  },
  kk: {
    notFoundTitle: 'Тақырып табылмады',
    notFoundText: 'Сілтеме ескірген болуы мүмкін немесе тақырып жойылған.',
    backToPlan: 'Жоспарға оралу',
    teacherTopic: 'Мұғалім тақырыбы',
    theory: 'Теория',
    tasksTab: (n) => `Тапсырмалар (${n})`,
    keyPoints: 'Есте сақтау керек',
    example: (n) => `${n}-мысал`,
    goToTasks: 'Тапсырмаларға өту',
    topicDone: 'Тақырып аяқталды',
    solved: (n, total) => `${total} тапсырманың ішінен ${n} дұрыс шешілді.`,
    restart: 'Қайта шешу',
    taskCounter: (n, total) => `Тапсырма ${n} / ${total}`,
    difficulty: {
      1: 'Бастапқы',
      2: 'Жеңіл',
      3: 'Орташа',
      4: 'Күрделі',
      5: 'Олимпиадалық',
    },
    numericPlaceholder: 'Жауапты санмен жаз',
    showHint: 'Кеңесті көрсету',
    correct: 'Дұрыс',
    incorrect: 'Әзірге дұрыс емес',
    correctAnswer: 'Дұрыс жауабы:',
    explanation: 'Талдау',
    nextTask: 'Келесі тапсырма',
    finishTopic: 'Тақырыпты аяқтау',
    answer: 'Жауап беру',
    networkError: 'Сервермен байланысу мүмкін болмады. Интернетті тексеріп, қайта көр.',
  },
  en: {
    notFoundTitle: 'Topic not found',
    notFoundText: 'The link may be outdated, or the topic was deleted.',
    backToPlan: 'Back to plan',
    teacherTopic: 'Teacher topic',
    theory: 'Theory',
    tasksTab: (n) => `Tasks (${n})`,
    keyPoints: 'Key takeaways',
    example: (n) => `Example ${n}`,
    goToTasks: 'Go to tasks',
    topicDone: 'Topic complete',
    solved: (n, total) => `You solved ${n} of ${total} correctly.`,
    restart: 'Try again',
    taskCounter: (n, total) => `Task ${n} of ${total}`,
    difficulty: {
      1: 'Basic',
      2: 'Easy',
      3: 'Medium',
      4: 'Advanced',
      5: 'Olympiad',
    },
    numericPlaceholder: 'Answer as a number',
    showHint: 'Show hint',
    correct: 'Correct',
    incorrect: 'Not quite yet',
    correctAnswer: 'Correct answer:',
    explanation: 'Explanation',
    nextTask: 'Next task',
    finishTopic: 'Finish topic',
    answer: 'Submit',
    networkError: 'Could not reach the server. Check your connection and try again.',
  },
};

export function LearnClient({ topicId }: { topicId: string }) {
  const { state, hydrated, recordAttempt } = useStore();
  const t = TEXT[state.language];

  const [tab, setTab] = useState<'theory' | 'tasks'>('theory');
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [solved, setSolved] = useState(0);

  /**
   * Сбой связи держим отдельно от разбора.
   *
   * Раньше в этом случае подставлялся фальшивый разбор с correct: false, и ученик
   * видел «✗ Пока не верно» — вердикт, которого сервер не выносил. Ответ мог быть
   * правильным, просто запрос не дошёл.
   */
  const [failed, setFailed] = useState(false);

  /**
   * Подборка заданий фиксируется один раз за заход в тему.
   *
   * Раньше список пересчитывался на каждом рендере из state. Как только ученик
   * отвечал верно, движок относил это задание к решённым и уводил в конец
   * списка — прямо в тот момент, когда на экране показывался разбор. В карточке
   * оказывалось условие уже СЛЕДУЮЩЕГО задания рядом с разбором предыдущего,
   * а по кнопке «Дальше» одно задание пропускалось нерешённым.
   *
   * Изменение сложности тоже применяется со следующего захода, а не посреди
   * темы: перетасовывать задания под пальцем у ученика — плохая идея.
   */
  const [sessionTasks, setSessionTasks] = useState<Task[]>([]);
  const [session, setSession] = useState(0);

  const topic = getTopic(topicId, state.customTopics);
  const subject = getSubject(topic?.subjectId);

  useEffect(() => {
    if (!hydrated || !topic || !subject) return;
    // Уровень сложности задаёт движок: он растёт и падает по результатам ученика.
    const difficulty = state.difficulty[subject.id] ?? 2;
    setSessionTasks(selectTasks(topic, difficulty, state));
    // Намеренно только по теме и номеру захода: список не должен меняться
    // от того, что ученик ответил на задание внутри этого же захода.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, topicId, session]);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!topic || !subject) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
          <Icon name="book" size={28} />
        </div>
        <div className="mt-4">
          <EmptyState
           
            title={t.notFoundTitle}
            description={t.notFoundText}
            action={<ButtonLink href="/plan">{t.backToPlan}</ButtonLink>}
          />
        </div>
      </div>
    );
  }

  const tasks = sessionTasks;
  const task = tasks[index];

  /** Отправляет ответ на проверку и получает разбор. */
  async function submit() {
    if (!task || !topic || !subject) return;

    setLoading(true);
    setShowHint(false);
    setFailed(false);

    const mastery = computeSkillMastery(state)[task.skillId]?.mastery ?? 0.5;
    const body: FeedbackRequest = {
      taskId: task.id,
      topicId: topic.id,
      language: state.language,
      answer,
      profile: state.profile,
      skillMastery: mastery,
      // Темы, созданные учителем, сервер не знает — они живут в браузере,
      // поэтому такое задание отправляем целиком.
      task: topic.custom ? task : undefined,
    };

    try {
      const response = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      // Роуты отвечают {error} с кодом 4xx (например, при срабатывании
      // ограничителя частоты). Без этой проверки такой ответ разбирался бы как
      // обычный результат: поля пришли бы пустыми, и в прогресс ученика ушла бы
      // ложная неверная попытка по заданию, которое сервер даже не проверял.
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data: FeedbackResponse = await response.json();

      setFeedback(data);
      if (data.correct) setSolved((value) => value + 1);

      // Источник истины о правильности — сервер, а не проверка на клиенте.
      recordAttempt(
        {
          taskId: task.id,
          topicId: topic.id,
          skillId: task.skillId,
          subjectId: subject.id,
          difficulty: task.difficulty,
          correct: data.correct,
          answer,
        },
        topic.tasks.length,
      );
    } catch {
      // Вердикт не выносим: сервер ответ не проверял.
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  function next() {
    setFeedback(null);
    setFailed(false);
    setAnswer('');
    setShowHint(false);
    setIndex(index + 1);
  }

  function restart() {
    setFeedback(null);
    setFailed(false);
    setAnswer('');
    setIndex(0);
    setSolved(0);
    // Новый заход — новая подборка, уже с учётом изменившейся сложности.
    setSession((value) => value + 1);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {/*
        Страница открывается контекстной строкой, а не заголовком: ученик приходит
        сюда из плана и уже знает, куда попал. Сначала предмет, потом название темы.
        Заголовок здесь намеренно сдержанный: главный элемент экрана это условие
        задания, и оно должно быть крупнее всего остального.
      */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">
          <Icon name={subject.icon} size={14} />
          {subject.title}
        </Badge>
        {topic.custom && <Badge tone="accent">{t.teacherTopic}</Badge>}
      </div>
      <h1 className="mt-2 text-xl font-semibold text-ink-900 sm:text-2xl">{topic.title}</h1>
      <p className="mt-2 text-ink-500">{topic.summary}</p>

      {/* Вкладки */}
      <div className="mt-10 flex gap-2 border-b border-ink-200">
        {(['theory', 'tasks'] as const).map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
              tab === item
                ? 'border-brand-500 text-brand-700'
                : 'border-transparent text-ink-400 hover:text-ink-700'
            }`}
          >
            {item === 'theory' ? t.theory : t.tasksTab(tasks.length)}
          </button>
        ))}
      </div>

      {/* ---------------- Теория ---------------- */}
      {tab === 'theory' && (
        <div className="mt-4">
          {/*
            Теория перестала быть стопкой одинаковых карточек. Вводный абзац и
            разделы это сплошной текст одной темы, их нельзя перенести на другой
            экран поодиночке, поэтому они лежат на голом фоне и разделены
            волосяными линиями. Карточка осталась только там, где содержимое
            действительно самодостаточно.
          */}
          <p className="border-b border-ink-200 pb-6 text-lg leading-relaxed text-ink-700">
            <MathText>{topic.material.intro}</MathText>
          </p>

          {topic.material.sections.length > 0 && (
            <div className="mt-10 divide-y divide-ink-200">
              {topic.material.sections.map((section) => (
                <section key={section.heading} className="py-6 first:pt-0">
                  <h2 className="text-lg font-bold text-ink-900">{section.heading}</h2>
                  <p className="mt-2 leading-relaxed text-ink-700"><MathText>{section.body}</MathText></p>
                  {section.formula && (
                    <p className="mt-4 rounded-xl bg-ink-50 px-4 py-3 font-mono text-sm text-ink-800">
                      <MathText>{section.formula}</MathText>
                    </p>
                  )}
                </section>
              ))}
            </div>
          )}

          {topic.material.keyPoints.length > 0 && (
            <Panel className="mt-10 border-brand-200 bg-brand-50 p-5">
              <h2 className="text-lg font-bold text-brand-800">{t.keyPoints}</h2>
              <ul className="mt-4 space-y-2">
                {topic.material.keyPoints.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-brand-800">
                    <Icon name="check" size={16} className="mt-0.5 text-brand-600" />
                    <span><MathText>{point}</MathText></span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {/*
            Разобранные примеры это перечисление, поэтому они идут строками
            с рейкой, а не карточками. Цвет рейки не единственный носитель смысла:
            рядом стоит подпись «Пример N».
          */}
          {topic.material.examples.length > 0 && (
            <div className="mt-10 space-y-4">
              {topic.material.examples.map((example, i) => (
                <RailRow key={example.problem} tone="accent">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.example(i + 1)}</p>
                  <p className="mt-2 font-medium text-ink-800"><MathText>{example.problem}</MathText></p>
                  <p className="mt-2 leading-relaxed text-ink-600"><MathText>{example.solution}</MathText></p>
                </RailRow>
              ))}
            </div>
          )}

          <div className="mt-16">
            <Button size="lg" className="w-full" onClick={() => setTab('tasks')}>
              {t.goToTasks}
            </Button>
          </div>
        </div>
      )}

      {/* ---------------- Задания ---------------- */}
      {tab === 'tasks' && (
        <div className="mt-4">
          {!task ? (
            // Задания закончились, показываем итог. Карточка тут не нужна: на экране больше
            // ничего нет, обводить единственный блок рамкой значит спорить с ним.
            <div className="py-6">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success-50 text-success-700">
                <Icon name="crosshair" size={28} />
              </span>
              <h2 className="mt-4 text-3xl font-semibold text-ink-900">{t.topicDone}</h2>
              <p className="mt-2 tabular-nums text-ink-500">{t.solved(solved, tasks.length)}</p>
              {difficultyExplanation(subject.id, state) && (
                <p className="mt-4 border-t border-ink-200 pt-4 text-sm text-brand-700">
                  {difficultyExplanation(subject.id, state)}
                </p>
              )}
              <div className="mt-10 flex flex-wrap gap-3">
                <ButtonLink href="/plan">{t.backToPlan}</ButtonLink>
                <Button variant="secondary" onClick={restart}>
                  {t.restart}
                </Button>
              </div>
            </div>
          ) : (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide tabular-nums text-ink-400">
                  {t.taskCounter(index + 1, tasks.length)}
                </span>
                <Badge>{t.difficulty[task.difficulty]}</Badge>
              </div>

              {/*
                Условие это главный элемент экрана, за него цепляется глаз при первом
                взгляде. Поэтому оно набрано заметно крупнее счётчика над ним
                и крупнее названия темы в шапке страницы.
              */}
              <p className="mt-4 text-2xl font-semibold leading-snug text-ink-900 sm:text-3xl"><MathText>{task.prompt}</MathText></p>

              {/* Варианты ответа или поле ввода — в зависимости от типа задания */}
              {task.kind === 'single' && task.options && (
                <div className="mt-10 grid gap-2.5">
                  {task.options.map((option, i) => (
                    <button
                      key={option}
                      onClick={() => setAnswer(String(i))}
                      disabled={feedback !== null}
                      aria-pressed={answer === String(i)}
                      className={`rounded-xl border-2 p-4 text-left transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-70 ${
                        answer === String(i)
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
                  disabled={feedback !== null}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder={t.numericPlaceholder}
                  className="mt-10 w-full rounded-xl border border-ink-200 px-4 py-3 outline-none focus:border-brand-500 disabled:bg-ink-50"
                />
              )}

              {/* Подсказка доступна только до ответа */}
              {!feedback && (
                <div className="mt-4">
                  {showHint ? (
                    <p className="flex items-center gap-2 rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-700">
                      <Icon name="bulb" size={16} />
                      <MathText>{task.hint}</MathText>
                    </p>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setShowHint(true)}>
                      {t.showHint}
                    </Button>
                  )}
                </div>
              )}

              {loading && (
                <div className="mt-10 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-10/12" />
                </div>
              )}

              {failed && !loading && (
                <p className="mt-10 flex items-center gap-2 rounded-xl bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-700">
                  <Icon name="alert" size={16} />
                  {t.networkError}
                </p>
              )}

              {/* Результат проверки */}
              {feedback && !loading && (
                /*
                  Разбор отделён от условия линией, а не только отступом: это уже
                  другой этап работы, ответ принят и обсуждается, а не решается.
                  Одного пустого места для такой границы мало.
                */
                <div className="mt-10 border-t border-ink-200 pt-6">
                  <div
                    className={`flex flex-wrap items-center gap-2 rounded-xl px-4 py-3 font-bold ${
                      feedback.correct ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'
                    }`}
                  >
                    <Icon name={feedback.correct ? 'check' : 'close'} size={18} />
                    <span>{feedback.correct ? t.correct : t.incorrect}</span>
                    {!feedback.correct && feedback.correctAnswer && (
                      <span className="font-normal">
                        {t.correctAnswer} <MathText>{feedback.correctAnswer}</MathText>
                      </span>
                    )}
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.explanation}</span>
                      <AiBadge live={feedback.live} reason={feedback.fallbackReason} />
                    </div>
                    <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-700"><MathText>{feedback.text}</MathText></p>
                  </div>
                </div>
              )}

              <div className="mt-10">
                {feedback ? (
                  <Button size="lg" className="w-full" onClick={next}>
                    {index + 1 < tasks.length ? t.nextTask : t.finishTopic}
                  </Button>
                ) : (
                  <Button size="lg" className="w-full" onClick={submit} disabled={answer === '' || loading}>
                    {t.answer}
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
