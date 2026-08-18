/**
 * Движок персонализации Tanym.
 *
 * Это «мозг» продукта и он намеренно сделан прозрачным, а не чёрным ящиком:
 * каждая рекомендация возвращает не только число-приоритет, но и список причин
 * («слабое место: 32%», «нужно для цели ЕНТ»). Причины показываются ученику
 * и передаются в языковую модель как факты, на которые она обязана опираться.
 *
 * Разделение ответственности:
 *   - этот файл    → считает, ЧТО рекомендовать (детерминированно, без сети);
 *   - lib/ai/*     → объясняет человеческим языком, ПОЧЕМУ (языковая модель).
 *
 * Все функции чистые: на вход состояние, на выход результат. Никакого React,
 * никакого localStorage — поэтому их легко проверять и объяснять.
 */

import type {
  AppState,
  Difficulty,
  Grade,
  LearningGoal,
  Profile,
  RankedTopic,
  Skill,
  SkillId,
  SkillMasteryEntry,
  Subject,
  Task,
  TaskAttempt,
  Topic,
  TopicId,
} from './types';

/* ------------------------------------------------------------------ */
/*  Настройки модели. Вынесены наверх, чтобы их можно было объяснить.  */
/* ------------------------------------------------------------------ */

/** Насколько сильно каждая новая попытка сдвигает оценку навыка (0..1). */
const LEARNING_RATE = 0.35;

/** Порог, начиная с которого навык считается освоенным. */
export const MASTERY_THRESHOLD = 0.8;

/** Порог, ниже которого навык попадает в «слабые места». */
export const WEAKNESS_THRESHOLD = 0.5;

/** Сколько последних попыток учитывает адаптация сложности. */
const ADAPTIVE_WINDOW = 4;

/** Веса слагаемых итогового приоритета темы. В сумме дают 1. */
const WEIGHTS = {
  gap: 0.45, // насколько тема «провисает»
  readiness: 0.2, // готов ли ученик к ней по предпосылкам
  goalFit: 0.2, // насколько тема соответствует цели обучения
  momentum: 0.15, // начатое лучше добить, чем бросить
};

/* ------------------------------------------------------------------ */
/*  Оценка владения навыками                                           */
/* ------------------------------------------------------------------ */

/**
 * Ценность одной попытки для оценки навыка.
 *
 * Идея: правильный ответ на сложное задание — сильное доказательство знания,
 * а ошибка в олимпиадной задаче почти не должна «ронять» оценку ученика.
 * Поэтому вклад зависит от сложности задания.
 */
function attemptValue(correct: boolean, difficulty: Difficulty): number {
  return correct ? 0.7 + 0.06 * difficulty : 0.05 * difficulty;
}

/**
 * Считает владение каждым навыком по данным диагностики и всем попыткам.
 *
 * Диагностика задаёт стартовую точку (априорную оценку), дальше каждая попытка
 * сдвигает её экспоненциальным скользящим средним. Так свежие результаты весят
 * больше старых, но одна случайная ошибка не обнуляет прогресс.
 */
export function computeSkillMastery(state: AppState): Record<SkillId, { mastery: number; attempts: number }> {
  const result: Record<SkillId, { mastery: number; attempts: number }> = {};

  // 1. Стартовая точка — результаты диагностики.
  for (const diagnostic of Object.values(state.diagnostics)) {
    for (const [skillId, mastery] of Object.entries(diagnostic.skillMastery)) {
      result[skillId] = { mastery, attempts: 0 };
    }
  }

  // 2. Каждая попытка сдвигает оценку в сторону своего результата.
  const ordered = [...state.attempts].sort((a, b) => a.at.localeCompare(b.at));
  for (const attempt of ordered) {
    const previous = result[attempt.skillId]?.mastery ?? 0.5; // нет данных — считаем 50/50
    const value = attemptValue(attempt.correct, attempt.difficulty);
    result[attempt.skillId] = {
      mastery: clamp01(previous * (1 - LEARNING_RATE) + value * LEARNING_RATE),
      attempts: (result[attempt.skillId]?.attempts ?? 0) + 1,
    };
  }

  return result;
}

/** Владение темой — среднее по её навыкам. */
export function topicMastery(topic: Topic, skillMastery: Record<SkillId, { mastery: number }>): number {
  if (topic.skills.length === 0) return 0;
  const sum = topic.skills.reduce((acc, skillId) => acc + (skillMastery[skillId]?.mastery ?? 0), 0);
  return clamp01(sum / topic.skills.length);
}

