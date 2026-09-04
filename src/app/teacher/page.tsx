'use client';

/**
 * Панель учителя: прогресс класса и добавление своих тем.
 *
 * Про данные класса честно: в MVP нет общего сервера, поэтому «одноклассники»
 * генерируются детерминированно (см. data/demo-class.ts). Но прогресс реального
 * пользователя подмешивается первой строкой — на демонстрации видно, как ответы
 * ученика доходят до учителя. Это и есть замыкание круга «ученик → учитель».
 */

import { Suspense, useState } from 'react';
import { SUBJECTS } from '@/data';
import { buildDemoClass, classSkillAverages } from '@/data/demo-class';
import { computeSkillMastery, summarize } from '@/lib/personalization';
import { useStore } from '@/components/StoreProvider';
import type { Dict } from '@/lib/i18n';
import { AddTopicForm } from './AddTopicForm';
import { Icon } from '@/components/Icon';
import { Badge, Button, Kicker, Panel, ProgressBar, RailRow, SectionHeader, Skeleton } from '@/components/ui';
import { SchoolAuthGate } from '@/components/SchoolAuthGate';
import { TeacherClassRoster } from '@/components/TeacherClassRoster';

/** Подписи страницы на трёх языках. Ключи одинаковые — за этим следит TypeScript. */
const TEXT: Dict<{
  title: string;
  statStudents: string;
  statAverage: string;
  statAtRisk: string;
  statAtRiskHint: string;
  statAtRiskOf: (n: number) => string;
  statWeakest: string;
  studentsTitle: string;
  studentsDescription: string;
  demoDataLabel: string;
  colStudent: string;
  colLevel: string;
  colPoints: string;
  colActivity: string;
  you: string;
  grade: (n: number) => string;
  today: string;
  daysAgo: (n: number) => string;
  problemTitle: string;
  problemDescription: string;
  customTitle: string;
  customDescription: string;
  taskCount: (n: number) => string;
  open: string;
  remove: string;
  confirmRemove: (title: string) => string;
  noData: string;
}> = {
  ru: {
    title: 'Панель учителя',
    statStudents: 'Учеников',
    statAverage: 'Средний уровень',
    statAtRisk: 'В зоне риска',
    statAtRiskHint: 'уровень ниже 50%',
    statAtRiskOf: (n) => `из ${n} учеников`,
    statWeakest: 'Слабейшая тема',
    studentsTitle: 'Ученики',
    demoDataLabel: 'Демонстрационные данные',
    studentsDescription: 'Отсортированы по уровню: наверху те, кому нужна помощь',
    colStudent: 'Ученик',
    colLevel: 'Уровень',
    colPoints: 'Очки',
    colActivity: 'Активность',
    you: 'вы',
    grade: (n) => `${n} класс`,
    today: 'сегодня',
    daysAgo: (n) => `${n} дн. назад`,
    problemTitle: 'Проблемные навыки',
    problemDescription: 'Средний уровень класса по навыку. Эти навыки полезно разобрать на уроке ещё раз.',
    customTitle: 'Свои темы',
    customDescription: 'Добавленная тема сразу появляется у учеников и решается как обычная',
    taskCount: (n) => `${n} заданий`,
    open: 'Открыть',
    remove: 'Удалить',
    confirmRemove: (title) => `Удалить тему «${title}»?`,
    noData: 'нет данных',
  },
  kk: {
    title: 'Мұғалім панелі',
    statStudents: 'Оқушы',
    statAverage: 'Орташа деңгей',
    statAtRisk: 'Тәуекел аймағында',
    statAtRiskHint: 'деңгейі 50%-дан төмен',
    statAtRiskOf: (n) => `${n} оқушының ішінен`,
    statWeakest: 'Ең әлсіз тақырып',
    studentsTitle: 'Оқушылар',
    demoDataLabel: 'Демонстрациялық деректер',
    studentsDescription: 'Деңгейі бойынша сұрыпталған: көмек қажет оқушылар жоғарыда',
    colStudent: 'Оқушы',
    colLevel: 'Деңгей',
    colPoints: 'Ұпай',
    colActivity: 'Белсенділік',
    you: 'сіз',
    grade: (n) => `${n}-сынып`,
    today: 'бүгін',
    daysAgo: (n) => `${n} күн бұрын`,
    problemTitle: 'Проблемалы дағдылар',
    problemDescription: 'Дағды бойынша сыныптың орташа деңгейі. Осыны сабақта тағы бір рет талдаған жөн.',
    customTitle: 'Өз тақырыптарым',
    customDescription: 'Қосылған тақырып оқушыларда бірден шығады және кәдімгі тақырып сияқты шешіледі',
    taskCount: (n) => `${n} тапсырма`,
    open: 'Ашу',
    remove: 'Жою',
    confirmRemove: (title) => `«${title}» тақырыбы жойылсын ба?`,
    noData: 'дерек жоқ',
  },
  en: {
    title: 'Teacher dashboard',
    statStudents: 'Students',
    statAverage: 'Average level',
    statAtRisk: 'At risk',
    statAtRiskHint: 'level below 50%',
    statAtRiskOf: (n) => `of ${n} students`,
    statWeakest: 'Weakest topic',
    studentsTitle: 'Students',
    demoDataLabel: 'Demo data',
    studentsDescription: 'Sorted by level: those who need help come first',
    colStudent: 'Student',
    colLevel: 'Level',
    colPoints: 'Points',
    colActivity: 'Activity',
    you: 'you',
    grade: (n) => `Grade ${n}`,
    today: 'today',
    daysAgo: (n) => `${n} days ago`,
    problemTitle: 'Weak skills',
    problemDescription: 'The class average for each skill. These are worth going over in class once more.',
    customTitle: 'Your own topics',
    customDescription: 'A topic you add shows up for students right away and works like any other',
    taskCount: (n) => `${n} tasks`,
    open: 'Open',
    remove: 'Delete',
    confirmRemove: (title) => `Delete the topic “${title}”?`,
    noData: 'no data',
  },
};

