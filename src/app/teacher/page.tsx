'use client';

/**
 * Панель учителя: прогресс класса и добавление своих тем.
 *
 * Про данные класса честно: в MVP нет общего сервера, поэтому «одноклассники»
 * генерируются детерминированно (см. data/demo-class.ts). Но прогресс реального
 * пользователя подмешивается первой строкой — на демонстрации видно, как ответы
 * ученика доходят до учителя. Это и есть замыкание круга «ученик → учитель».
 */

import { useState } from 'react';
import { SUBJECTS } from '@/data';
import { buildDemoClass, classSkillAverages } from '@/data/demo-class';
import { computeSkillMastery, summarize } from '@/lib/personalization';
import { useStore } from '@/components/StoreProvider';
import { AddTopicForm } from './AddTopicForm';
import { Badge, Button, Card, ProgressBar, SectionHeader, Skeleton, Stat } from '@/components/ui';

export default function TeacherPage() {
  const { state, hydrated, removeCustomTopic } = useStore();
  const [subjectId, setSubjectId] = useState(SUBJECTS[0].id);

  const subject = SUBJECTS.find((item) => item.id === subjectId) ?? SUBJECTS[0];

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const demoStudents = buildDemoClass(subject);

  // Средний уровень ученика по предмету — среднее по навыкам этого предмета.
  function averageMastery(skillMastery: Record<string, number>): number {
    const values = subject.skills.map((skill) => skillMastery[skill.id] ?? 0);
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  // Реальный пользователь как строка таблицы — если он ученик и что-то решал.
  const liveMastery = computeSkillMastery(state);
  const liveStats = summarize(state);
  const showLiveStudent = state.profile?.role === 'student' && liveStats.totalAttempts > 0;

  const rows = [
    ...(showLiveStudent
      ? [
          {
            id: 'live',
            name: state.profile!.name,
            grade: state.profile!.grade,
            mastery: averageMastery(
              Object.fromEntries(Object.entries(liveMastery).map(([id, value]) => [id, value.mastery])),
            ),
            points: liveStats.points,
            lastActiveDaysAgo: 0,
            isLive: true,
          },
        ]
      : []),
    ...demoStudents.map((student) => ({
      id: student.id,
      name: student.name,
      grade: student.grade,
      mastery: averageMastery(student.skillMastery),
      points: student.points,
      lastActiveDaysAgo: student.lastActiveDaysAgo,
      isLive: false,
    })),
  ];

  const atRisk = rows.filter((row) => row.mastery < 0.5).length;
  const classAverage = rows.reduce((sum, row) => sum + row.mastery, 0) / rows.length;
  const problemSkills = classSkillAverages(demoStudents, subject).sort((a, b) => a.average - b.average).slice(0, 5);

  const customTopics = state.customTopics.filter((topic) => topic.subjectId === subject.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">Панель учителя</h1>
      <p className="mt-2 text-ink-500">Где класс проседает и кому нужна помощь — без проверки тетрадей.</p>

      {/* Выбор предмета */}
      <div className="mt-5 flex flex-wrap gap-2">
        {SUBJECTS.map((item) => (
          <button
            key={item.id}
            onClick={() => setSubjectId(item.id)}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
              item.id === subjectId
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300'
            }`}
          >
            <span aria-hidden>{item.icon}</span> {item.title}
          </button>
        ))}
      </div>

      {/* Сводка */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Учеников" value={rows.length} />
        <Stat label="Средний уровень" value={`${Math.round(classAverage * 100)}%`} />
        <Stat label="В зоне риска" value={atRisk} hint="уровень ниже 50%" />
        <Stat label="Слабейшая тема" value={<span className="text-base">{problemSkills[0]?.title ?? '—'}</span>} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Таблица учеников */}
        <div className="lg:col-span-2">
          <SectionHeader title="Ученики" description="Отсортированы по уровню: кому нужна помощь — сверху" />
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-125 text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3 font-semibold">Ученик</th>
                  <th className="px-4 py-3 font-semibold">Уровень</th>
                  <th className="px-4 py-3 font-semibold">Очки</th>
                  <th className="px-4 py-3 font-semibold">Активность</th>
                </tr>
              </thead>
              <tbody>
                {[...rows]
                  .sort((a, b) => a.mastery - b.mastery)
                  .map((row) => (
                    <tr key={row.id} className="border-b border-ink-100 last:border-0">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-ink-800">{row.name}</span>
                        {row.isLive && (
                          <Badge tone="brand" className="ml-2">
                            вы
                          </Badge>
                        )}
                        <span className="block text-xs text-ink-400">{row.grade} класс</span>
                      </td>
                      <td className="px-4 py-3">
                        <ProgressBar value={row.mastery} showPercent={false} className="w-24" />
                        <span className="mt-1 block text-xs tabular-nums text-ink-500">
                          {Math.round(row.mastery * 100)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-ink-700">{row.points}</td>
                      <td className="px-4 py-3 text-ink-500">
                        {row.lastActiveDaysAgo === 0 ? 'сегодня' : `${row.lastActiveDaysAgo} дн. назад`}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Проблемные навыки класса */}
        <div>
          <SectionHeader title="Проблемные навыки" />
          <Card>
            <p className="mb-4 text-sm text-ink-500">
              Средний уровень класса по навыку. Это то, что стоит разобрать на уроке ещё раз.
            </p>
            <div className="space-y-4">
              {problemSkills.map((skill) => (
                <ProgressBar key={skill.skillId} label={skill.title} value={skill.average} />
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Свои темы */}
      <div className="mt-10">
        <SectionHeader
          title="Свои темы"
          description="Добавленная тема сразу появляется у учеников и решается как обычная"
        />

        {customTopics.length > 0 && (
          <ul className="mb-4 space-y-2">
            {customTopics.map((topic) => (
              <Card as="li" key={topic.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-semibold text-ink-900">{topic.title}</span>
                  <span className="ml-2 text-sm text-ink-400">{topic.tasks.length} заданий</span>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`/learn/${topic.id}`}
                    className="rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-600 hover:bg-brand-50"
                  >
                    Открыть
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (window.confirm(`Удалить тему «${topic.title}»?`)) removeCustomTopic(topic.id);
                    }}
                  >
                    Удалить
                  </Button>
                </div>
              </Card>
            ))}
          </ul>
        )}

        <AddTopicForm subject={subject} />
      </div>
    </div>
  );
}
