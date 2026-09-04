'use client';

/**
 * Изучение темы: теория и задания с разбором ошибок.
 *
 * Это главный цикл продукта: ученик отвечает → сервер проверяет и просит модель
 * объяснить → результат записывается в прогресс → сложность следующих заданий
 * подстраивается. Всё остальное в приложении обслуживает этот цикл.
 */

import { useMemo, useState } from 'react';
import { getSubject, getTopic } from '@/data';
import { computeSkillMastery, difficultyExplanation, selectTasks } from '@/lib/personalization';
import { studentAnswerText } from '@/lib/grading';
import type { Difficulty, Task } from '@/lib/types';
import type { Dict } from '@/lib/i18n';
import type { FeedbackRequest, FeedbackResponse } from '@/lib/ai/contracts';
import { useStore } from '@/components/StoreProvider';
import { AiBadge } from '@/components/AiBadge';
import { Badge, Button, ButtonLink, Card, EmptyState, Panel, RailRow, Skeleton } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { MathText } from '@/components/MathText';

/**
 * Одна отвеченная задача за заход: условие, ответ ученика и вердикт сервера.
 * Копится за весь заход, чтобы в конце было что разбирать.
 */
interface Review {
  task: Task;
  answer: string;
  correct: boolean;
}

/**
 * Состояние разбора по одному заданию: запрос в пути, готовый ответ сервера
 * или неудача. Хранится отдельно от самого разбора, чтобы не путать
 * «ещё не просили» с «просили, но не дошло».
 */
type ExplanationState = FeedbackResponse | 'loading' | 'failed';

/**
 * Подписи страницы на трёх языках. Ключи одинаковые — за этим следит TypeScript.
 * Уровни сложности переведены здесь, а не в types.ts: там подписи общие для сервера.
 */
interface LearnText {
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
  explainNow: string;
  reviewTitle: string;
  reviewIntro: string;
  explainMistakes: (n: number) => string;
  showExplanation: string;
  hideExplanation: string;
  explaining: string;
  yourAnswer: string;
  allCorrect: string;
}

