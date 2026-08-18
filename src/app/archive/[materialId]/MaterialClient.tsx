'use client';

/**
 * Разбор задания архива в диалоге с наставником.
 *
 * Экран устроен как переписка, а не как форма с полем ответа. Это принципиально:
 * ученик пишет не итог, а ход мысли, и наставник реагирует именно на мысль.
 * Поле «введите ответ» вернуло бы всё к угадыванию.
 */

import { useEffect, useRef, useState } from 'react';
import { getMaterial } from '@/data/archive';
import { ARCHIVE_CATEGORIES } from '@/lib/archive';
import type { ArchiveTask } from '@/lib/archive';
import type { ChatMessage, Difficulty } from '@/lib/types';
import type { SocraticRequest, SocraticResponse } from '@/lib/ai/contracts';
import type { Dict } from '@/lib/i18n';
import { useStore } from '@/components/StoreProvider';
import { AiBadge } from '@/components/AiBadge';
import { Badge, Button, ButtonLink, Card, EmptyState, Skeleton } from '@/components/ui';

const TEXT: Dict<{
  notFound: string;
  notFoundText: string;
  back: string;
  taskNumber: (n: number, total: number) => string;
  chooseTask: string;
  startHint: string;
  placeholder: string;
  send: string;
  giveUp: string;
  confirmGiveUp: string;
  solution: string;
  solved: string;
  solvedHint: string;
  nextTask: string;
  restart: string;
  networkError: string;
  yourTurn: string;
  difficulty: Record<Difficulty, string>;
}> = {
  ru: {
    notFound: 'Материал не найден',
    notFoundText: 'Возможно, ссылка устарела.',
    back: 'Вернуться в архив',
    taskNumber: (n, total) => `Задание ${n} из ${total}`,
    chooseTask: 'Выбери задание',
    startHint: 'Напиши, с чего бы ты начал. Не бойся ошибиться — наставник поправит вопросом.',
    placeholder: 'Твоя мысль или ответ…',
    send: 'Отправить',
    giveUp: 'Показать разбор',
    confirmGiveUp: 'Открыть полное решение? Дальше разбирать самому будет уже неинтересно.',
    solution: 'Полное решение',
    solved: 'Задача решена',
    solvedHint: 'Ты дошёл до ответа сам — это и есть смысл разбора.',
    nextTask: 'Следующее задание',
    restart: 'Начать разбор заново',
    networkError: 'Не удалось связаться с наставником. Попробуй ещё раз.',
    yourTurn: 'Наставник ждёт твой ход',
    difficulty: { 1: 'Базовый', 2: 'Простой', 3: 'Средний', 4: 'Продвинутый', 5: 'Олимпиадный' },
  },
  kk: {
    notFound: 'Материал табылмады',
    notFoundText: 'Сілтеме ескірген болуы мүмкін.',
    back: 'Мұрағатқа оралу',
    taskNumber: (n, total) => `Тапсырма ${n} / ${total}`,
    chooseTask: 'Тапсырманы таңда',
    startHint: 'Неден бастайтыныңды жаз. Қателесуден қорықпа — тәлімгер сұрақпен түзетеді.',
    placeholder: 'Ойың немесе жауабың…',
    send: 'Жіберу',
    giveUp: 'Талдауды көрсету',
    confirmGiveUp: 'Толық шешім ашылсын ба? Одан кейін өзің талдау қызық болмайды.',
    solution: 'Толық шешім',
    solved: 'Тапсырма шешілді',
    solvedHint: 'Жауапқа өзің жеттің — талдаудың мәні осында.',
    nextTask: 'Келесі тапсырма',
    restart: 'Талдауды қайта бастау',
    networkError: 'Тәлімгермен байланысу мүмкін болмады. Қайта көр.',
    yourTurn: 'Тәлімгер сенің жауабыңды күтіп тұр',
    difficulty: { 1: 'Бастапқы', 2: 'Жеңіл', 3: 'Орташа', 4: 'Күрделі', 5: 'Олимпиадалық' },
  },
  en: {
    notFound: 'Material not found',
    notFoundText: 'The link may be outdated.',
    back: 'Back to archive',
    taskNumber: (n, total) => `Task ${n} of ${total}`,
    chooseTask: 'Pick a task',
    startHint: 'Write where you would start. Mistakes are fine — the mentor answers with a question.',
    placeholder: 'Your thinking or answer…',
    send: 'Send',
    giveUp: 'Show the solution',
    confirmGiveUp: 'Reveal the full solution? Working it out yourself stops being interesting after this.',
    solution: 'Full solution',
    solved: 'Solved',
    solvedHint: 'You reached the answer yourself — that was the whole point.',
    nextTask: 'Next task',
    restart: 'Start over',
    networkError: 'Could not reach the mentor. Try again.',
    yourTurn: 'The mentor is waiting for your move',
    difficulty: { 1: 'Basic', 2: 'Easy', 3: 'Medium', 4: 'Advanced', 5: 'Olympiad' },
  },
};

