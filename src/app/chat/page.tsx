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
import { useStore } from '@/components/StoreProvider';
import { AiBadge } from '@/components/AiBadge';
import { Button, ButtonLink, Card, EmptyState, Skeleton } from '@/components/ui';

export default function ChatPage() {
  const { state, hydrated, appendChat, clearChat } = useStore();
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
      const data: ChatResponse = await response.json();
      appendChat({ role: 'assistant', content: data.text, at: new Date().toISOString(), live: data.live });
    } catch {
      appendChat({
        role: 'assistant',
        content: 'Не получилось связаться с сервером. Проверь интернет и спроси ещё раз.',
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
          icon="💬"
          title="Сначала создайте профиль"
          description="Наставник отвечает с учётом класса и цели — без профиля он не знает, на каком уровне объяснять."
          action={<ButtonLink href="/onboarding">Создать профиль</ButtonLink>}
        />
      </div>
    );
  }

  // Готовые вопросы для пустого экрана: с них проще начать, чем с чистого поля.
  const suggestions = [
    'Объясни теорему Виета простыми словами',
    'Как понять, когда применять закон Ома?',
    'Составь план подготовки к ЕНТ на неделю',
    'Почему я всё время путаю формулы сокращённого умножения?',
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">AI-наставник</h1>
          <p className="mt-1 text-sm text-ink-500">Спроси что угодно по школьной программе.</p>
        </div>
        {state.chat.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.confirm('Очистить всю историю разговора?')) clearChat();
            }}
          >
            Очистить историю
          </Button>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {state.chat.length === 0 && !loading && (
          <Card>
            <p className="text-ink-700">
              Привет, {profile.name.split(' ')[0]}. Я помогу разобраться с темой, а не решу задание
              за тебя. С чего начнём?
            </p>
            <div className="mt-4 grid gap-2">
              {suggestions.map((item) => (
                <button
                  key={item}
                  onClick={() => send(item)}
                  className="rounded-xl border border-ink-200 p-3 text-left text-sm text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
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
        <div className="flex items-end gap-2 rounded-2xl border border-ink-200 bg-white p-2 shadow-sm">
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
            placeholder="Напиши свой вопрос…"
            className="max-h-32 flex-1 resize-none px-3 py-2.5 outline-none disabled:bg-white"
          />
          <Button onClick={() => send(question)} disabled={loading || question.trim() === ''}>
            Отправить
          </Button>
        </div>
      </div>
    </div>
  );
}