const TEXT: Dict<LearnText> = {
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
    explainNow: 'Разобрать это задание',
    reviewTitle: 'Разбор',
    reviewIntro: 'Разбор готовит ИИ, это занимает несколько секунд. Открывайте только те задания, которые хотите понять.',
    explainMistakes: (n) => `Разобрать все ошибки (${n})`,
    showExplanation: 'Показать разбор',
    hideExplanation: 'Свернуть',
    explaining: 'Готовим разбор…',
    yourAnswer: 'Ваш ответ:',
    allCorrect: 'Ошибок нет — разбирать нечего.',
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
    explainNow: 'Осы тапсырманы талдау',
    reviewTitle: 'Талдау',
    reviewIntro: 'Талдауды ИИ дайындайды, бұл бірнеше секунд алады. Тек түсінгіңіз келетін тапсырмаларды ашыңыз.',
    explainMistakes: (n) => `Барлық қатені талдау (${n})`,
    showExplanation: 'Талдауды көрсету',
    hideExplanation: 'Жию',
    explaining: 'Талдау дайындалып жатыр…',
    yourAnswer: 'Сіздің жауабыңыз:',
    allCorrect: 'Қате жоқ — талдайтын ештеңе жоқ.',
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
    explainNow: 'Explain this task',
    reviewTitle: 'Review',
    reviewIntro: 'Explanations are written by AI and take a few seconds. Open only the tasks you want to understand.',
    explainMistakes: (n) => `Explain all mistakes (${n})`,
    showExplanation: 'Show explanation',
    hideExplanation: 'Collapse',
    explaining: 'Preparing the explanation…',
    yourAnswer: 'Your answer:',
    allCorrect: 'No mistakes — nothing to review.',
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

  /*
    Что ученик прошёл за этот заход и что из этого разобрано.

    Разбор больше не приходит вместе с вердиктом. Проверка ответа занимает
    миллисекунды, а объяснение от модели — от трёх до десяти секунд, и
    раньше ученик ждал второе, чтобы увидеть первое: после каждого задания
    экран замирал, даже когда человек и так всё понял и хотел идти дальше.
    Теперь вердикт мгновенный, а разбор запрашивается точечно — по кнопке,
    на том задании, которое действительно захотелось понять.
  */
  const [reviews, setReviews] = useState<Review[]>([]);
  const [explanations, setExplanations] = useState<Record<string, ExplanationState>>({});
  const [openReview, setOpenReview] = useState<string[]>([]);

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
  const [session, setSession] = useState(0);

  const topic = getTopic(topicId, state.customTopics);
  const subject = getSubject(topic?.subjectId);

  /*
    Список заданий — вычисляемое значение, а не состояние.

    Раньше он лежал в useState и заполнялся эффектом, то есть первый кадр
    страницы рисовался с пустым списком, и только следующим проходом
    появлялись задания. setSessionTasks при этом вызывался ровно в одном
    месте — признак того, что состояние здесь и не требовалось.

    Зависимости намеренно те же, что были у эффекта: только тема и номер
    захода. Список не должен меняться от того, что ученик ответил на
    задание внутри этого же захода, — иначе подбор пересобрался бы прямо
    под ним после первого же ответа.
  */
  const sessionTasks = useMemo<Task[]>(() => {
    if (!hydrated || !topic || !subject) return [];
    // Уровень сложности задаёт движок: он растёт и падает по результатам ученика.
    const difficulty = state.difficulty[subject.id] ?? 2;
    return selectTasks(topic, difficulty, state);
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
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[var(--radius-card)] bg-ink-100 text-ink-400">
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
  const mistakeCount = reviews.filter((item) => !item.correct).length;

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
      /*
        Разбор здесь не просим. Нужен только вердикт, и он приходит за
        миллисекунды: сервер сверяет ответ с эталоном, не обращаясь к
        модели. Объяснение ученик запросит сам — по кнопке под ответом
        или в конце захода, на тех заданиях, где оно нужно.
      */
      explain: false,
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
      // Копим заход целиком: в конце по нему собирается разбор.
      setReviews((list) => [...list, { task, answer, correct: data.correct }]);

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

  /**
   * Просит у сервера разбор по уже отвеченному заданию.
   *
   * Второй запрос по тому же ответу — намеренно. Попытка записывается
   * только на проверке, поэтому повторное обращение ничего не удваивает в
   * прогрессе, а модель зовётся ровно там, где разбор захотели увидеть.
   */
  async function askExplanation(item: Review) {
    if (!topic || !subject) return;

    const current = explanations[item.task.id];
    // Готовый разбор не перезапрашиваем; неудачную попытку — можно.
    if (current === 'loading' || (current && current !== 'failed')) return;

    setExplanations((map) => ({ ...map, [item.task.id]: 'loading' }));

    const body: FeedbackRequest = {
      taskId: item.task.id,
      topicId: topic.id,
      language: state.language,
      answer: item.answer,
      profile: state.profile,
      skillMastery: computeSkillMastery(state)[item.task.skillId]?.mastery ?? 0.5,
      task: topic.custom ? item.task : undefined,
      explain: true,
    };

    try {
      const response = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: FeedbackResponse = await response.json();
      setExplanations((map) => ({ ...map, [item.task.id]: data }));
    } catch {
      setExplanations((map) => ({ ...map, [item.task.id]: 'failed' }));
    }
  }

  /**
   * Разбирает все ошибки захода.
   *
   * Последовательно, а не пачкой: на роуте стоит ограничитель частоты, и
   * пять одновременных запросов упёрлись бы в него, превратив разбор в
   * набор ошибок сети.
   */
  async function explainAllMistakes() {
    const mistakes = reviews.filter((item) => !item.correct);
    // Раскрываем сразу все: иначе разбор придёт, а увидеть его будет негде.
    setOpenReview(mistakes.map((item) => item.task.id));
    for (const item of mistakes) await askExplanation(item);
  }

  function toggleReview(taskId: string) {
    setOpenReview((list) =>
      list.includes(taskId) ? list.filter((id) => id !== taskId) : [...list, taskId],
    );
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
    setReviews([]);
    setExplanations({});
    setOpenReview([]);
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
      <h1 className="mt-2 text-xl font-medium text-ink-900 sm:text-2xl">{topic.title}</h1>
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
                  <h2 className="text-lg font-medium text-ink-900">{section.heading}</h2>
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
              <h2 className="text-lg font-medium text-brand-800">{t.keyPoints}</h2>
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
              <span className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-card)] bg-success-50 text-success-700">
                <Icon name="crosshair" size={28} />
              </span>
              <h2 className="mt-4 text-3xl font-medium text-ink-900">{t.topicDone}</h2>
              <p className="mt-2 tabular-nums text-ink-500">{t.solved(solved, tasks.length)}</p>
              {difficultyExplanation(subject.id, state) && (
                <p className="mt-4 border-t border-ink-200 pt-4 text-sm text-brand-700">
                  {difficultyExplanation(subject.id, state)}
                </p>
              )}
              {/*
                Разбор всего захода — здесь, а не после каждого задания.

                Ученик решает подряд, не прерываясь на ожидание модели, и
                только в конце решает, что именно ему непонятно. Обычно это
                одно-два задания из пяти, а не все пять, — значит и ждать он
                будет один раз вместо пяти, и дневная квота уходит на то,
                что действительно спросили.
              */}
              {reviews.length > 0 && (
                <div className="mt-12 border-t border-ink-200 pt-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-medium text-ink-900">{t.reviewTitle}</h3>
                    {mistakeCount > 0 && (
                      <Button variant="secondary" size="sm" onClick={explainAllMistakes}>
                        <Icon name="sparkles" size={15} />
                        {t.explainMistakes(mistakeCount)}
                      </Button>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-ink-500">
                    {mistakeCount === 0 ? t.allCorrect : t.reviewIntro}
                  </p>

                  <ul className="mt-6 border-t border-ink-200">
                    {reviews.map((item) => {
                      const open = openReview.includes(item.task.id);
                      return (
                        <li key={item.task.id} className="border-b border-ink-200 py-4">
                          <button
                            onClick={() => toggleReview(item.task.id)}
                            aria-expanded={open}
                            className="flex w-full items-start gap-3 text-left focus-visible:ring-2 focus-visible:ring-brand-500"
                          >
                            <span
                              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                                item.correct
                                  ? 'bg-success-50 text-success-700'
                                  : 'bg-danger-50 text-danger-700'
                              }`}
                            >
                              <Icon name={item.correct ? 'check' : 'close'} size={14} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium leading-snug text-ink-900">
                                <MathText>{item.task.prompt}</MathText>
                              </span>
                              <span className="mt-1 block text-xs text-ink-400">
                                {t.yourAnswer} {studentAnswerText(item.task, item.answer)}
                              </span>
                            </span>
                            <Icon
                              name={open ? 'chevron-up' : 'chevron-down'}
                              size={16}
                              className="mt-1 shrink-0 text-ink-400"
                            />
                          </button>

                          {open && (
                            <div className="mt-4 pl-9">
                              <ExplanationBlock
                                state={explanations[item.task.id]}
                                t={t}
                                onAsk={() => askExplanation(item)}
                              />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
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
              <p className="mt-4 text-2xl font-medium leading-snug text-ink-900 sm:text-3xl"><MathText>{task.prompt}</MathText></p>

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
                    className={`flex flex-wrap items-center gap-2 rounded-xl px-4 py-3 font-medium ${
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

                  {/*
                    Разбор здесь не показывается сам. Он стоит секунды
                    ожидания, а после верного ответа их незачем тратить:
                    ученик уже понял и хочет дальше. Кнопка оставляет выбор
                    за ним, а в конце захода разбор доступен по всем
                    заданиям сразу.
                  */}
                  <div className="mt-4">
                    <ExplanationBlock
                      state={explanations[task.id]}
                      t={t}
                      onAsk={() => askExplanation({ task, answer, correct: feedback.correct })}
                    />
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

/**
 * Разбор одного задания: кнопка, ожидание, текст или неудача.
 *
 * Отдельный компонент, потому что одно и то же нужно в двух местах — под
 * ответом на задание и в списке итогов. Раньше разметка разбора жила
 * только в карточке задания, и вынести её в итоги значило бы скопировать.
 */
function ExplanationBlock({
  state,
  t,
  onAsk,
}: {
  state: ExplanationState | undefined;
  t: LearnText;
  onAsk: () => void;
}) {
  if (state === undefined || state === 'failed') {
    return (
      <div>
        <Button variant="secondary" size="sm" onClick={onAsk}>
          <Icon name="sparkles" size={15} />
          {state === 'failed' ? t.networkError : t.explainNow}
        </Button>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.explaining}</p>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-10/12" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.explanation}</span>
        {/* live приходит только вместе с разбором, поэтому здесь оно есть всегда */}
        <AiBadge live={state.live ?? false} reason={state.fallbackReason} />
      </div>
      <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-700">
        <MathText>{state.text ?? ''}</MathText>
      </p>
    </div>
  );
}