export function MaterialClient({ materialId }: { materialId: string }) {
  const { state, hydrated } = useStore();
  const t = TEXT[state.language];

  const material = getMaterial(materialId);

  const [taskIndex, setTaskIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [solved, setSolved] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, loading]);

  const task: ArchiveTask | undefined = material?.tasks[taskIndex];

  /** Сбрасывает диалог при переходе к другому заданию. */
  function openTask(index: number) {
    setTaskIndex(index);
    setMessages([]);
    setDraft('');
    setSolved(false);
    setShowSolution(false);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!task || trimmed === '' || loading || solved) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmed, at: new Date().toISOString() };
    const history = messages;

    setMessages([...history, userMessage]);
    setDraft('');
    setLoading(true);

    const body: SocraticRequest = {
      taskId: task.id,
      language: state.language,
      message: trimmed,
      history,
      profile: state.profile,
    };

    try {
      const response = await fetch('/api/ai/socratic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data: SocraticResponse = await response.json();

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: data.text, at: new Date().toISOString(), live: data.live },
      ]);
      if (data.solved) setSolved(true);
    } catch {
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: t.networkError, at: new Date().toISOString(), live: false },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!material || !task) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          icon="📂"
          title={t.notFound}
          description={t.notFoundText}
          action={<ButtonLink href="/archive">{t.back}</ButtonLink>}
        />
      </div>
    );
  }

  const meta = ARCHIVE_CATEGORIES.find((item) => item.id === material.category);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">
          <span aria-hidden>{meta?.icon}</span> {meta?.title[state.language]}
        </Badge>
        <Badge>{t.difficulty[material.difficulty]}</Badge>
        <span className="text-xs text-ink-400">{material.source}</span>
      </div>

      <h1 className="mt-3 text-2xl font-bold text-ink-900 sm:text-3xl">{material.title}</h1>

      {/* Переключатель заданий */}
      <div className="mt-5">
        <p className="mb-2 text-sm font-semibold text-ink-500">{t.chooseTask}</p>
        <div className="flex flex-wrap gap-2">
          {material.tasks.map((item, index) => (
            <button
              key={item.id}
              onClick={() => openTask(index)}
              className={`h-10 w-10 rounded-xl border-2 font-bold transition-colors ${
                index === taskIndex
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Условие */}
      <Card className="mt-5">
        <p className="text-sm font-semibold text-ink-400">
          {t.taskNumber(taskIndex + 1, material.tasks.length)}
        </p>
        {/* whitespace-pre-line сохраняет переносы: у заданий IELTS отрывок
            и утверждение должны стоять разными абзацами */}
        <p className="mt-2 whitespace-pre-line text-lg font-semibold leading-relaxed text-ink-900">
          {task.prompt}
        </p>
      </Card>

      {/* Диалог */}
      <div className="mt-5 space-y-3">
        {/* Первый вопрос заготовлен в контенте: он не требует обращения к модели
            и задаёт разговору верный тон с первой секунды */}
        <div className="rounded-2xl border border-ink-200 bg-white px-4 py-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-600">🏛️ Наставник</p>
          <p className="leading-relaxed text-ink-700">{task.opening}</p>
        </div>

        {messages.map((message, index) => (
          <div
            key={`${message.at}-${index}`}
            className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
          >
            {message.role === 'user' ? (
              <p className="max-w-[85%] whitespace-pre-line rounded-2xl bg-brand-500 px-4 py-3 text-white">
                {message.content}
              </p>
            ) : (
              <div className="max-w-[92%] rounded-2xl border border-ink-200 bg-white px-4 py-3">
                <div className="mb-2">
                  <AiBadge live={message.live ?? false} />
                </div>
                <p className="whitespace-pre-line leading-relaxed text-ink-700">{message.content}</p>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="max-w-[92%] space-y-2 rounded-2xl border border-ink-200 bg-white px-4 py-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-8/12" />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Успех */}
      {solved && (
        <Card className="mt-5 border-success-500/40 bg-success-50">
          <p className="font-bold text-success-700">✓ {t.solved}</p>
          <p className="mt-1 text-sm text-success-700">{t.solvedHint}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {taskIndex + 1 < material.tasks.length && (
              <Button onClick={() => openTask(taskIndex + 1)}>{t.nextTask}</Button>
            )}
            <Button variant="secondary" onClick={() => openTask(taskIndex)}>
              {t.restart}
            </Button>
          </div>
        </Card>
      )}

      {/* Поле ввода */}
      {!solved && (
        <div className="mt-5">
          <p className="mb-2 text-sm text-ink-400">{messages.length === 0 ? t.startHint : t.yourTurn}</p>
          <div className="flex items-end gap-2 rounded-2xl border border-ink-200 bg-white p-2 shadow-sm">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  send(draft);
                }
              }}
              rows={1}
              disabled={loading}
              placeholder={t.placeholder}
              className="max-h-32 flex-1 resize-none px-3 py-2.5 outline-none disabled:bg-white"
            />
            <Button onClick={() => send(draft)} disabled={loading || draft.trim() === ''}>
              {t.send}
            </Button>
          </div>
        </div>
      )}

      {/* Сдаться. Кнопка нужна: без выхода метод Сократа превращается
          в ловушку для того, кто действительно не понимает */}
      <div className="mt-5">
        {showSolution ? (
          <Card>
            <h2 className="font-bold text-ink-900">{t.solution}</h2>
            <p className="mt-2 leading-relaxed text-ink-700">{task.explanation}</p>
          </Card>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (solved || window.confirm(t.confirmGiveUp)) setShowSolution(true);
            }}
          >
            {t.giveUp}
          </Button>
        )}
      </div>
    </div>
  );
}
