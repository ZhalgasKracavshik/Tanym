/**
 * Демонстрационный класс для панели учителя.
 *
 * Панель учителя должна показывать статистику по группе, но в MVP данные
 * живут в браузере конкретного пользователя — значит, других учеников физически
 * неоткуда взять. Поэтому класс генерируется детерминированно из имени ученика
 * и реальных идентификаторов контента.
 *
 * Ключевое слово — детерминированно: одно и то же имя всегда даёт один и тот же
 * результат. Если бы мы взяли Math.random(), цифры менялись бы при каждом
 * рендере, учитель видел бы «скачущую» статистику, а на защите проекта
 * показатели менялись бы прямо во время демонстрации.
 *
 * Живой пользователь при этом не подменяется: страница учителя добавляет его
 * настоящий прогресс к этому списку отдельной строкой.
 */

import type { Grade, LearningGoal, SkillId, Subject, TopicId } from '@/lib/types';

export interface DemoStudent {
  id: string;
  name: string;
  grade: Grade;
  goal: LearningGoal;
  skillMastery: Record<SkillId, number>;
  topicProgress: Record<TopicId, { attempts: number; correct: number; mastery: number; completed: boolean }>;
  points: number;
  /** Сколько дней назад ученик последний раз заходил. */
  lastActiveDaysAgo: number;
}

const NAMES = [
  'Аружан Сериккызы',
  'Ерасыл Жумабек',
  'Дана Оспанова',
  'Тимур Ахметов',
  'Жансая Калиева',
  'Нурислам Сагындык',
  'Алина Ким',
  'Мадияр Турсын',
  'Камила Абдрахманова',
  'Данияр Есет',
  'Аяулым Бекова',
  'Санжар Мукашев',
];

const GOALS: LearningGoal[] = ['ent', 'olympiad', 'review', 'catchup'];

/** Хэш строки в 32-битное число — основа воспроизводимого «случайного» ряда. */
function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Генератор псевдослучайных чисел mulberry32: одинаковое зерно — одинаковый ряд. */
function makeRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Собирает класс из 12 учеников для конкретного предмета.
 * У каждого своя «база способностей», вокруг которой расходятся навыки —
 * поэтому в классе есть и отличники, и отстающие, и середина.
 */
export function buildDemoClass(subject: Subject, grade: Grade = 9): DemoStudent[] {
  return NAMES.map((name, index) => {
    const random = makeRandom(hashString(`${name}|${subject.id}`));

    // Базовый уровень ученика: от 0.25 до 0.9.
    const ability = 0.25 + random() * 0.65;

    const skillMastery: Record<SkillId, number> = {};
    for (const skill of subject.skills) {
      // Навык колеблется вокруг базового уровня: ±0.22.
      skillMastery[skill.id] = clamp01(ability + (random() - 0.5) * 0.44);
    }

    const topicProgress: DemoStudent['topicProgress'] = {};
    let points = 0;
    for (const topic of subject.topics) {
      // Слабые ученики просто не доходят до части тем.
      const started = random() < 0.35 + ability * 0.55;
      if (!started) continue;

      const mastery = clamp01(
        topic.skills.reduce((sum, id) => sum + (skillMastery[id] ?? ability), 0) /
          Math.max(1, topic.skills.length),
      );
      const attempts = Math.max(1, Math.round(topic.tasks.length * (0.4 + random() * 0.6)));
      const correct = Math.round(attempts * mastery);

      topicProgress[topic.id] = {
        attempts,
        correct,
        mastery,
        completed: attempts >= topic.tasks.length && mastery >= 0.8,
      };
      points += correct * topic.difficulty * 10;
    }

    return {
      id: `demo_${subject.id}_${index}`,
      name,
      grade,
      goal: GOALS[index % GOALS.length],
      skillMastery,
      topicProgress,
      points,
      lastActiveDaysAgo: Math.floor(random() * 9),
    };
  });
}

/** Средний уровень класса по каждому навыку — для сводки в панели учителя. */
export function classSkillAverages(students: DemoStudent[], subject: Subject): { skillId: SkillId; title: string; average: number }[] {
  return subject.skills.map((skill) => {
    const values = students.map((student) => student.skillMastery[skill.id] ?? 0);
    const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    return { skillId: skill.id, title: skill.title, average };
  });
}
