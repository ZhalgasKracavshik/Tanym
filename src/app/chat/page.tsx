'use client';

/**
 * AI-наставник: свободные вопросы по школьной программе.
 *
 * История разговора хранится в том же localStorage, что и прогресс, поэтому
 * диалог переживает перезагрузку страницы. Модель получает контекст ученика
 * (класс, цель, предмет) — иначе она отвечала бы одинаково семикласснику
 * и выпускнику.
 */

import { useEffect, useRef, useState } from 'react';
import { getSubject } from '@/data';
import type { ChatRequest, ChatResponse } from '@/lib/ai/contracts';
import type { Dict } from '@/lib/i18n';
import { useStore } from '@/components/StoreProvider';
import { AiBadge } from '@/components/AiBadge';
import { Button, ButtonLink, Card, EmptyState, Skeleton } from '@/components/ui';

/** Подписи страницы на трёх языках. Ключи одинаковые — за этим следит TypeScript. */
const TEXT: Dict<{
  title: string;
  subtitle: string;
  noProfileTitle: string;
  noProfileText: string;
  createProfile: string;
  clearHistory: string;
  confirmClear: string;
  greeting: (name: string) => string;
  placeholder: string;
  send: string;
  networkError: string;
  suggestions: string[];
}> = {
  ru: {
    title: 'AI-наставник',
    subtitle: 'Спроси что угодно по школьной программе.',
    noProfileTitle: 'Сначала создайте профиль',
    noProfileText:
      'Наставник отвечает с учётом класса и цели. Без профиля он не знает, на каком уровне объяснять.',
    createProfile: 'Создать профиль',
    clearHistory: 'Очистить историю',
    confirmClear: 'Очистить всю историю разговора?',
    greeting: (name) =>
      `Привет, ${name}. Я помогу разобраться с темой, а не решу задание за тебя. С чего начнём?`,
    placeholder: 'Напиши свой вопрос…',
    send: 'Отправить',
    networkError: 'Не получилось связаться с сервером. Проверь интернет и спроси ещё раз.',
    suggestions: [
      'Объясни теорему Виета простыми словами',
      'Как понять, когда применять закон Ома?',
      'Составь план подготовки к ЕНТ на неделю',
      'Почему я всё время путаю формулы сокращённого умножения?',
    ],
  },
  kk: {
    title: 'AI-тәлімгер',
    subtitle: 'Мектеп бағдарламасы бойынша кез келген нәрсені сұра.',
    noProfileTitle: 'Алдымен профиль құрыңыз',
    noProfileText:
      'Тәлімгер сыныбың мен мақсатыңды ескеріп жауап береді. Профильсіз ол қандай деңгейде түсіндіру керегін білмейді.',
    createProfile: 'Профиль құру',
    clearHistory: 'Тарихты тазалау',
    confirmClear: 'Әңгіме тарихы толығымен тазалансын ба?',
    greeting: (name) =>
      `Сәлем, ${name}. Мен тапсырманы сенің орныңа шешіп бермеймін, тақырыпты түсінуге көмектесемін. Неден бастаймыз?`,
    placeholder: 'Сұрағыңды жаз…',
    send: 'Жіберу',
    networkError: 'Сервермен байланысу мүмкін болмады. Интернетті тексеріп, қайта сұра.',
    suggestions: [
      'Виет теоремасын қарапайым сөзбен түсіндір',
      'Ом заңын қашан қолдану керегін қалай түсінемін?',
      'ҰБТ-ға дайындықтың бір апталық жоспарын құр',
      'Неге мен қысқаша көбейту формулаларын үнемі шатастырамын?',
    ],
  },
  en: {
    title: 'AI mentor',
    subtitle: 'Ask anything from the school curriculum.',
    noProfileTitle: 'Create a profile first',
    noProfileText:
      'The mentor answers based on your grade and goal. Without a profile it cannot tell what level to explain at.',
    createProfile: 'Create profile',
    clearHistory: 'Clear history',
    confirmClear: 'Clear the entire conversation history?',
    greeting: (name) =>
      `Hi, ${name}. I will help you understand the topic rather than solve it for you. Where shall we start?`,
    placeholder: 'Type your question…',
    send: 'Send',
    networkError: 'Could not reach the server. Check your connection and ask again.',
    suggestions: [
      "Explain Vieta's formulas in simple terms",
      "How do I know when to apply Ohm's law?",
      'Make me a one-week study plan for the national exam',
      'Why do I keep mixing up the short multiplication formulas?',
    ],
  },
};

