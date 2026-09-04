'use client';

/**
 * Конструктор темы и заданий для учителя.
 *
 * Что было раньше и почему этого не хватало. Форма делала ровно одно
 * задание, всегда с вариантами ответа, привязывала его к первому навыку
 * предмета наугад — и сохраняла всё это в localStorage самого учителя.
 * То есть ученики созданную тему не получали никогда, а прогресс по ней
 * засчитывался не в тот навык.
 *
 * Здесь по-другому: заданий сколько нужно, ответ бывает числом, навык
 * выбирает автор, и всё уходит на сервер, откуда тему видит вся школа.
 *
 * Главное отличие — проверка. Каждое задание прогоняется теми же
 * правилами, которыми будет проверяться ответ ученика, и автор видит
 * результат до сохранения, а не после первой жалобы. Самая частая
 * поломка: числовой ответ записан как «x = 4», ученик вводит 4 и
 * получает «неверно» за верный ответ.
 */

import { useMemo, useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import { Alert, Button, Card } from '@/components/ui';
import { Icon } from '@/components/Icon';
import {
  TASK_LIMITS,
  problemText,
  validateTask,
  type TaskDraft,
} from '@/lib/taskValidation';
import { DIFFICULTY_LABELS, GRADES } from '@/lib/types';
import type { Difficulty, Grade, Language, Subject } from '@/lib/types';

const TEXT: Record<Language, Record<string, string>> = {
  ru: {
    open: 'Составить тему',
    heading: 'Новая тема',
    lead: 'Тема появится в плане учеников школы наравне с готовым материалом.',
    title: 'Название темы',
    summary: 'О чём тема',
    summaryHint: 'Одно-два предложения: их увидит ученик в списке рекомендаций',
    grade: 'Класс',
    difficulty: 'Сложность',
    minutes: 'Минут на тему',
    tasks: 'Задания',
    addTask: 'Ещё задание',
    removeTask: 'Убрать',
    task: 'Задание',
    kind: 'Тип ответа',
    kindChoice: 'Выбор варианта',
    kindNumeric: 'Число',
    skill: 'Навык',
    skillHint: 'В него засчитается прогресс ученика',
    prompt: 'Условие',
    options: 'Варианты ответа',
    markCorrect: 'верный',
    addOption: 'Ещё вариант',
    value: 'Правильный ответ',
    valueHint: 'Только значение: 5 или 0,5. Запятая и точка равнозначны',
    hint: 'Подсказка (необязательно)',
    explanation: 'Разбор решения',
    explanationHint: 'Ученик видит его после ответа, наставник опирается на него в объяснении',
    ready: 'Проверено, можно сохранять',
    save: 'Опубликовать тему',
    saving: 'Публикуем…',
    cancel: 'Отмена',
    done: 'Тема опубликована и доступна ученикам.',
    failed: 'Не удалось сохранить тему.',
  },
  kk: {
    open: 'Тақырып құрастыру',
    heading: 'Жаңа тақырып',
    lead: 'Тақырып мектеп оқушыларының жоспарында дайын материалмен қатар көрінеді.',
    title: 'Тақырып атауы',
    summary: 'Тақырып не туралы',
    summaryHint: 'Бір-екі сөйлем: оқушы оны ұсыныстар тізімінде көреді',
    grade: 'Сынып',
    difficulty: 'Қиындық',
    minutes: 'Тақырыпқа минут',
    tasks: 'Тапсырмалар',
    addTask: 'Тағы тапсырма',
    removeTask: 'Алып тастау',
    task: 'Тапсырма',
    kind: 'Жауап түрі',
    kindChoice: 'Нұсқаны таңдау',
    kindNumeric: 'Сан',
    skill: 'Дағды',
    skillHint: 'Оқушының прогресі соған есептеледі',
    prompt: 'Шарт',
    options: 'Жауап нұсқалары',
    markCorrect: 'дұрыс',
    addOption: 'Тағы нұсқа',
    value: 'Дұрыс жауап',
    valueHint: 'Тек мәні: 5 немесе 0,5. Үтір мен нүкте бірдей',
    hint: 'Кеңес (міндетті емес)',
    explanation: 'Шешімнің талдауы',
    explanationHint: 'Оқушы оны жауаптан кейін көреді, тәлімгер де соған сүйенеді',
    ready: 'Тексерілді, сақтауға болады',
    save: 'Тақырыпты жариялау',
    saving: 'Жариялануда…',
    cancel: 'Болдырмау',
    done: 'Тақырып жарияланды және оқушыларға қолжетімді.',
    failed: 'Тақырыпты сақтау мүмкін болмады.',
  },
  en: {
    open: 'Build a topic',
    heading: 'New topic',
    lead: "The topic appears in students' plans alongside the built-in material.",
    title: 'Topic title',
    summary: 'What it covers',
    summaryHint: 'One or two sentences — students see this in their recommendations',
    grade: 'Grade',
    difficulty: 'Difficulty',
    minutes: 'Minutes per topic',
    tasks: 'Tasks',
    addTask: 'Add task',
    removeTask: 'Remove',
    task: 'Task',
    kind: 'Answer type',
    kindChoice: 'Multiple choice',
    kindNumeric: 'Number',
    skill: 'Skill',
    skillHint: 'Student progress is recorded against it',
    prompt: 'Question',
    options: 'Answer options',
    markCorrect: 'correct',
    addOption: 'Add option',
    value: 'Correct answer',
    valueHint: 'Value only: 5 or 0.5. Comma and dot are equivalent',
    hint: 'Hint (optional)',
    explanation: 'Solution',
    explanationHint: 'Students see it after answering, and the mentor builds on it',
    ready: 'Checked — ready to publish',
    save: 'Publish topic',
    saving: 'Publishing…',
    cancel: 'Cancel',
    done: 'Topic published and available to students.',
    failed: 'Could not save the topic.',
  },
};

function emptyTask(skillId: string): TaskDraft {
  return {
    kind: 'single',
    prompt: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    correctValue: '',
    hint: '',
    explanation: '',
    skillId,
    difficulty: 3,
  };
}

export function TopicBuilder({ subject, onPublished }: { subject: Subject; onPublished?: () => void }) {
  const { state } = useStore();
  const t = TEXT[state.language];
  const firstSkill = subject.skills[0]?.id ?? '';

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [grade, setGrade] = useState<Grade>(9);
  const [difficulty, setDifficulty] = useState<Difficulty>(3);
  const [minutes, setMinutes] = useState(20);
  const [tasks, setTasks] = useState<TaskDraft[]>([emptyTask(firstSkill)]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  /*
    Проверка идёт на каждый ввод, но показывается только у тех заданий,
    которые автор уже начал заполнять. Красное под пустым полем, к
    которому ещё не притрагивались, — это не помощь, а упрёк.
  */
  const checks = useMemo(
    () => tasks.map((task) => ({ touched: task.prompt.trim() !== '', problems: validateTask(task) })),
    [tasks],
  );

  const headerValid = title.trim().length >= 3 && summary.trim().length >= 10;
  const allValid = headerValid && checks.every((check) => check.problems.length === 0);

  function patch(index: number, change: Partial<TaskDraft>) {
    setTasks((current) => current.map((task, i) => (i === index ? { ...task, ...change } : task)));
  }

  async function publish() {
    setStatus('saving');
    const response = await fetch('/api/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subjectId: subject.id,
        title: title.trim(),
        summary: summary.trim(),
        grades: [grade],
        difficulty,
        estimatedMinutes: minutes,
        tasks,
      }),
    }).catch(() => null);

    if (!response || !response.ok) {
      setStatus('error');
      return;
    }

    setTitle('');
    setSummary('');
    setTasks([emptyTask(firstSkill)]);
    setStatus('done');
    setOpen(false);
    onPublished?.();
  }

  if (!open) {
    return (
      <div>
        {status === 'done' && (
          <div className="mb-4">
            <Alert tone="success">{t.done}</Alert>
          </div>
        )}
        <Button onClick={() => setOpen(true)}>
          <Icon name="plus" size={16} />
          {t.open}
        </Button>
      </div>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium text-ink-900">{t.heading}</h3>
      <p className="mt-1 max-w-prose text-sm text-ink-500">{t.lead}</p>

      {/* --- Шапка темы --- */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="block text-sm font-medium text-ink-800">{t.title}</span>
          <input
            className="t-input mt-1.5 w-full"
            value={title}
            maxLength={160}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className="sm:col-span-2">
          <span className="block text-sm font-medium text-ink-800">{t.summary}</span>
          <textarea
            className="t-input mt-1.5 w-full"
            rows={2}
            value={summary}
            maxLength={600}
            onChange={(event) => setSummary(event.target.value)}
          />
          <span className="mt-1 block text-xs text-ink-400">{t.summaryHint}</span>
        </label>

        <label>
          <span className="block text-sm font-medium text-ink-800">{t.grade}</span>
          <select
            className="t-input mt-1.5 w-full"
            value={grade}
            onChange={(event) => setGrade(Number(event.target.value) as Grade)}
          >
            {GRADES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="block text-sm font-medium text-ink-800">{t.difficulty}</span>
          <select
            className="t-input mt-1.5 w-full"
            value={difficulty}
            onChange={(event) => setDifficulty(Number(event.target.value) as Difficulty)}
          >
            {([1, 2, 3, 4, 5] as Difficulty[]).map((value) => (
              <option key={value} value={value}>
                {value} — {DIFFICULTY_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="block text-sm font-medium text-ink-800">{t.minutes}</span>
          <input
            type="number"
            min={5}
            max={180}
            className="t-input mt-1.5 w-full"
            value={minutes}
            onChange={(event) => setMinutes(Number(event.target.value))}
          />
        </label>
      </div>

      {/* --- Задания --- */}
      <div className="mt-8 flex items-center justify-between">
        <h4 className="text-sm font-medium uppercase tracking-[0.14em] text-ink-500">{t.tasks}</h4>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setTasks((current) => [...current, emptyTask(firstSkill)])}
        >
          {t.addTask}
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-5">
        {tasks.map((task, index) => {
          const check = checks[index];
          const showProblems = check.touched && check.problems.length > 0;

          return (
            <div key={index} className="rounded-[var(--radius-card)] border border-ink-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-700">
                  {t.task} {index + 1}
                </span>
                <div className="flex items-center gap-2">
                  {check.touched && check.problems.length === 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-success-700">
                      <Icon name="check" size={13} />
                      {t.ready}
                    </span>
                  )}
                  {tasks.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setTasks((current) => current.filter((_, i) => i !== index))}
                    >
                      {t.removeTask}
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="block text-sm font-medium text-ink-800">{t.kind}</span>
                  <select
                    className="t-input mt-1.5 w-full"
                    value={task.kind}
                    onChange={(event) => patch(index, { kind: event.target.value as TaskDraft['kind'] })}
                  >
                    <option value="single">{t.kindChoice}</option>
                    <option value="numeric">{t.kindNumeric}</option>
                  </select>
                </label>

                <label>
                  <span className="block text-sm font-medium text-ink-800">{t.skill}</span>
                  <select
                    className="t-input mt-1.5 w-full"
                    value={task.skillId}
                    onChange={(event) => patch(index, { skillId: event.target.value })}
                  >
                    {subject.skills.map((skill) => (
                      <option key={skill.id} value={skill.id}>
                        {skill.title}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs text-ink-400">{t.skillHint}</span>
                </label>
              </div>

              <label className="mt-3 block">
                <span className="block text-sm font-medium text-ink-800">{t.prompt}</span>
                <textarea
                  className="t-input mt-1.5 w-full"
                  rows={2}
                  value={task.prompt}
                  maxLength={TASK_LIMITS.prompt}
                  onChange={(event) => patch(index, { prompt: event.target.value })}
                />
              </label>

              {task.kind === 'single' ? (
                <div className="mt-3">
                  <span className="block text-sm font-medium text-ink-800">{t.options}</span>
                  <div className="mt-2 flex flex-col gap-2">
                    {task.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center gap-2">
                        {/*
                          Верный вариант отмечается радиокнопкой рядом с
                          самим текстом, а не выбором номера в отдельном
                          поле: номер приходится сверять глазами, и
                          ошибиться в нём легче всего.
                        */}
                        <input
                          type="radio"
                          name={`correct-${index}`}
                          checked={task.correctIndex === optionIndex}
                          onChange={() => patch(index, { correctIndex: optionIndex })}
                          aria-label={`${optionIndex + 1} — ${t.markCorrect}`}
                          className="h-4 w-4 shrink-0 accent-[var(--color-brand-600)]"
                        />
                        <input
                          className="t-input w-full"
                          value={option}
                          maxLength={TASK_LIMITS.option}
                          placeholder={`${optionIndex + 1}`}
                          onChange={(event) =>
                            patch(index, {
                              options: task.options.map((item, i) =>
                                i === optionIndex ? event.target.value : item,
                              ),
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                  {task.options.length < TASK_LIMITS.optionsMax && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2"
                      onClick={() => patch(index, { options: [...task.options, ''] })}
                    >
                      {t.addOption}
                    </Button>
                  )}
                </div>
              ) : (
                <label className="mt-3 block">
                  <span className="block text-sm font-medium text-ink-800">{t.value}</span>
                  <input
                    className="t-input mt-1.5 w-full"
                    value={task.correctValue}
                    maxLength={TASK_LIMITS.option}
                    onChange={(event) => patch(index, { correctValue: event.target.value })}
                  />
                  <span className="mt-1 block text-xs text-ink-400">{t.valueHint}</span>
                </label>
              )}

              <label className="mt-3 block">
                <span className="block text-sm font-medium text-ink-800">{t.explanation}</span>
                <textarea
                  className="t-input mt-1.5 w-full"
                  rows={3}
                  value={task.explanation}
                  maxLength={TASK_LIMITS.explanation}
                  onChange={(event) => patch(index, { explanation: event.target.value })}
                />
                <span className="mt-1 block text-xs text-ink-400">{t.explanationHint}</span>
              </label>

              <label className="mt-3 block">
                <span className="block text-sm font-medium text-ink-800">{t.hint}</span>
                <input
                  className="t-input mt-1.5 w-full"
                  value={task.hint}
                  maxLength={TASK_LIMITS.hint}
                  onChange={(event) => patch(index, { hint: event.target.value })}
                />
              </label>

              {showProblems && (
                <ul className="mt-3 flex flex-col gap-1.5">
                  {check.problems.map((problem, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-danger-700">
                      <Icon name="close" size={14} className="mt-0.5 shrink-0" />
                      {problemText(problem, state.language)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {status === 'error' && (
        <div className="mt-5">
          <Alert tone="danger">{t.failed}</Alert>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={publish} disabled={!allValid || status === 'saving'}>
          {status === 'saving' ? t.saving : t.save}
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          {t.cancel}
        </Button>
      </div>
    </Card>
  );
}
