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
import { emptyState, loadState, saveState, clearState, createId } from '@/lib/storage';
import { applyAttemptToProgress, nextDifficulty, pointsForAttempt } from '@/lib/personalization';
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
  addCustomTopic: (topic: Topic) => void;
  removeCustomTopic: (topicId: string) => void;
  cachePlan: (plan: CachedPlan) => void;
  appendChat: (message: ChatMessage) => void;
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
      const withAttempt: AppState = {
        ...previous,
        attempts: [...previous.attempts, full],
        topicProgress: applyAttemptToProgress(previous.topicProgress, full, topicTaskCount),
        points: previous.points + pointsForAttempt(full.correct, full.difficulty),
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

  const clearChat = useCallback(() => {
    setState((previous) => ({ ...previous, chat: [] }));
  }, []);

  const resetAll = useCallback(() => {
    clearState();
    setState(emptyState());
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
      addCustomTopic,
      removeCustomTopic,
      cachePlan,
      appendChat,
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
      addCustomTopic,
      removeCustomTopic,
      cachePlan,
      appendChat,
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
