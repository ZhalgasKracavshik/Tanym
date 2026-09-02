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
  /**
   * Нужен ли разбор от модели.
   *
   * По умолчанию нет — и это главное решение здесь. Проверка ответа занимает
   * миллисекунды (сервер сверяет его с эталоном), а разбор от модели — от трёх
   * до десяти секунд. Раньше эти две вещи были склеены в один запрос, поэтому
   * ученик ждал модель даже тогда, когда хотел просто узнать «верно или нет»
   * и идти дальше. Теперь ожидание наступает только там, где за него что-то
   * дают: когда разбор действительно попросили.
   */
  explain?: boolean;
}

/**
 * Ответ проверки.
 *
 * Разбор необязателен, поэтому поля модели помечены как возможные. Разделять
 * это на два разных типа не стоит: вердикт в обоих случаях один и тот же и
 * приходит одним и тем же путём, а `explained` прямо говорит, есть разбор
 * или нет — без догадок по пустой строке.
 */
export interface FeedbackResponse {
  /** Сервер проверяет ответ сам и возвращает вердикт — клиенту нельзя доверять оценку. */
  correct: boolean;
  correctAnswer: string;
  /** Запрашивался ли разбор. При false полей ниже нет. */
  explained: boolean;
  text?: AiResponse['text'];
  live?: AiResponse['live'];
  model?: AiResponse['model'];
  fallbackReason?: AiResponse['fallbackReason'];
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

/* ------------------------------------------------------------------ */
/*  Сократовский диалог по заданиям архива                             */
/* ------------------------------------------------------------------ */

export interface SocraticRequest {
  taskId: string;
  language: Language;
  /** Свободный текст ученика: рассуждение, вопрос или предполагаемый ответ. */
  message: string;
  history: ChatMessage[];
  profile: Profile | null;
}

export interface SocraticResponse extends AiResponse {
  /**
   * Решена ли задача. Значение приходит от детерминированной проверки
   * на сервере, а не от суждения модели.
   */
  solved: boolean;
}
