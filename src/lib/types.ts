/**
 * Доменные типы Tanym.
 *
 * Здесь описан «словарь» всего приложения: из чего состоит учебный контент
 * (предметы → навыки → темы → задания) и что мы храним про ученика
 * (профиль, диагностика, попытки, прогресс).
 *
 * Файл намеренно не содержит логики — только типы, чтобы его можно было
 * импортировать и на сервере (API-роуты), и на клиенте (страницы).
 */

import type { Listing } from './listings';
import type { IconName } from '@/components/Icon';

/** Язык интерфейса. Объявлен здесь, а не в i18n.ts, чтобы не было кольца импортов. */
export type Language = 'ru' | 'kk' | 'en';

/** Классы, для которых существует контент (кейс хакатона: 7–12 классы). */
export type Grade = 7 | 8 | 9 | 10 | 11 | 12;

export const GRADES: Grade[] = [7, 8, 9, 10, 11, 12];

/**
 * Цель обучения, которую ученик выбирает при онбординге.
 *
 * Список намеренно кончается на 'custom'. Четырёх готовых вариантов не
 * хватало: школьник, который готовится к ТЖБ или поступает в НИШ, не
 * узнавал себя ни в одном и выбирал «догнать программу» — а движок
 * получал неверное представление о том, зачем человек пришёл. Своя
 * формулировка закрывает хвост, который перечислением не покрыть.
 */
export type LearningGoal =
  | 'ent'
  | 'tzhb'
  | 'olympiad'
  | 'sat'
  | 'nis'
  | 'review'
  | 'catchup'
  | 'interest'
  | 'custom';

export const LEARNING_GOALS: { id: LearningGoal; title: string; description: string; icon: IconName }[] = [
  {
    id: 'ent',
    title: 'Подготовка к ЕНТ',
    description: 'Системно закрыть программу и набрать максимум баллов на тестировании',
    icon: 'cap',
  },
  {
    id: 'olympiad',
    title: 'Олимпиада',
    description: 'Задачи повышенной сложности и нестандартные методы решения',
    icon: 'medal',
  },
  {
    id: 'review',
    title: 'Повторение темы',
    description: 'Освежить конкретный раздел перед контрольной или зачётом',
    icon: 'target',
  },
  {
    id: 'catchup',
    title: 'Догнать программу',
    description: 'Закрыть пробелы по темам, которые остались непонятыми',
    icon: 'steps',
  },
  {
    id: 'tzhb',
    title: 'ТЖБ и БЖБ',
    description: 'Подготовиться к суммативным работам за раздел и за четверть',
    icon: 'clipboard',
  },
  {
    id: 'sat',
    title: 'Подготовка к SAT',
    description: 'Разделы школьной программы, на которые опирается экзамен',
    icon: 'globe',
  },
  {
    id: 'nis',
    title: 'Поступление в НИШ или БИЛ',
    description: 'Отбор в специализированную школу: задачи выше школьного уровня',
    icon: 'school',
  },
  {
    id: 'interest',
    title: 'Для себя',
    description: 'Разобраться в предмете без экзамена и срока — из интереса',
    icon: 'sparkles',
  },
  {
    id: 'custom',
    title: 'Своя цель',
    description: 'Опишите своими словами, к чему готовитесь',
    icon: 'pencil',
  },
];

/** Ограничение длины своей цели: она уходит в промпт наставника. */
export const CUSTOM_GOAL_MAX = 120;

/**
 * Причина, по которой тема попала в план. Числа — часть причины, поэтому
 * едут вместе с кодом, а не подставляются в готовую фразу.
 */
export type TopicReason =
  | { kind: 'weak'; percent: number }
  | { kind: 'growing'; percent: number }
  | { kind: 'mastered'; percent: number }
  | { kind: 'started' }
  | { kind: 'prereq-missing' }
  | { kind: 'prereq-done' }
  | { kind: 'fits-goal'; goal: LearningGoal };

/** Уровень сложности задания и темы: от 1 (базовый) до 5 (олимпиадный). */
export type Difficulty = 1 | 2 | 3 | 4 | 5;

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: 'Базовый',
  2: 'Простой',
  3: 'Средний',
  4: 'Продвинутый',
  5: 'Олимпиадный',
};

/* ------------------------------------------------------------------ */
/*  Учебный контент                                                    */
/* ------------------------------------------------------------------ */

export type SubjectId = string;
export type SkillId = string;
export type TopicId = string;
export type TaskId = string;

/**
 * Навык — это атомарная единица знания внутри предмета
 * («решение квадратных уравнений», «закон Ома»).
 *
 * Именно по навыкам, а не по темам, считается уровень ученика:
 * одна тема прокачивает несколько навыков, и наоборот.
 */
