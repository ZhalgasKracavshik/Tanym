'use client';

/**
 * Единое хранилище состояния ученика на React Context.
 *
 * Почему контекст, а не глобальная библиотека состояния: данных немного,
 * и все они всё равно синхронизируются с одним ключом localStorage.
 * Лишняя зависимость здесь ничего не упрощает.
 *
 * Важная деталь про гидратацию: при рендере на сервере localStorage недоступен,
 * поэтому первый рендер всегда идёт с пустым состоянием, а настоящие данные
 * подставляются в useEffect. Флаг `hydrated` позволяет страницам показать
 * скелет вместо мигающего «нет данных → есть данные».
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { emptyState, loadState, saveState, clearState, createId, STORAGE_KEY } from '@/lib/storage';
import { applyAttemptToProgress, awardsPoints, nextDifficulty, pointsForAttempt } from '@/lib/personalization';
import { almatyDateIso, almatyYesterdayIso } from '@/lib/date';
import type {
  AppState,
  CachedPlan,
  ChatMessage,
  Conversation,
  DiagnosticResult,
  Difficulty,
  Language,
  Profile,
  SubjectId,
  TaskAttempt,
  Topic,
} from '@/lib/types';
import type { Listing } from '@/lib/listings';

interface StoreValue {
  state: AppState;
  hydrated: boolean;
  setLanguage: (language: Language) => void;
  setProfile: (profile: Profile) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  saveDiagnostic: (result: DiagnosticResult) => void;
  /**
   * Подставить диагностики, сохранённые на сервере.
   *
   * Отличается от saveDiagnostic тем, что не затирает более свежую
   * местную: ученик мог пройти диагностику только что, а ответ сервера
   * прийти следом и откатить её.
   */
  hydrateDiagnostics: (results: DiagnosticResult[]) => void;
  recordAttempt: (attempt: Omit<TaskAttempt, 'at'>, topicTaskCount: number) => void;
  markAchievementsSeen: (ids: string[]) => void;
  toggleEventRegistration: (eventId: string) => void;
  addListing: (listing: Listing) => void;
  markAnnouncementsRead: (ids: string[]) => void;
  setLeaderboardAnonymous: (anonymous: boolean) => void;
  removeListing: (listingId: string) => void;
  addCustomTopic: (topic: Topic) => void;
  /**
   * Подставить темы, созданные учителями и лежащие на сервере.
   *
   * Полностью заменяет список, а не дополняет: сервер — источник правды,
   * и тема, удалённая автором, должна исчезнуть, а не остаться жить в
   * браузере ученика навсегда.
   */
  hydrateCustomTopics: (topics: Topic[]) => void;
  /**
   * Восстановить попытки, проверенные сервером.
   *
   * Прогресс по темам пересчитывается из них тем же движком, что и при
   * обычном решении: второе место, где это считается иначе, разошлось бы
   * с первым при первой же правке формулы.
   */
  hydrateAttempts: (attempts: TaskAttempt[]) => void;
  removeCustomTopic: (topicId: string) => void;
  cachePlan: (plan: CachedPlan) => void;
  appendChat: (message: ChatMessage) => void;
  replaceChat: (messages: ChatMessage[]) => void;
  clearChat: () => void;
  startConversation: () => string;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  resetAll: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState);
  const [hydrated, setHydrated] = useState(false);

  /*
    Первый заход в браузере: поднимаем сохранённое состояние.

    Это тот самый случай, когда лишний проход рендера неизбежен по сути
    задачи, а не по недосмотру. На сервере localStorage не существует,
    поэтому первый кадр обязан быть собран из пустого состояния — иначе
    серверная и клиентская разметка разойдутся, и React выбросит ошибку
    гидратации. Прочитать хранилище можно только после неё, то есть
    вторым проходом.

    Правильный инструмент для такого — useSyncExternalStore, но здесь
    состояние не только читается из хранилища, а ещё и меняется двумя
    десятками действий; перевод на внешнее хранилище означал бы
    переписать всё ядро состояния приложения. Такую работу нельзя делать
    ради одного предупреждения линтера накануне защиты, поэтому правило
    отключено осознанно и с объяснением, а не обойдено молча.
  */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loadState());
    setHydrated(true);
  }, []);

  /**
   * Синхронизация между вкладками.
   *
   * Хранилище пишется целиком, поэтому без этого две открытые вкладки затирали
   * работу друг друга: ученик решал задания в одной, нажимал что-нибудь во второй —
   * и та перезаписывала ключ своим устаревшим снимком, унося весь прогресс.
   * Событие storage приходит только в ДРУГИЕ вкладки, поэтому цикла здесь нет.
   */
  useEffect(() => {
    function handleExternalChange(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      setState(loadState());
    }

    window.addEventListener('storage', handleExternalChange);
    return () => window.removeEventListener('storage', handleExternalChange);
  }, []);

  // Любое изменение состояния сразу пишем в localStorage.
  // До окончания гидратации не пишем, иначе затрём сохранённые данные пустыми.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    saveState(state);
  }, [state, hydrated]);

  const setLanguage = useCallback((language: Language) => {
    setState((previous) => ({
      ...previous,
      language,
      // Планы кэшируются вместе с языком: после переключения прежний текст
      // остался бы на старом языке, поэтому кэш сбрасываем.
      plans: {},
    }));
  }, []);

  const setProfile = useCallback((profile: Profile) => {
    setState((previous) => ({ ...previous, profile }));
  }, []);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setState((previous) =>
      previous.profile ? { ...previous, profile: { ...previous.profile, ...patch } } : previous,
    );
  }, []);

  const hydrateDiagnostics = useCallback((results: DiagnosticResult[]) => {
    setState((previous) => {
      const merged = { ...previous.diagnostics };
      const difficulty = { ...previous.difficulty };
      let changed = false;

      for (const incoming of results) {
        const local = merged[incoming.subjectId];
        /*
          Побеждает более поздняя. Сервер — единственная копия, пережившая
          смену устройства, но местная может быть свежее: ученик прошёл
          диагностику пять секунд назад, а ответ сервера пришёл следом со
          вчерашним результатом.
        */
        if (local && Date.parse(local.completedAt) >= Date.parse(incoming.completedAt)) continue;
        merged[incoming.subjectId] = incoming;
        difficulty[incoming.subjectId] = incoming.startingDifficulty;
        changed = true;
      }

      // Без изменений возвращаем прежний объект: новый вызвал бы
      // перерисовку всех подписчиков состояния на пустом месте.
      return changed ? { ...previous, diagnostics: merged, difficulty } : previous;
    });
  }, []);

  const saveDiagnostic = useCallback((result: DiagnosticResult) => {
    setState((previous) => ({
      ...previous,
      diagnostics: { ...previous.diagnostics, [result.subjectId]: result },
      // Диагностика задаёт стартовый уровень сложности для этого предмета.
      difficulty: { ...previous.difficulty, [result.subjectId]: result.startingDifficulty },
      // Планы, построенные до диагностики, устарели.
      plans: Object.fromEntries(
        Object.entries(previous.plans).filter(([subjectId]) => subjectId !== result.subjectId),
      ),
    }));
  }, []);

  const recordAttempt = useCallback((attempt: Omit<TaskAttempt, 'at'>, topicTaskCount: number) => {
    setState((previous) => {
      const full: TaskAttempt = { ...attempt, at: new Date().toISOString() };

      /*
        Баллы — только за первое верное решение задания.

        Раньше начислялось за каждый верный ответ, а задание можно решать
        сколько угодно раз: на экране итога есть «Пройти ещё раз», ответы
        уже известны. Один и тот же круг из шести задач поднимал очки
        бесконечно, и в школьном рейтинге такой ученик обходил тех, кто
        решал честно, — сравнивать баллы становилось бессмысленно.
        Повторный проход остаётся тренировкой: попытка записывается,
        мастерство пересчитывается, очки не капают.
      */
      const earnsPoints = awardsPoints(previous.attempts, full.taskId);

      const withAttempt: AppState = {
        ...previous,
        attempts: [...previous.attempts, full],
        topicProgress: applyAttemptToProgress(previous.topicProgress, full, topicTaskCount),
        points: previous.points + (earnsPoints ? pointsForAttempt(full.correct, full.difficulty) : 0),
        streak: updateStreak(previous.streak),
      };

      // Сложность пересчитываем уже с учётом новой попытки.
      const updatedDifficulty: Difficulty = nextDifficulty(full.subjectId, withAttempt);
      return {
        ...withAttempt,
        difficulty: { ...withAttempt.difficulty, [full.subjectId]: updatedDifficulty },
      };
    });
  }, []);

  const markAchievementsSeen = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setState((previous) => ({
      ...previous,
      // Set убирает повторы, если функция вызвалась дважды подряд.
      seenAchievements: [...new Set([...previous.seenAchievements, ...ids])],
    }));
  }, []);

  const toggleEventRegistration = useCallback((eventId: string) => {
    setState((previous) => ({
      ...previous,
      // Один и тот же обработчик и записывает, и отменяет запись: у кнопки
      // всего два состояния, и отдельное действие для отмены было бы лишним.
      eventRegistrations: previous.eventRegistrations.includes(eventId)
        ? previous.eventRegistrations.filter((id) => id !== eventId)
        : [...previous.eventRegistrations, eventId],
    }));
  }, []);

  const addListing = useCallback((listing: Listing) => {
    setState((previous) => ({ ...previous, myListings: [...previous.myListings, listing] }));
  }, []);

  const removeListing = useCallback((listingId: string) => {
    setState((previous) => ({
      ...previous,
      myListings: previous.myListings.filter((item) => item.id !== listingId),
    }));
  }, []);

  const markAnnouncementsRead = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setState((previous) => ({
      ...previous,
      readAnnouncements: [...new Set([...previous.readAnnouncements, ...ids])],
    }));
  }, []);

  const setLeaderboardAnonymous = useCallback((anonymous: boolean) => {
    setState((previous) => ({ ...previous, leaderboardAnonymous: anonymous }));
  }, []);

  const hydrateAttempts = useCallback((incoming: TaskAttempt[]) => {
    setState((previous) => {
      /*
        Местные попытки главнее по количеству: если в браузере их уже
        столько же или больше, значит ученик работает именно здесь и
        подставлять серверную копию нечего. Иначе пришедший ответ
        откатил бы задание, решённое секунду назад.
      */
      if (previous.attempts.length >= incoming.length) return previous;

      let topicProgress: AppState['topicProgress'] = {};
      /*
        Очки пересчитываются здесь же, тем же правилом, что и при обычном
        решении: сложность × 10 и только за ПЕРВОЕ верное решение задания.

        Без этого восстановление было половинчатым: прогресс по темам
        возвращался, а очки оставались нулевыми. Ученик видел в кабинете
        ноль, а в рейтинге двадцать — одно и то же число из двух разных
        источников, и оба на экране.
      */
      let points = 0;
      const seen: TaskAttempt[] = [];
      for (const attempt of incoming) {
        // Число заданий темы влияет только на признак «тема закрыта»,
        // и при восстановлении оно неизвестно: берём безопасный предел.
        topicProgress = applyAttemptToProgress(topicProgress, attempt, Number.MAX_SAFE_INTEGER);
        if (awardsPoints(seen, attempt.taskId)) {
          points += pointsForAttempt(attempt.correct, attempt.difficulty);
        }
        seen.push(attempt);
      }

      return { ...previous, attempts: incoming, topicProgress, points };
    });
  }, []);

  const hydrateCustomTopics = useCallback((topics: Topic[]) => {
    setState((previous) => {
      const same =
        previous.customTopics.length === topics.length &&
        previous.customTopics.every((topic, i) => topic.id === topics[i]?.id);
      // Тот же список — тот же объект: иначе каждая загрузка вызывала бы
      // перерисовку плана и кабинета без единого изменения.
      return same ? previous : { ...previous, customTopics: topics };
    });
  }, []);

  const addCustomTopic = useCallback((topic: Topic) => {
    setState((previous) => ({ ...previous, customTopics: [...previous.customTopics, topic] }));
  }, []);

  const removeCustomTopic = useCallback((topicId: string) => {
    setState((previous) => ({
      ...previous,
      customTopics: previous.customTopics.filter((topic) => topic.id !== topicId),
    }));
  }, []);

  const cachePlan = useCallback((plan: CachedPlan) => {
    setState((previous) => ({ ...previous, plans: { ...previous.plans, [plan.subjectId]: plan } }));
  }, []);

  /*
    Разговоры наставника.

    Все действия правят состояние функцией от предыдущего значения: ответ
    модели приходит асинхронно, и к этому моменту ученик мог успеть
    переключить разговор или начать новый.
  */

  /** Заголовок полки — первый вопрос ученика, обрезанный до строки. */
  const conversationTitle = (text: string) => {
    const clean = text.trim().replace(/\s+/g, ' ');
    return clean.length > 60 ? `${clean.slice(0, 60)}…` : clean || 'Новый разговор';
  };

  const startConversation = useCallback((): string => {
    const id = createId('chat');
    const now = new Date().toISOString();
    setState((previous) => ({
      ...previous,
      activeChatId: id,
      conversations: [
        { id, title: 'Новый разговор', messages: [], createdAt: now, updatedAt: now },
        ...previous.conversations,
      ],
    }));
    return id;
  }, []);

  const selectConversation = useCallback((id: string) => {
    setState((previous) => ({ ...previous, activeChatId: id }));
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setState((previous) => {
      const conversations = previous.conversations.filter((item) => item.id !== id);
      return {
        ...previous,
        conversations,
        /* Удалили открытый разговор — открываем ближайший, а не пустоту. */
        activeChatId: previous.activeChatId === id ? (conversations[0]?.id ?? null) : previous.activeChatId,
      };
    });
  }, []);

  /**
   * Добавляет реплику в открытый разговор.
   *
   * Если открытого нет, разговор заводится здесь же: ученик просто пишет
   * вопрос, и требовать от него сначала нажать «Новый разговор» незачем.
   */
  const appendChat = useCallback((message: ChatMessage) => {
    setState((previous) => {
      const now = new Date().toISOString();
      const activeId = previous.activeChatId ?? createId('chat');
      const exists = previous.conversations.some((item) => item.id === activeId);

      const base: Conversation[] = exists
        ? previous.conversations
        : [{ id: activeId, title: 'Новый разговор', messages: [], createdAt: now, updatedAt: now }, ...previous.conversations];

      return {
        ...previous,
        activeChatId: activeId,
        conversations: base.map((item) => {
          if (item.id !== activeId) return item;
          const messages = [...item.messages, message];
          /* Заголовок ставится один раз, по первому вопросу ученика. */
          const needsTitle = item.messages.length === 0 && message.role === 'user';
          return {
            ...item,
            title: needsTitle ? conversationTitle(message.content) : item.title,
            messages,
            updatedAt: now,
          };
        }),
      };
    });
  }, []);

  /**
   * Подставляет историю открытого разговора целиком.
   *
   * Нужен, когда переписку поднимают одним куском, а не по сообщению
   * через appendChat — иначе локальные и серверные реплики задвоятся.
   */
  const replaceChat = useCallback((messages: ChatMessage[]) => {
    setState((previous) => ({
      ...previous,
      conversations: previous.conversations.map((item) =>
        item.id === previous.activeChatId
          ? { ...item, messages, updatedAt: new Date().toISOString() }
          : item,
      ),
    }));
  }, []);

  /** Очищает реплики открытого разговора, не удаляя сам разговор. */
  const clearChat = useCallback(() => {
    setState((previous) => ({
      ...previous,
      conversations: previous.conversations.map((item) =>
        item.id === previous.activeChatId ? { ...item, messages: [] } : item,
      ),
    }));
  }, []);

  const resetAll = useCallback(() => {
    clearState();
    // Язык — не часть прогресса. Кнопка обещает удалить профиль и результаты,
    // а не выкидывать ученика обратно на русский интерфейс.
    setState((previous) => ({ ...emptyState(), language: previous.language }));
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      state,
      hydrated,
      setLanguage,
      setProfile,
      updateProfile,
      saveDiagnostic,
      hydrateDiagnostics,
      recordAttempt,
      markAchievementsSeen,
      toggleEventRegistration,
      addListing,
      removeListing,
      markAnnouncementsRead,
      setLeaderboardAnonymous,
      addCustomTopic,
      hydrateCustomTopics,
      hydrateAttempts,
      removeCustomTopic,
      cachePlan,
      appendChat,
      replaceChat,
      clearChat,
      startConversation,
      selectConversation,
      deleteConversation,
      resetAll,
    }),
    [
      state,
      hydrated,
      setLanguage,
      setProfile,
      updateProfile,
      saveDiagnostic,
      hydrateDiagnostics,
      recordAttempt,
      markAchievementsSeen,
      toggleEventRegistration,
      addListing,
      removeListing,
      markAnnouncementsRead,
      setLeaderboardAnonymous,
      addCustomTopic,
      hydrateCustomTopics,
      hydrateAttempts,
      removeCustomTopic,
      cachePlan,
      appendChat,
      replaceChat,
      clearChat,
      startConversation,
      selectConversation,
      deleteConversation,
      resetAll,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/**
 * Обновляет серию занятий при активности.
 *
 * Три случая: занимались сегодня повторно — ничего не меняем; занимались вчера —
 * серия продолжается; был пропуск — серия начинается заново с единицы.
 * Даты считаются по Астане, иначе занятие в 23:30 и в 00:30 попадали бы
 * в разные «дни» по UTC и ломали бы подсчёт.
 */
function updateStreak(previous: AppState['streak']): AppState['streak'] {
  const today = almatyDateIso();
  if (previous.lastActiveDate === today) return previous;

  const continued = previous.lastActiveDate === almatyYesterdayIso();
  const current = continued ? previous.current + 1 : 1;

  return {
    current,
    longest: Math.max(previous.longest, current),
    lastActiveDate: today,
  };
}

/** Доступ к хранилищу. Бросает понятную ошибку, если компонент вне провайдера. */
export function useStore(): StoreValue {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore можно вызывать только внутри <StoreProvider>');
  }
  return context;
}

export { createId };

/** Удобный доступ к текущему предмету ученика (первый выбранный). */
export function usePrimarySubjectId(): SubjectId | null {
  const { state } = useStore();
  return state.profile?.subjectIds[0] ?? null;
}