export default function ChatPage() {
  const { state, hydrated, appendChat, clearChat } = useStore();
  const t = TEXT[state.language];
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  // useRef хранит ссылку на элемент разметки — нужен, чтобы прокрутить ленту вниз.
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chat.length, loading]);

  const profile = state.profile;
  const subject = getSubject(profile?.subjectIds[0]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (trimmed === '' || loading) return;

    appendChat({ role: 'user', content: trimmed, at: new Date().toISOString() });
    setQuestion('');
    setLoading(true);

    const body: ChatRequest = {
      question: trimmed,
      language: state.language,
      history: state.chat.slice(-6),
      profile,
      subjectId: subject?.id ?? null,
      topicId: null,
    };

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      // Роуты отвечают {error} с кодом 4xx (например, при срабатывании
      // ограничителя частоты). Без этой проверки такой ответ разбирался бы как
      // обычный результат: поля пришли бы пустыми, и в прогресс ученика ушла бы
      // ложная неверная попытка по заданию, которое сервер даже не проверял.
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data: ChatResponse = await response.json();
      appendChat({ role: 'assistant', content: data.text, at: new Date().toISOString(), live: data.live });
    } catch {
      appendChat({
        role: 'assistant',
        content: t.networkError,
        at: new Date().toISOString(),
        live: false,
      });
    } finally {
      setLoading(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          title={t.noProfileTitle}
          description={t.noProfileText}
          action={<ButtonLink href="/onboarding">{t.createProfile}</ButtonLink>}
        />
      </div>
    );
  }

  // Готовые вопросы для пустого экрана: с них проще начать, чем с чистого поля.
  const suggestions = t.suggestions;

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">{t.title}</h1>
          <p className="mt-2 text-ink-500">{t.subtitle}</p>
        </div>
        {state.chat.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.confirm(t.confirmClear)) clearChat();
            }}
          >
            {t.clearHistory}
          </Button>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {state.chat.length === 0 && !loading && (
          <Card>
            <p className="text-ink-700">{t.greeting(profile.name.split(' ')[0])}</p>
            <div className="mt-6 grid gap-2">
              {suggestions.map((item) => (
                <button
                  key={item}
                  onClick={() => send(item)}
                  className="rounded-xl border border-ink-200 p-3 text-left text-sm text-ink-700 transition-all duration-150 hover:border-brand-300 hover:bg-brand-50 hover:shadow-[var(--shadow-lift)] focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  {item}
                </button>
              ))}
            </div>
          </Card>
        )}

        {state.chat.map((message, index) => (
          <div
            key={`${message.at}-${index}`}
            className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
          >
            {message.role === 'user' ? (
              <p className="max-w-[85%] rounded-2xl bg-brand-500 px-4 py-3 text-white">{message.content}</p>
            ) : (
              <div className="max-w-[90%] rounded-2xl border border-ink-200 bg-white px-4 py-3">
                <div className="mb-2">
                  <AiBadge live={message.live ?? false} />
                </div>
                <p className="whitespace-pre-line leading-relaxed text-ink-700">{message.content}</p>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="max-w-[90%] space-y-2 rounded-2xl border border-ink-200 bg-white px-4 py-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-9/12" />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Поле ввода */}
      <div className="sticky bottom-4 mt-6">
        <div className="flex items-end gap-2 rounded-2xl border border-ink-200 bg-white p-2 shadow-[var(--shadow-rest)] transition-all duration-150 focus-within:border-brand-300 focus-within:shadow-[var(--shadow-lift)]">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              // Enter отправляет, Shift+Enter переносит строку — привычное поведение чатов.
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send(question);
              }
            }}
            rows={1}
            disabled={loading}
            placeholder={t.placeholder}
            className="max-h-32 flex-1 resize-none px-3 py-2.5 outline-none disabled:bg-white"
          />
          <Button onClick={() => send(question)} disabled={loading || question.trim() === ''}>
            {t.send}
          </Button>
        </div>
      </div>
    </div>
  );
}
