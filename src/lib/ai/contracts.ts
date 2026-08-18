/**
 * Контракты запросов к нашим AI-роутам.
 *
 * Один общий файл на клиент и сервер: если поменять поле здесь, TypeScript
 * сразу подсветит оба конца — и страницу, и обработчик. Это дешёвая замена
 * генерации типов из схемы, которой в MVP пока нет.
 */

import type {
  AiResponse,
  ChatMessage,
  DiagnosticResult,
  Language,
  Profile,
  SubjectId,
  Task,
  TaskId,
  TopicId,
} from '../types';

/** Компактное описание темы для запроса плана. Полные данные сервер берёт из реестра. */
export interface RankedTopicPayload {
  topicId: TopicId;
  mastery: number;
  reasons: string[];
}

export interface WeakSkillPayload {
  skillId: string;
  title: string;
  mastery: number;
}

export interface FeedbackRequest {
  taskId: TaskId;
  topicId: TopicId;
  /** Язык, на котором модель должна ответить. */
  language: Language;
  /** Индекс варианта (для single) или введённое значение (для numeric). */
  answer: string;
  profile: Profile | null;
  /** Владение навыком до попытки, 0..1 — считается на клиенте движком персонализации. */
  skillMastery: number;
  /**
   * Задание целиком. Передаётся только для тем, созданных учителем:
   * их нет в реестре на сервере, потому что они живут в localStorage браузера.
   */
  task?: Task;
}

export interface FeedbackResponse extends AiResponse {
  /** Сервер проверяет ответ сам и возвращает вердикт — клиенту нельзя доверять оценку. */
  correct: boolean;
  correctAnswer: string;
}

export interface PlanRequest {
  subjectId: SubjectId;
  language: Language;
  profile: Profile | null;
  diagnostic: DiagnosticResult | null;
  ranked: RankedTopicPayload[];
  weakSkills: WeakSkillPayload[];
  daysLeft: number | null;
}

export type PlanResponse = AiResponse;

export interface ChatRequest {
  question: string;
  language: Language;
  history: ChatMessage[];
  profile: Profile | null;
  subjectId: SubjectId | null;
  topicId: TopicId | null;
}

export type ChatResponse = AiResponse;
