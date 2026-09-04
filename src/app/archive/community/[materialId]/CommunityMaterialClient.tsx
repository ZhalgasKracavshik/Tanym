'use client';

/**
 * Разбор задания из материала учителя/админа в диалоге с наставником.
 *
 * Почти дословно повторяет /archive/[materialId]/MaterialClient — тот же
 * метод Сократа, тот же контракт с /api/ai/socratic. Разница только в
 * источнике данных (Supabase вместо статического файла) и в taskId,
 * который здесь имеет вид db:<materialId>:<taskId>, чтобы серверный роут
 * знал, где искать задание, не обходя все материалы в базе.
 */

import { useEffect, useRef, useState } from 'react';
import { ARCHIVE_CATEGORIES } from '@/lib/archive';
import type { ArchiveCategory } from '@/lib/archive';
import type { ChatMessage, Difficulty } from '@/lib/types';
import type { SocraticRequest, SocraticResponse } from '@/lib/ai/contracts';
import type { Dict } from '@/lib/i18n';
import { useStore } from '@/components/StoreProvider';
import { createClient } from '@/lib/supabase/client';
import { AiBadge } from '@/components/AiBadge';
import { AiAnswer, AiTextScaleControl, useAiTextScale } from '@/components/AiAnswer';
import { Icon } from '@/components/Icon';
import { MathText } from '@/components/MathText';
import { Badge, Button, ButtonLink, EmptyState, Panel, RailRow, Skeleton } from '@/components/ui';

interface CommunityTask {
  id: string;
  prompt: string;
  answer: string;
  unit?: string;
  opening: string;
  explanation: string;
}

interface CommunityMaterial {
  id: string;
  title: string;
  category: ArchiveCategory;
  source: string;
  difficulty: Difficulty;
  tasks: CommunityTask[];
}

const TEXT: Dict<{
  notFound: string;
  notFoundText: string;
  back: string;
  mentor: string;
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
    back: 'Вернуться к материалам',
    mentor: 'Наставник',
    taskNumber: (n, total) => `Задание ${n} из ${total}`,
    chooseTask: 'Выбери задание',
    startHint: 'Напиши, с чего бы ты начал. Не бойся ошибиться, наставник поправит вопросом.',
    placeholder: 'Твоя мысль или ответ…',
    send: 'Отправить',
    giveUp: 'Показать разбор',
    confirmGiveUp: 'Открыть полное решение? Дальше разбирать самому будет уже неинтересно.',
    solution: 'Полное решение',
    solved: 'Задача решена',
    solvedHint: 'Ты дошёл до ответа сам, в этом и есть смысл разбора.',
    nextTask: 'Следующее задание',
    restart: 'Начать разбор заново',
    networkError: 'Не удалось связаться с наставником. Попробуй ещё раз.',
    yourTurn: 'Наставник ждёт твой ход',
    difficulty: { 1: 'Базовый', 2: 'Простой', 3: 'Средний', 4: 'Продвинутый', 5: 'Олимпиадный' },
  },
  kk: {
    notFound: 'Материал табылмады',
    notFoundText: 'Сілтеме ескірген болуы мүмкін.',
    back: 'Материалдарға оралу',
    mentor: 'Тәлімгер',
    taskNumber: (n, total) => `Тапсырма ${n} / ${total}`,
    chooseTask: 'Тапсырманы таңда',
    startHint: 'Неден бастайтыныңды жаз. Қателесуден қорықпа, тәлімгер сұрақпен түзетеді.',
    placeholder: 'Ойың немесе жауабың…',
    send: 'Жіберу',
    giveUp: 'Талдауды көрсету',
    confirmGiveUp: 'Толық шешім ашылсын ба? Одан кейін өзің талдау қызық болмайды.',
    solution: 'Толық шешім',
    solved: 'Тапсырма шешілді',
    solvedHint: 'Жауапқа өзің жеттің, талдаудың мәні осында.',
    nextTask: 'Келесі тапсырма',
    restart: 'Талдауды қайта бастау',
    networkError: 'Тәлімгермен байланысу мүмкін болмады. Қайта көр.',
    yourTurn: 'Тәлімгер сенің жауабыңды күтіп тұр',
    difficulty: { 1: 'Бастапқы', 2: 'Жеңіл', 3: 'Орташа', 4: 'Күрделі', 5: 'Олимпиадалық' },
  },
  en: {
    notFound: 'Material not found',
    notFoundText: 'The link may be outdated.',
    back: 'Back to materials',
    mentor: 'Mentor',
    taskNumber: (n, total) => `Task ${n} of ${total}`,
    chooseTask: 'Pick a task',
    startHint: 'Write where you would start. Mistakes are fine, the mentor answers with a question.',
    placeholder: 'Your thinking or answer…',
    send: 'Send',
    giveUp: 'Show the solution',
    confirmGiveUp: 'Reveal the full solution? Working it out yourself stops being interesting after this.',
    solution: 'Full solution',
    solved: 'Solved',
    solvedHint: 'You reached the answer yourself, and that was the whole point.',
    nextTask: 'Next task',
    restart: 'Start over',
    networkError: 'Could not reach the mentor. Try again.',
    yourTurn: 'The mentor is waiting for your move',
    difficulty: { 1: 'Basic', 2: 'Easy', 3: 'Medium', 4: 'Advanced', 5: 'Olympiad' },
  },
};