export interface Skill {
  id: SkillId;
  subjectId: SubjectId;
  title: string;
  /** Классы, в которых этот навык проходят. Используется для фильтрации по классу ученика. */
  grades: Grade[];
}

/** Тип задания. Держим только два — этого достаточно для честной автопроверки. */
export type TaskKind = 'single' | 'numeric';

export interface Task {
  id: TaskId;
  topicId: TopicId;
  skillId: SkillId;
  difficulty: Difficulty;
  kind: TaskKind;
  /** Условие задания. Может содержать простые формулы в текстовом виде. */
  prompt: string;
  /** Варианты ответа — только для kind === 'single'. */
  options?: string[];
  /** Индекс правильного варианта — только для kind === 'single'. */
  correctIndex?: number;
  /**
   * Правильный ответ — только для kind === 'numeric'.
   * Сравнение идёт по нормализованной строке (см. lib/grading.ts),
   * поэтому «0.5», «0,5» и « 0.50 » считаются одинаковыми.
   */
  correctValue?: string;
  /** Подсказка, которую ученик может открыть до ответа. */
  hint: string;
  /**
   * Эталонное объяснение решения.
   * Используется двумя способами: как запасной вариант, если AI недоступен,
   * и как фактическая опора для AI, чтобы он не выдумывал математику.
   */
  explanation: string;
}

export interface MaterialSection {
  heading: string;
  body: string;
  /** Ключевая формула раздела, если она есть. Выводится отдельным блоком. */
  formula?: string;
}

export interface WorkedExample {
  problem: string;
  solution: string;
}

/** Теоретический материал темы — то, что ученик читает перед заданиями. */
export interface TopicMaterial {
  intro: string;
  sections: MaterialSection[];
  keyPoints: string[];
  examples: WorkedExample[];
}

export interface Topic {
  id: TopicId;
  subjectId: SubjectId;
  title: string;
  summary: string;
  grades: Grade[];
  difficulty: Difficulty;
  /** Навыки, которые прокачивает эта тема. */
  skills: SkillId[];
  /** Темы, которые желательно пройти до этой. Влияет на порядок в рекомендациях. */
  prerequisites: TopicId[];
  estimatedMinutes: number;
  material: TopicMaterial;
  tasks: Task[];
  /** true — тему добавил учитель через панель управления (хранится в localStorage). */
  custom?: boolean;
}

export interface Subject {
  id: SubjectId;
  title: string;
  shortTitle: string;
  description: string;
  /** Имя иконки из набора Icon. */
  icon: IconName;
  /** CSS-переменная акцентного цвета предмета (см. globals.css). */
  accent: string;
  grades: Grade[];
  skills: Skill[];
  topics: Topic[];
  /**
   * Диагностический тест: 8 заданий, покрывающих разные навыки и уровни сложности.
   * По его результатам строится стартовая карта уровня ученика.
   */
  diagnostic: Task[];
}

/* ------------------------------------------------------------------ */
/*  Пользователь и его состояние                                       */
/* ------------------------------------------------------------------ */

export type Role = 'student' | 'teacher';

export interface Profile {
  id: string;
  name: string;
  role: Role;
  grade: Grade;
  /** Предметы, выбранные учеником при онбординге. */
  subjectIds: SubjectId[];
  goal: LearningGoal;
  /** Формулировка своими словами. Заполняется, только когда goal === 'custom'. */
  goalCustom?: string;
  /** ISO-дата цели (например, дата ЕНТ). Нужна для обратного отсчёта в кабинете. */
  targetDate?: string;
  createdAt: string;
  /** Только для роли teacher: класс, который он ведёт. */
  className?: string;
  avatarPhotoPath?: string | null;
  avatarPhotoUrl?: string | null;
}

export interface DiagnosticAnswer {
  taskId: TaskId;
  skillId: SkillId;
  difficulty: Difficulty;
  correct: boolean;
  answer: string;
}

export interface DiagnosticResult {
  subjectId: SubjectId;
  answers: DiagnosticAnswer[];
  /** Уровень владения каждым проверенным навыком, 0..1. */
  skillMastery: Record<SkillId, number>;
  /** Доля правильных ответов, 0..1. */
  score: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  /** Рекомендованный стартовый уровень сложности заданий. */
  startingDifficulty: Difficulty;
  completedAt: string;
}

export interface TaskAttempt {
  taskId: TaskId;
  topicId: TopicId;
  skillId: SkillId;
  subjectId: SubjectId;
  difficulty: Difficulty;
  correct: boolean;
  answer: string;
  at: string;
}