/**
 * Навыки, о которых у системы есть настоящие данные: они встречались
 * в диагностике или по ним были попытки в заданиях.
 *
 * Зачем отдельная функция: диагностика проставляет непроверенным навыкам
 * нейтральные 50%, чтобы не завышать и не занижать оценку. Но 50% «мы не знаем»
 * и 50% «ученик ошибается в половине случаев» — это разные вещи, и показывать
 * первое в блоке «Слабые места» нечестно: ученик решит, что провалил то,
 * чего ему даже не давали.
 */
export function assessedSkills(state: AppState): Set<SkillId> {
  const assessed = new Set<SkillId>();
  for (const diagnostic of Object.values(state.diagnostics)) {
    for (const answer of diagnostic.answers) assessed.add(answer.skillId);
  }
  for (const attempt of state.attempts) assessed.add(attempt.skillId);
  return assessed;
}

/** Самые слабые навыки ученика — то, что показывается блоком «Слабые места». */
export function weakestSkills(subject: Subject, state: AppState, limit = 4): SkillMasteryEntry[] {
  const mastery = computeSkillMastery(state);
  const assessed = assessedSkills(state);

  return subject.skills
    .filter((skill) => assessed.has(skill.id))
    .map((skill): SkillMasteryEntry => ({
      skill,
      mastery: mastery[skill.id]?.mastery ?? 0,
      attempts: mastery[skill.id]?.attempts ?? 0,
    }))
    .filter((entry) => entry.mastery < MASTERY_THRESHOLD)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/*  Подбор тем                                                         */
/* ------------------------------------------------------------------ */

/**
 * Соответствие темы цели ученика, 0..1.
 *
 * Разные цели требуют разной сложности: к ЕНТ нужен крепкий средний уровень,
 * на олимпиаду — верхние уровни, а «догнать программу» начинается с базы.
 */
function goalFit(topic: Topic, goal: LearningGoal): number {
  const preferred: Record<LearningGoal, Difficulty[]> = {
    ent: [2, 3, 4],
    olympiad: [4, 5],
    review: [2, 3],
    catchup: [1, 2],
  };
  const target = preferred[goal];
  if (target.includes(topic.difficulty)) return 1;
  // Чем дальше сложность темы от целевого диапазона, тем ниже соответствие.
  const distance = Math.min(...target.map((d) => Math.abs(d - topic.difficulty)));
  return clamp01(1 - distance * 0.35);
}

/**
 * Готовность к теме: доля пройденных тем-предпосылок.
 * Тема без предпосылок всегда готова к прохождению.
 */
function readinessScore(
  topic: Topic,
  allTopics: Map<TopicId, Topic>,
  skillMastery: Record<SkillId, { mastery: number }>,
): number {
  if (topic.prerequisites.length === 0) return 1;
  const ready = topic.prerequisites.filter((id) => {
    const prerequisite = allTopics.get(id);
    if (!prerequisite) return true; // предпосылки нет в контенте — не блокируем ученика
    return topicMastery(prerequisite, skillMastery) >= 0.6;
  });
  return ready.length / topic.prerequisites.length;
}

/** Темы, доступные ученику по классу. Ниже своего класса — можно (догоняем), выше — только олимпиадникам. */
function isAvailableForGrade(topic: Topic, grade: Grade, goal: LearningGoal): boolean {
  const minGrade = Math.min(...topic.grades);
  const maxAllowed = goal === 'olympiad' ? grade + 1 : grade;
  return minGrade <= maxAllowed;
}

/**
 * Главная функция движка: ранжирует темы предмета под конкретного ученика.
 *
 * Возвращает список, отсортированный по приоритету, где у каждой темы есть
 * готовые к показу причины. Именно этот список видит ученик на странице плана
 * и именно он уходит в языковую модель как фактическая опора.
 */
export function rankTopics(subject: Subject, state: AppState, extraTopics: Topic[] = []): RankedTopic[] {
  const profile = state.profile;
  const skillMastery = computeSkillMastery(state);

  const topics = [...subject.topics, ...extraTopics.filter((t) => t.subjectId === subject.id)];
  const topicIndex = new Map(topics.map((t) => [t.id, t]));

  const ranked = topics
    .filter((topic) => (profile ? isAvailableForGrade(topic, profile.grade, profile.goal) : true))
    .map((topic): RankedTopic => {
      const mastery = topicMastery(topic, skillMastery);
      const readiness = readinessScore(topic, topicIndex, skillMastery);
      const fit = profile ? goalFit(topic, profile.goal) : 0.6;
      const progress = state.topicProgress[topic.id];
      const started = Boolean(progress && progress.attempts > 0);

      const gap = 1 - mastery;
      const momentum = started && mastery < MASTERY_THRESHOLD ? 1 : 0;

      const score = clamp01(
        WEIGHTS.gap * gap +
          WEIGHTS.readiness * readiness +
          WEIGHTS.goalFit * fit +
          WEIGHTS.momentum * momentum,
      );

      return {
        topic,
        score,
        mastery,
        readiness,
        status: topicStatus(mastery, started),
        reasons: buildReasons({ topic, mastery, readiness, fit, started, profile }),
      };
    })
    .sort((a, b) => b.score - a.score);

  return ranked;
}

function topicStatus(mastery: number, started: boolean): RankedTopic['status'] {
  if (mastery >= MASTERY_THRESHOLD) return 'mastered';
  if (started) return 'in-progress';
  if (mastery > 0 && mastery < WEAKNESS_THRESHOLD) return 'weak';
  return 'new';
}

/** Собирает человекочитаемые причины рекомендации. Пустого списка не бывает. */
function buildReasons(input: {
  topic: Topic;
  mastery: number;
  readiness: number;
  fit: number;
  started: boolean;
  profile: Profile | null;
}): string[] {
  const { topic, mastery, readiness, fit, started, profile } = input;
  const reasons: string[] = [];
  const percent = Math.round(mastery * 100);

  if (mastery < WEAKNESS_THRESHOLD) {
    reasons.push(`Слабое место: тема освоена на ${percent}%`);
  } else if (mastery < MASTERY_THRESHOLD) {
    reasons.push(`Есть куда расти: тема освоена на ${percent}%`);
  } else {
    reasons.push(`Тема уже освоена на ${percent}% — можно закрепить`);
  }

  if (started) reasons.push('Вы уже начали эту тему — стоит довести до конца');

  if (readiness < 1) {
    reasons.push('Сначала лучше подтянуть темы-предпосылки');
  } else if (topic.prerequisites.length > 0) {
    reasons.push('Все базовые темы для неё уже пройдены');
  }

  if (fit >= 1 && profile) {
    const goalTitle: Record<LearningGoal, string> = {
      ent: 'подготовки к ЕНТ',
      olympiad: 'олимпиады',
      review: 'повторения',
      catchup: 'закрытия пробелов',
    };
    reasons.push(`Уровень сложности подходит для ${goalTitle[profile.goal]}`);
  }

  return reasons;
}

/* ------------------------------------------------------------------ */
/*  Адаптация сложности                                                */
/* ------------------------------------------------------------------ */

/**
 * Пересчитывает уровень сложности по последним попыткам в предмете.
 *
 * Правило простое и предсказуемое: стабильно решает — поднимаем планку,
 * стабильно ошибается — опускаем. Это и есть «адаптация сложности заданий
 * по мере прохождения» из требований кейса.
 */
export function nextDifficulty(subjectId: string, state: AppState): Difficulty {
  const current = state.difficulty[subjectId] ?? 2;
  const recent = state.attempts
    .filter((a) => a.subjectId === subjectId)
    .slice(-ADAPTIVE_WINDOW);

  if (recent.length < ADAPTIVE_WINDOW) return current;

  const accuracy = recent.filter((a) => a.correct).length / recent.length;
  if (accuracy >= 0.75) return clampDifficulty(current + 1);
  if (accuracy <= 0.25) return clampDifficulty(current - 1);
  return current;
}

/** Объяснение последнего изменения сложности — показывается ученику. */
export function difficultyExplanation(subjectId: string, state: AppState): string | null {
  const recent = state.attempts.filter((a) => a.subjectId === subjectId).slice(-ADAPTIVE_WINDOW);
  if (recent.length < ADAPTIVE_WINDOW) return null;

  const correct = recent.filter((a) => a.correct).length;
  const accuracy = correct / recent.length;
  if (accuracy >= 0.75) return `${correct} из ${recent.length} последних заданий решены верно — повышаем сложность`;
  if (accuracy <= 0.25) return `Только ${correct} из ${recent.length} последних заданий верны — снижаем сложность`;
  return `${correct} из ${recent.length} последних заданий верны — сложность подобрана правильно`;
}

/**
 * Подбирает задания темы под текущий уровень ученика.
 * Сначала идут задания нужной сложности, потом ближайшие к ней;
 * уже решённые верно уходят в конец, чтобы не повторяться.
 */
export function selectTasks(topic: Topic, difficulty: Difficulty, state: AppState, limit = 5): Task[] {
  const solved = new Set(
    state.attempts.filter((a) => a.correct).map((a) => a.taskId),
  );

  return [...topic.tasks]
    .sort((a, b) => {
      const aSolved = solved.has(a.id) ? 1 : 0;
      const bSolved = solved.has(b.id) ? 1 : 0;
      if (aSolved !== bSolved) return aSolved - bSolved;
      return Math.abs(a.difficulty - difficulty) - Math.abs(b.difficulty - difficulty);
    })
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/*  Диагностика                                                        */
/* ------------------------------------------------------------------ */

/** Считает результат диагностики: карту навыков, общий балл и стартовую сложность. */
export function scoreDiagnostic(
  subject: Subject,
  answers: { task: Task; answer: string; correct: boolean }[],
): {
  skillMastery: Record<SkillId, number>;
  score: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  startingDifficulty: Difficulty;
} {
  const bySkill = new Map<SkillId, { correct: number; total: number; weight: number }>();

  for (const { task, correct } of answers) {
    const entry = bySkill.get(task.skillId) ?? { correct: 0, total: 0, weight: 0 };
    entry.total += 1;
    entry.weight += task.difficulty;
    if (correct) entry.correct += task.difficulty; // сложные вопросы весят больше
    bySkill.set(task.skillId, entry);
  }

  const skillMastery: Record<SkillId, number> = {};
  for (const [skillId, entry] of bySkill) {
    skillMastery[skillId] = entry.weight > 0 ? clamp01(entry.correct / entry.weight) : 0;
  }

  // Навыки предмета, которые диагностика не покрыла, получают нейтральную оценку:
  // мы о них ничего не знаем, и делать вид, что знаем, нечестно.
  for (const skill of subject.skills) {
    if (skillMastery[skill.id] === undefined) skillMastery[skill.id] = 0.5;
  }

  const score = answers.length > 0 ? answers.filter((a) => a.correct).length / answers.length : 0;
  const level = score >= 0.75 ? 'advanced' : score >= 0.4 ? 'intermediate' : 'beginner';
  const startingDifficulty: Difficulty = level === 'advanced' ? 4 : level === 'intermediate' ? 3 : 1;

  return { skillMastery, score, level, startingDifficulty };
}

/* ------------------------------------------------------------------ */
/*  Сводка по ученику (для кабинета и панели учителя)                  */
/* ------------------------------------------------------------------ */

export interface StudentSummary {
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  topicsStarted: number;
  topicsMastered: number;
  /** Средний уровень владения по всем известным навыкам, 0..1. */
  overallMastery: number;
  points: number;
}

export function summarize(state: AppState): StudentSummary {
  const mastery = computeSkillMastery(state);
  const values = Object.values(mastery).map((m) => m.mastery);
  const progress = Object.values(state.topicProgress);
  const correct = state.attempts.filter((a) => a.correct).length;

  return {
    totalAttempts: state.attempts.length,
    correctAttempts: correct,
    accuracy: state.attempts.length > 0 ? correct / state.attempts.length : 0,
    topicsStarted: progress.filter((p) => p.attempts > 0).length,
    topicsMastered: progress.filter((p) => p.mastery >= MASTERY_THRESHOLD).length,
    overallMastery: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
    points: state.points,
  };
}

/** Сколько дней осталось до цели (например, до ЕНТ). null — цель не задана. */
export function daysUntil(targetDate: string | undefined, now = new Date()): number | null {
  if (!targetDate) return null;
  const target = new Date(`${targetDate}T00:00:00+05:00`); // время Астаны (UTC+5)
  if (Number.isNaN(target.getTime())) return null;
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/* ------------------------------------------------------------------ */
/*  Вспомогательное                                                    */
/* ------------------------------------------------------------------ */

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clampDifficulty(value: number): Difficulty {
  return Math.min(5, Math.max(1, value)) as Difficulty;
}

/** Обновляет прогресс по теме после очередной попытки. */
export function applyAttemptToProgress(
  previous: AppState['topicProgress'],
  attempt: TaskAttempt,
  topicTaskCount: number,
): AppState['topicProgress'] {
  const existing = previous[attempt.topicId];
  const attempts = (existing?.attempts ?? 0) + 1;
  const correct = (existing?.correct ?? 0) + (attempt.correct ? 1 : 0);
  const previousMastery = existing?.mastery ?? 0.5;
  const value = attemptValue(attempt.correct, attempt.difficulty);

  return {
    ...previous,
    [attempt.topicId]: {
      topicId: attempt.topicId,
      subjectId: attempt.subjectId,
      attempts,
      correct,
      mastery: clamp01(previousMastery * (1 - LEARNING_RATE) + value * LEARNING_RATE),
      // Тема считается пройденной, когда ученик сделал попытку по каждому заданию.
      completed: attempts >= topicTaskCount,
      lastAt: attempt.at,
    },
  };
}

/** Очки за верный ответ: чем сложнее задание, тем больше. Основа геймификации. */
export function pointsForAttempt(correct: boolean, difficulty: Difficulty): number {
  return correct ? difficulty * 10 : 0;
}

export type { Skill };
