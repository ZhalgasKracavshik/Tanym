/**
 * Реестр учебного контента.
 *
 * Контент лежит в обычных TypeScript-файлах, а не в базе данных: для MVP это
 * осознанный выбор. Плюсы — контент версионируется вместе с кодом, проверяется
 * компилятором на соответствие типам и не требует поднимать инфраструктуру.
 * Что будет дальше: те же самые структуры один в один переносятся в таблицы
 * Postgres, а функции ниже превращаются в запросы — интерфейс остаётся прежним.
 *
 * Темы, которые учитель добавляет через панель управления, хранятся отдельно
 * в localStorage и подмешиваются к этому реестру функциями с суффиксом WithCustom.
 */

import type { Subject, SubjectId, Task, TaskId, Topic, TopicId } from '@/lib/types';
import { math } from './subjects/math';
import { physics } from './subjects/physics';
import { kazakhHistory } from './subjects/kazakh-history';
import { chemistry } from './subjects/chemistry';
import { biology } from './subjects/biology';
import { english } from './subjects/english';

/** Все предметы платформы. Порядок влияет на порядок вывода в интерфейсе. */
export const SUBJECTS: Subject[] = [math, physics, chemistry, biology, english, kazakhHistory];

export function getSubject(id: SubjectId | undefined | null): Subject | undefined {
  if (!id) return undefined;
  return SUBJECTS.find((subject) => subject.id === id);
}

/** Ищет тему во всём контенте. `extra` — темы, добавленные учителем. */
export function getTopic(id: TopicId | undefined | null, extra: Topic[] = []): Topic | undefined {
  if (!id) return undefined;
  const custom = extra.find((topic) => topic.id === id);
  if (custom) return custom;
  for (const subject of SUBJECTS) {
    const topic = subject.topics.find((t) => t.id === id);
    if (topic) return topic;
  }
  return undefined;
}

/** Ищет задание по id — в темах и в диагностиках. */
export function getTask(id: TaskId | undefined | null, extra: Topic[] = []): Task | undefined {
  if (!id) return undefined;
  for (const topic of extra) {
    const task = topic.tasks.find((t) => t.id === id);
    if (task) return task;
  }
  for (const subject of SUBJECTS) {
    for (const topic of subject.topics) {
      const task = topic.tasks.find((t) => t.id === id);
      if (task) return task;
    }
    const diagnosticTask = subject.diagnostic.find((t) => t.id === id);
    if (diagnosticTask) return diagnosticTask;
  }
  return undefined;
}

/** Предмет, которому принадлежит тема. */
export function getSubjectOfTopic(topicId: TopicId, extra: Topic[] = []): Subject | undefined {
  const topic = getTopic(topicId, extra);
  if (!topic) return undefined;
  return getSubject(topic.subjectId);
}

/** Название навыка по id — нужно для подписей в интерфейсе. */
export function getSkillTitle(skillId: string): string {
  for (const subject of SUBJECTS) {
    const skill = subject.skills.find((s) => s.id === skillId);
    if (skill) return skill.title;
  }
  return skillId;
}

/** Все темы предмета вместе с добавленными учителем. */
export function topicsOfSubject(subjectId: SubjectId, extra: Topic[] = []): Topic[] {
  const subject = getSubject(subjectId);
  const base = subject?.topics ?? [];
  return [...base, ...extra.filter((topic) => topic.subjectId === subjectId)];
}