export function CommunityMaterialClient({ materialId }: { materialId: string }) {
  const { state, hydrated } = useStore();
  const t = TEXT[state.language];

  const [material, setMaterial] = useState<CommunityMaterial | null | undefined>(undefined);
  const [aiScale, setAiScale] = useAiTextScale();
  const [taskIndex, setTaskIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [solved, setSolved] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('archive_materials')
      .select('id, title, category, source, difficulty, tasks')
      .eq('id', materialId)
      .maybeSingle()
      .then(({ data }) => setMaterial((data as CommunityMaterial | null) ?? null));
  }, [materialId]);

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, loading]);

  const task = material?.tasks[taskIndex];

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
      taskId: `db:${materialId}:${task.id}`,
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
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

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

  if (!hydrated || material === undefined) {
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
          title={t.notFound}
          description={t.notFoundText}
          action={<ButtonLink href="/archive/community">{t.back}</ButtonLink>}
        />
      </div>
    );
  }

  const meta = ARCHIVE_CATEGORIES.find((item) => item.id === material.category);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">
          {meta && <Icon name={meta.icon} size={14} />}
          {meta?.title[state.language]}
        </Badge>
        <Badge>{t.difficulty[material.difficulty]}</Badge>
      </div>

      <h1 className="mt-2 text-xl font-medium text-ink-900 sm:text-3xl">{material.title}</h1>
      <p className="mt-2 text-xs text-ink-400">{material.source}</p>

      <div className="mt-10">
        <p className="text-[13px] font-medium text-ink-500">{t.chooseTask}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {material.tasks.map((item, index) => (
            <button
              key={item.id}
              onClick={() => openTask(index)}
              className={`h-11 w-11 rounded-xl border-2 font-medium tabular-nums transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
                index === taskIndex
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 border-y border-ink-200 py-6">
        <p className="text-xs font-medium tabular-nums tracking-wide text-ink-500">
          {t.taskNumber(taskIndex + 1, material.tasks.length)}
        </p>
        <p className="mt-2 whitespace-pre-line text-2xl font-medium leading-snug text-ink-900 sm:text-4xl">
          <MathText>{task.prompt}</MathText>
        </p>
      </div>

      <div className="mt-10 space-y-2">
        <div className="rounded-[var(--radius-card)] border border-ink-200 bg-white px-4 py-3">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
            <Icon name="columns" size={14} />
            {t.mentor}
          </p>
          <p className="leading-relaxed text-ink-700"><MathText>{task.opening}</MathText></p>
          {/* Кегль разбора настраивается там же, где его читают. */}
          <div className="mt-3">
            <AiTextScaleControl scale={aiScale} onChange={setAiScale} />
          </div>
        </div>

        {messages.map((message, index) => (
          <div
            key={`${message.at}-${index}`}
            className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
          >
            {message.role === 'user' ? (
              <p className="max-w-[85%] whitespace-pre-line rounded-[var(--radius-card)] bg-brand-500 px-4 py-3 text-white">
                {message.content}
              </p>
            ) : (
              <div className="max-w-[92%] rounded-[var(--radius-card)] border border-ink-200 bg-white px-4 py-3">
                <div className="mb-2">
                  <AiBadge live={message.live ?? false} />
                </div>
                {/* Разбор наставника рисуется структурой, а не сплошным
                    текстом: см. src/components/AiAnswer.tsx */}
                <AiAnswer text={message.content} scale={aiScale} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="max-w-[92%] space-y-2 rounded-[var(--radius-card)] border border-ink-200 bg-white px-4 py-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-8/12" />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {solved && (
        <div className="mt-10">
          <RailRow tone="success">
            <p className="flex items-center gap-2 font-medium text-success-700">
              <Icon name="check" size={18} />
              {t.solved}
            </p>
            <p className="mt-2 text-sm text-ink-500">{t.solvedHint}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {taskIndex + 1 < material.tasks.length && (
                <Button onClick={() => openTask(taskIndex + 1)}>{t.nextTask}</Button>
              )}
              <Button variant="secondary" onClick={() => openTask(taskIndex)}>
                {t.restart}
              </Button>
            </div>
          </RailRow>
        </div>
      )}

      {!solved && (
        <div className="mt-10">
          <p className="mb-2 text-sm text-ink-400">{messages.length === 0 ? t.startHint : t.yourTurn}</p>
          <div className="flex items-end gap-2 rounded-[var(--radius-card)] border border-ink-200 bg-white p-2 shadow-[var(--shadow-rest)] transition-all duration-150 focus-within:border-brand-300 focus-within:shadow-[var(--shadow-lift)]">
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

      <div className="mt-4">
        {showSolution ? (
          <Panel className="p-5">
            <h2 className="text-lg font-medium text-ink-900">{t.solution}</h2>
            <p className="mt-2 leading-relaxed text-ink-700"><MathText>{task.explanation}</MathText></p>
          </Panel>
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