export interface TopicProgress {
  topicId: TopicId;
  subjectId: SubjectId;
  attempts: number;
  correct: number;
  /** Оценка владения темой 0..1 (экспоненциальное скользящее среднее по попыткам). */
  mastery: number;
  completed: boolean;
  lastAt: string;
}

/** Один разговор с наставником: заголовок для списка и сами реплики. */
export interface Conversation {
  id: string;
  /**
   * Заголовок для боковой полки.
   *
   * Берётся из первого вопроса ученика и потом не меняется: список
   * разговоров должен быть узнаваемым, а не переписываться при каждом
   * новом сообщении.
   */
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  at: string;
  /** false — ответ сгенерирован запасным алгоритмом, а не живой моделью. */
  live?: boolean;
}

/** Кэш сгенерированного AI учебного плана, чтобы не дёргать API на каждый рендер. */
export interface CachedPlan {
  subjectId: SubjectId;
  text: string;
  live: boolean;
  generatedAt: string;
  /** Хэш входных данных: если прогресс изменился — план пересоберётся. */
  signature: string;
}

/** Полное состояние приложения, которое сохраняется в localStorage. */
export interface AppState {
  version: number;
  /** Язык интерфейса и язык, на котором отвечает AI. */
  language: Language;
  profile: Profile | null;
  diagnostics: Record<SubjectId, DiagnosticResult>;
  attempts: TaskAttempt[];
  topicProgress: Record<TopicId, TopicProgress>;
  /** Текущий адаптивный уровень сложности по каждому предмету. */
  difficulty: Record<SubjectId, Difficulty>;
  points: number;
  /** Серия дней подряд с занятиями. Считается по времени Астаны (см. lib/date.ts). */
  streak: {
    current: number;
    longest: number;
    /** Последний день активности в формате «ГГГГ-ММ-ДД», null — занятий ещё не было. */
    lastActiveDate: string | null;
  };
  /** Достижения, поздравление о которых ученик уже видел. */
  seenAchievements: string[];
  /** События афиши, на которые ученик записался. */
  eventRegistrations: string[];
  /** Объявления маркетплейса, размещённые самим пользователем. */
  myListings: Listing[];
  /** Прочитанные объявления администрации — по ним считается счётчик непрочитанного. */
  readAnnouncements: string[];
  /**
   * Скрывать ли имя в школьном лидерборде.
   * Хранится у ученика, а не у школы: это его решение, а не настройка админа.
   */
  leaderboardAnonymous: boolean;
  /** Темы, добавленные учителем через панель управления. */
  customTopics: Topic[];
  plans: Record<SubjectId, CachedPlan>;
  /**
   * Разговоры с наставником.
   *
   * Раньше здесь лежал один плоский список сообщений: начать новую тему
   * можно было только стерев предыдущую. Теперь их несколько, как в
   * привычных чатах с моделью, и каждый живёт своей жизнью.
   */
  conversations: Conversation[];
  /** Открытый разговор. null — ни одного ещё не начато. */
  activeChatId: string | null;
}

/* ------------------------------------------------------------------ */
/*  Результат работы движка персонализации                             */
/* ------------------------------------------------------------------ */

/**
 * Тема с посчитанным приоритетом и — что важнее — с человекочитаемыми
 * причинами, почему она попала в рекомендации. Причины показываются ученику
 * и передаются в AI, чтобы его объяснение опиралось на реальные цифры.
 */
export interface RankedTopic {
  topic: Topic;
  /** Итоговый приоритет, 0..1. Чем выше — тем раньше показываем тему. */
  score: number;
  /** Владение темой на данный момент, 0..1. */
  mastery: number;
  /** Готовность: пройдены ли темы-предпосылки, 0..1. */
  readiness: number;
  /** Причины попадания в список, уже готовые к выводу на экран. */
  /**
   * Причины отбора темы — кодами, а не готовым текстом.
   *
   * Движок раньше собирал их сразу по-русски, и на казахском интерфейсе
   * посреди переведённой страницы висело «Слабое место: тема освоена на
   * 0%». Движок не знает языка и знать не должен: он считает, а
   * формулирует интерфейс (см. reasonText в lib/reasons.ts).
   */
  reasons: TopicReason[];
  status: 'weak' | 'in-progress' | 'mastered' | 'new';
}

export interface SkillMasteryEntry {
  skill: Skill;
  mastery: number;
  attempts: number;
}

/** Ответ любого AI-эндпоинта: текст + честный флаг, живая ли это генерация. */
export interface AiResponse {
  text: string;
  live: boolean;
  model?: string;
  /** Заполняется, когда сработал запасной вариант. */
  fallbackReason?: string;
}
