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
  recordAttempt: (attempt: Omit<TaskAttempt, 'at'>, topicTaskCount: number) => void;
  markAchievementsSeen: (ids: string[]) => void;
  toggleEventRegistration: (eventId: string) => void;
  addListing: (listing: Listing) => void;
  markAnnouncementsRead: (ids: string[]) => void;
  setLeaderboardAnonymous: (anonymous: boolean) => void;
  removeListing: (listingId: string) => void;
  addCustomTopic: (topic: Topic) => void;
  removeCustomTopic: (topicId: string) => void;
  cachePlan: (plan: CachedPlan) => void;
  appendChat: (message: ChatMessage) => void;
  replaceChat: (messages: ChatMessage[]) => void;
  clearChat: () => void;
  resetAll: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState);
  const [hydrated, setHydrated] = useState(false);

  // Первый заход в браузере: поднимаем сохранённое состояние.
  useEffect(() => {
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

  const appendChat = useCallback((message: ChatMessage) => {
    setState((previous) => ({ ...previous, chat: [...previous.chat, message] }));
  }, []);

  /**
   * Подставляет историю целиком.
   *
   * Нужен для чата: переписка теперь хранится на сервере, и при открытии
   * страницы её надо поднять в состояние одним куском, а не по сообщению
   * через appendChat — иначе локальные и серверные реплики задвоятся.
   */
  const replaceChat = useCallback((messages: ChatMessage[]) => {
    setState((previous) => ({ ...previous, chat: messages }));
  }, []);

  const clearChat = useCallback(() => {
    setState((previous) => ({ ...previous, chat: [] }));
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
      recordAttempt,
      markAchievementsSeen,
      toggleEventRegistration,
      addListing,
      removeListing,
      markAnnouncementsRead,
      setLeaderboardAnonymous,
      addCustomTopic,
      removeCustomTopic,
      cachePlan,
      appendChat,
      replaceChat,
      clearChat,
      resetAll,
    }),
    [
      state,
      hydrated,
      setLanguage,
      setProfile,
      updateProfile,
      saveDiagnostic,
      recordAttempt,
      markAchievementsSeen,
      toggleEventRegistration,
      addListing,
      removeListing,
      markAnnouncementsRead,
      setLeaderboardAnonymous,
      addCustomTopic,
      removeCustomTopic,
      cachePlan,
      appendChat,
      replaceChat,
      clearChat,
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