export default function TeacherPage() {
  const { state, hydrated, removeCustomTopic } = useStore();
  const t = TEXT[state.language];
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
      {/*
        Заголовок без описания: учитель открывает панель, чтобы увидеть цифры
        класса, а не прочитать, зачем эта панель нужна.
      */}
      <h1 className="text-3xl font-medium text-ink-900 sm:text-4xl">{t.title}</h1>

      {/*
        Настоящий класс — те, кто реально ввёл код учителя, а не выдуманные
        одноклассники ниже. Стоит первым, до демонстрационных данных,
        потому что это единственная часть панели, которая не постановочная.
      */}
      <div className="mt-10 rounded-xl border border-ink-200 bg-ink-50 p-5">
        <Suspense fallback={null}>
          <SchoolAuthGate requireRole="teacher" language={state.language}>
            {() => <TeacherClassRoster language={state.language} />}
          </SchoolAuthGate>
        </Suspense>
      </div>

      {/* Выбор предмета лежит на голом фоне и отделён линией, а не рамкой карточки */}
      <div className="mt-10 flex flex-wrap gap-2 border-b border-ink-200 pb-4">
        {SUBJECTS.map((item) => (
          <button
            key={item.id}
            onClick={() => setSubjectId(item.id)}
            aria-pressed={item.id === subjectId}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
              item.id === subjectId
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]'
            }`}
          >
            <Icon name={item.icon} size={18} />
            {item.title}
          </button>
        ))}
      </div>

      {/*
        Сводка лежит на голом фоне между волосяными линиями, а не в четырёх
        одинаковых плитках. Число учеников в зоне риска набрано крупнее всего:
        это единственная цифра, ради которой учитель открывает панель, остальное
        она объясняет. Доля от класса осталась словами рядом: три из тридцати и
        девять из тринадцати это разные новости.
      */}
      <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-6 border-y border-ink-200 py-6 lg:grid-cols-4 lg:divide-x lg:divide-ink-200">
        <div className="lg:pr-8">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.statAtRisk}</p>
          <p className="mt-2 flex items-center gap-2 text-5xl font-medium tabular-nums text-ink-900">
            <Icon name="alert" size={28} className={atRisk > 0 ? 'text-danger-500' : 'text-ink-300'} />
            {atRisk}
          </p>
          <p className="mt-2 text-xs tabular-nums text-ink-400">
            {t.statAtRiskOf(rows.length)}, {t.statAtRiskHint}
          </p>
        </div>

        <div className="lg:px-8">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.statStudents}</p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-ink-900">{rows.length}</p>
        </div>

        <div className="lg:px-8">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.statAverage}</p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-ink-900">
            {Math.round(classAverage * 100)}
            <span className="text-lg text-ink-300">%</span>
          </p>
        </div>

        <div className="lg:px-8">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.statWeakest}</p>
          <p className="mt-2 text-base font-semibold text-ink-900">
            {problemSkills[0]?.title ?? t.noData}
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-x-8 gap-y-10 lg:grid-cols-3">
        {/* Таблица учеников */}
        <div className="lg:col-span-2">
          <Kicker>{t.demoDataLabel}</Kicker>
          <div className="mt-2">
            <SectionHeader title={t.studentsTitle} description={t.studentsDescription} />
          </div>
          {/* Таблица это плотные данные, поэтому панель без тени, а не карточка */}
          <Panel className="overflow-x-auto">
            <table className="w-full min-w-125 text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3 font-semibold">{t.colStudent}</th>
                  <th className="px-4 py-3 font-semibold">{t.colLevel}</th>
                  <th className="px-4 py-3 font-semibold">{t.colPoints}</th>
                  <th className="px-4 py-3 font-semibold">{t.colActivity}</th>
                </tr>
              </thead>
              <tbody>
                {[...rows]
                  .sort((a, b) => a.mastery - b.mastery)
                  .map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-ink-100 transition-colors duration-150 last:border-0 hover:bg-ink-50"
                    >
                      <td className="px-4 py-3">
                        <span className="font-semibold text-ink-800">{row.name}</span>
                        {row.isLive && (
                          <Badge tone="brand" className="ml-2">
                            {t.you}
                          </Badge>
                        )}
                        <span className="block text-xs text-ink-400">{t.grade(row.grade)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <ProgressBar value={row.mastery} showPercent={false} className="w-24" />
                        <span className="mt-1 block text-xs tabular-nums text-ink-500">
                          {Math.round(row.mastery * 100)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-ink-700">{row.points}</td>
                      <td className="px-4 py-3 tabular-nums text-ink-500">
                        {row.lastActiveDaysAgo === 0 ? t.today : t.daysAgo(row.lastActiveDaysAgo)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Panel>
        </div>

        {/* Проблемные навыки класса: этот блок нельзя перенести на другой экран
            целиком, значит он не карточка */}
        <div>
          <SectionHeader title={t.problemTitle} />
          <Panel className="p-5">
            <p className="text-sm text-ink-500">{t.problemDescription}</p>
            <div className="mt-4 space-y-4">
              {problemSkills.map((skill) => (
                <ProgressBar key={skill.skillId} label={skill.title} value={skill.average} />
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* Свои темы: вспомогательная область, отделена от данных класса паузой */}
      <div className="mt-16">
        <SectionHeader title={t.customTitle} description={t.customDescription} />

        {customTopics.length > 0 && (
          <ul className="mb-4 space-y-4">
            {customTopics.map((topic) => (
              /* Список тем это перечисление, поэтому строка с рейкой, а не карточка */
              <li key={topic.id}>
                <RailRow
                  tone="neutral"
                  interactive
                  className="flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2">
                    <Icon name="folder" size={18} className="text-ink-400" />
                    <span className="font-semibold text-ink-900">{topic.title}</span>
                    <span className="text-sm tabular-nums text-ink-400">
                      {t.taskCount(topic.tasks.length)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`/learn/${topic.id}`}
                      className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-600 outline-none transition-all duration-150 hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      {t.open}
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(t.confirmRemove(topic.title))) removeCustomTopic(topic.id);
                      }}
                    >
                      {t.remove}
                    </Button>
                  </div>
                </RailRow>
              </li>
            ))}
          </ul>
        )}

        <AddTopicForm subject={subject} />
      </div>
    </div>
  );
}
