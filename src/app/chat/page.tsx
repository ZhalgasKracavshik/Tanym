'use client';

/**
 * AI-наставник: свободные вопросы по школьной программе.
 *
 * История разговора хранится в Supabase и подтягивается при открытии:
 * раньше она лежала в localStorage и терялась при смене браузера, хотя
 * вопросы ученик задаёт с любого устройства одни и те же. Локальное
 * состояние осталось живым представлением — экран рисуется мгновенно,
 * запись в базу идёт фоном.
 *
 * Модель получает контекст ученика (класс, цель, предмет) — иначе она
 * отвечала бы одинаково семикласснику и выпускнику.
 */

import { useEffect, useRef, useState } from 'react';
import { getSubject } from '@/data';
import type { ChatRequest, ChatResponse } from '@/lib/ai/contracts';
import type { Dict } from '@/lib/i18n';
import { useStore } from '@/components/StoreProvider';
import { useEffectiveProfile } from '@/lib/useEffectiveProfile';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { StudentOnlyNotice } from '@/components/StudentOnlyNotice';
import { useChatHistory } from '@/lib/supabase/chat';
import { AiBadge } from '@/components/AiBadge';
import { Icon } from '@/components/Icon';
import { PressButton } from '@/components/motion';
import { Button, ButtonLink, Card, EmptyState, Kicker, Skeleton } from '@/components/ui';
import { VintageKeyboard } from '@/components/ui/vintage-keyboard';

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
  const { state, hydrated, appendChat, clearChat, replaceChat } = useStore();
  const { profile: schoolProfile } = useSchoolAuth();
  const { history, historyFor, saveMessage, clearHistory } = useChatHistory(schoolProfile?.id ?? null);
  const t = TEXT[state.language];
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);

  /*
    Переливаем серверную историю в локальное состояние ровно один раз
    за загрузку страницы. Флаг нужен, чтобы этот эффект не затирал
    сообщения, отправленные уже после загрузки: history из хука
    остаётся снимком на момент открытия.
  */
  /*
    Историю подставляем один раз — и только ту, что принадлежит текущему
    ученику.

    Раньше флаг взводился по первому же значению. Но пока профиль не
    подгрузился, хук отдавал пустой массив, флаг вставал на нём, и
    настоящая переписка, приходившая следом, на экран уже не попадала:
    в базе сообщения были, на экране — пусто.
  */
  const appliedFor = useRef<string | null>(null);
  useEffect(() => {
    if (history === null || historyFor === null) return;
    if (appliedFor.current === historyFor) return;
    appliedFor.current = historyFor;
    if (history.length > 0) replaceChat(history);
  }, [history, historyFor, replaceChat]);

  // useRef хранит ссылку на элемент разметки — нужен, чтобы прокрутить ленту вниз.
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chat.length, loading]);

  /*
    Личность берём из школьного аккаунта, а не из локального профиля.
    Раньше проверялся state.profile, и вошедшему ученику, который ещё
    не проходил онбординг, наставник отвечал «сначала создайте профиль» —
    хотя аккаунт у него есть и имя известно.

    Учебный контекст (предметы, цель) по-прежнему может быть пустым:
    тогда модель просто получит меньше подробностей, а не откажет.
  */
  const profile = useEffectiveProfile();
  const displayName = schoolProfile?.name ?? profile?.name ?? '';
  const subjectIds = profile?.subjectIds ?? [];
  const subject = getSubject(subjectIds[0]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (trimmed === '' || loading) return;

    const userMessage = { role: 'user' as const, content: trimmed, at: new Date().toISOString() };
    appendChat(userMessage);
    saveMessage(userMessage);
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
      const reply = {
        role: 'assistant' as const,
        content: data.text,
        at: new Date().toISOString(),
        live: data.live,
      };
      appendChat(reply);
      saveMessage(reply);
    } catch {
      /*
        Сетевую ошибку показываем, но в базу не пишем: это сообщение
        про сбой связи, а не часть разговора — после перезагрузки видеть
        его в истории бессмысленно.
      */
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

  /*
    Наставник отвечает по классу и цели ученика — учителю он не адресован,
    и просить его «создать профиль» бессмысленно: анкеты у роли нет.
  */
  if (schoolProfile && schoolProfile.role !== 'student') {
    return <StudentOnlyNotice role={schoolProfile.role} />;
  }

  if (!schoolProfile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          title={t.noProfileTitle}
          description={t.noProfileText}
          action={<ButtonLink href="/login">{t.createProfile}</ButtonLink>}
        />
      </div>
    );
  }

  // Готовые вопросы для пустого экрана: с них проще начать, чем с чистого поля.
  const suggestions = t.suggestions;

  return (
    <div className="relative isolate min-h-[calc(100vh-3.5rem)]">
      {/*
        Тёплое свечение за диалогом — то же, что на первом экране лендинга.
        Разговор с наставником должен ощущаться отдельным местом, а не
        очередной страницей со списком. Пятно уводится под контент
        и не перехватывает клики.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] opacity-70 blur-3xl"
        style={{
          background:
            'radial-gradient(45% 50% at 50% 25%, rgb(229 117 69 / 0.22) 0%, rgb(253 243 238 / 0.5) 45%, transparent 75%)',
        }}
      />

      <div className="mx-auto flex max-w-3xl flex-col px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {/* Микроподпись над заголовком: соседние по навигации страницы
              не должны открываться одинаково, иначе продукт выглядит
              собранным по одному шаблону. */}
          <Kicker>{t.subtitle}</Kicker>
          <h1 className="mt-2 text-3xl font-semibold text-ink-900 sm:text-4xl">{t.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <Button
              variant={showKeyboard ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowKeyboard((prev) => !prev)}
              className="flex items-center gap-1.5"
            >
              <Icon name="keyboard" size={16} />
              <span>{showKeyboard ? 'Скрыть клавиатуру' : 'Ретро-клавиатура'}</span>
            </Button>
          </div>
          {state.chat.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.confirm(t.confirmClear)) {
                  clearChat();
                  clearHistory();
                }
              }}
            >
              {t.clearHistory}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {state.chat.length === 0 && !loading && (
          <Card>
            <p className="text-ink-700">{t.greeting(displayName.split(' ')[0])}</p>
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

      {/*
        Поле ввода: плавающая панель со скруглением до предела.
        Держится над нижней навигацией телефона (bottom-24), на десктопе
        опускается ниже — панели там нет.
      */}
      <div className="sticky bottom-24 z-10 mt-8 md:bottom-6">
        <div className="flex items-end gap-2 rounded-[var(--radius-card)] border border-white/10 p-2.5 shadow-[var(--shadow-float)] transition-all duration-200 focus-within:border-white/25" style={{ background: 'var(--gradient-ink)' }}>
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
            /*
              outline-none — обычный класс, без !important. Раньше глобальный
              :focus-visible в globals.css перебивал его из-за равной
              специфичности и более позднего места в файле; теперь то
              правило обёрнуто в :where() и специфичности не имеет вовсе,
              так что здесь достаточно обычного класса, как и должно быть.
            */
            className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2.5 text-white outline-none placeholder:text-white/40"
          />
          <PressButton
            onClick={() => send(question)}
            disabled={loading || question.trim() === ''}
            aria-label={t.send}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-white shadow-[var(--shadow-glow)] transition-opacity disabled:opacity-40 disabled:shadow-none"
            style={{ background: 'var(--gradient-brand)' }}
          >
            <Icon name="arrowRight" size={19} />
          </PressButton>
        </div>
      </div>

      {/* Винтажная ретро-клавиатура — только для ПК/десктопа */}
      {showKeyboard && (
        <div className="hidden md:block mt-4 mb-2 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="relative overflow-hidden rounded-2xl border border-amber-900/20 bg-[#fbf8f3] p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between px-2 text-xs">
              <span className="font-bold flex items-center gap-1.5 text-amber-950">
                <Icon name="keyboard" size={16} className="text-amber-800" />
                Тактильная ретро-клавиатура со звуком (нажимайте клавиши на компьютере или кликайте)
              </span>
              <button
                type="button"
                onClick={() => setShowKeyboard(false)}
                className="rounded px-2 py-0.5 text-ink-500 hover:bg-black/5 hover:text-ink-800 transition-colors font-semibold"
              >
                ✕ Скрыть
              </button>
            </div>
            <VintageKeyboard />
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
