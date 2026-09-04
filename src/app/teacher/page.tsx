'use client';

/**
 * Панель учителя: прогресс класса и добавление своих тем.
 *
 * Все цифры здесь — из проверенных сервером попыток учеников, которые
 * ввели код этого класса. Раньше панель показывала выдуманный класс:
 * одноклассники генерировались функцией, «западающие навыки» считались по
 * ним же, и учитель принимал решение «кому помочь» по числам, за
 * которыми не стоял ни один живой человек.
 *
 * Пустая панель, когда код класса ещё никто не ввёл, честнее
 * сгенерированных отличников: она сразу говорит, что делать дальше.
 */

import { Suspense, useState } from 'react';
import { SUBJECTS } from '@/data';
import { useStore } from '@/components/StoreProvider';
import type { Dict } from '@/lib/i18n';
import { TopicBuilder } from './TopicBuilder';
import { Icon } from '@/components/Icon';
import { Button, Panel, ProgressBar, RailRow, SectionHeader, Skeleton } from '@/components/ui';
import { SchoolAuthGate } from '@/components/SchoolAuthGate';
import { useClassStats } from '@/lib/supabase/classStats';
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
  attemptsLine: (attempts: number, students: number) => string;
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
    attemptsLine: (attempts, students) =>
      `${attempts} попыток у ${students} учеников`,
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
    attemptsLine: (attempts, students) =>
      `${students} оқушыда ${attempts} әрекет`,
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
    attemptsLine: (attempts, students) =>
      `${attempts} attempts by ${students} students`,
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

  /*
    Сводка приходит из базы: попытки учеников этого класса, проверенные
    сервером. Пока хук не ответил — stats равен null, и панель показывает
    прочерк вместо нулей: ноль здесь означал бы «класс не занимается», а
    это совсем другое сообщение.

    Вызов стоит здесь, а не ниже у расчётов, потому что между ними есть
    ранний возврат для негидратированного состояния. Хук после условного
    return вызывается не в каждом рендере, и React теряет порядок хуков —
    это ошибка, а не стилистическая придирка.
  */
  const stats = useClassStats(subject.id);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Подписи навыков живут в контенте, а в базе лежат только их коды.
  const skillTitle = (skillId: string) =>
    subject.skills.find((skill) => skill.id === skillId)?.title ?? skillId;

  const problemSkills = (stats?.weakSkills ?? []).slice(0, 5);

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
            <Icon
              name="alert"
              size={28}
              className={stats && stats.atRisk > 0 ? 'text-danger-500' : 'text-ink-300'}
            />
            {stats ? stats.atRisk : '—'}
          </p>
          <p className="mt-2 text-xs tabular-nums text-ink-400">
            {t.statAtRiskOf(stats?.activeCount ?? 0)}, {t.statAtRiskHint}
          </p>
        </div>

        <div className="lg:px-8">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.statStudents}</p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-ink-900">
            {stats ? stats.studentCount : '—'}
          </p>
        </div>

        <div className="lg:px-8">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.statAverage}</p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-ink-900">
            {stats?.average === null || !stats ? '—' : Math.round(stats.average * 100)}
            {stats?.average !== null && stats && <span className="text-lg text-ink-300">%</span>}
          </p>
        </div>

        <div className="lg:px-8">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.statWeakest}</p>
          <p className="mt-2 text-base font-semibold text-ink-900">
            {problemSkills[0] ? skillTitle(problemSkills[0].skillId) : t.noData}
          </p>
        </div>
      </div>

      {/*
        Западающие навыки класса.

        Раньше рядом стояла ещё и таблица учеников, но она показывала
        сгенерированный класс, а настоящий список подключённых по коду
        уже стоит выше. Две таблицы подряд, из которых одна постановочная,
        путали сильнее, чем помогали.
      */}
      <div className="mt-10">
        <SectionHeader title={t.problemTitle} description={t.problemDescription} />
        <Panel className="mt-4 p-5">
          {stats === null ? (
            <Skeleton className="h-32 w-full" />
          ) : problemSkills.length === 0 ? (
            <p className="text-sm text-ink-500">{t.noData}</p>
          ) : (
            <div className="space-y-4">
              {problemSkills.map((skill) => (
                <div key={skill.skillId}>
                  <ProgressBar label={skillTitle(skill.skillId)} value={skill.average} />
                  {/*
                    Число попыток рядом с долей — не украшение: 40% по двум
                    попыткам и 40% по сорока требуют разных действий, а без
                    этой подписи они на экране неотличимы.
                  */}
                  <p className="mt-1 text-xs tabular-nums text-ink-400">
                    {t.attemptsLine(skill.attempts, skill.students)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>
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

        <TopicBuilder subject={subject} />
      </div>
    </div>
  );
}
