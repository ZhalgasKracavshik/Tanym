'use client';

/**
 * Форма добавления темы учителем.
 *
 * Форма собирает объект того же типа Topic, что и встроенный контент, — поэтому
 * добавленная тема работает везде: попадает в рекомендации, открывается на
 * странице изучения, участвует в подсчёте прогресса. Никакого «второго сорта»
 * для пользовательского контента нет, и это осознанное решение: иначе учителю
 * пришлось бы объяснять, почему его тема ведёт себя иначе.
 */

import { useState } from 'react';
import { createId } from '@/lib/storage';
import type { Difficulty, Grade, Subject, Task, Topic } from '@/lib/types';
import { GRADES } from '@/lib/types';
import { useStore } from '@/components/StoreProvider';
import type { Dict } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { Alert, Button, Card } from '@/components/ui';

/** Подписи формы на трёх языках. Ключи одинаковые — за этим следит TypeScript. */
const TEXT: Dict<{
  added: string;
  addTopic: string;
  formTitle: (subject: string) => string;
  titleLabel: string;
  titlePlaceholder: string;
  summaryLabel: string;
  summaryPlaceholder: string;
  gradeLabel: string;
  gradeOption: (n: number) => string;
  difficultyLabel: string;
  minutesLabel: string;
  taskTitle: string;
  questionLabel: string;
  optionsHint: string;
  optionCorrect: (n: number) => string;
  optionPlaceholder: (n: number) => string;
  explanationLabel: string;
  explanationPlaceholder: string;
  submit: string;
  cancel: string;
}> = {
  ru: {
    added: 'Тема добавлена, она уже доступна ученикам.',
    addTopic: 'Добавить тему',
    formTitle: (subject) => `Новая тема по предмету «${subject}»`,
    titleLabel: 'Название темы',
    titlePlaceholder: 'Например, Формулы сокращённого умножения',
    summaryLabel: 'Краткое описание',
    summaryPlaceholder: 'О чём тема и зачем она нужна',
    gradeLabel: 'Класс',
    gradeOption: (n) => `${n} класс`,
    difficultyLabel: 'Сложность',
    minutesLabel: 'Минут на тему',
    taskTitle: 'Задание',
    questionLabel: 'Вопрос',
    optionsHint: 'Варианты ответа: отметьте правильный',
    optionCorrect: (n) => `Правильный ответ: вариант ${n}`,
    optionPlaceholder: (n) => `Вариант ${n}`,
    explanationLabel: 'Объяснение решения',
    explanationPlaceholder: 'Его увидит ученик после ответа, и на него опирается AI-разбор',
    submit: 'Добавить тему',
    cancel: 'Отмена',
  },
  kk: {
    added: 'Тақырып қосылды, ол оқушыларға қазірден қолжетімді.',
    addTopic: 'Тақырып қосу',
    formTitle: (subject) => `«${subject}» пәні бойынша жаңа тақырып`,
    titleLabel: 'Тақырып атауы',
    titlePlaceholder: 'Мысалы, Қысқаша көбейту формулалары',
    summaryLabel: 'Қысқаша сипаттама',
    summaryPlaceholder: 'Тақырып не туралы және ол не үшін қажет',
    gradeLabel: 'Сынып',
    gradeOption: (n) => `${n}-сынып`,
    difficultyLabel: 'Күрделілігі',
    minutesLabel: 'Тақырыпқа минут',
    taskTitle: 'Тапсырма',
    questionLabel: 'Сұрақ',
    optionsHint: 'Жауап нұсқалары: дұрысын белгілеңіз',
    optionCorrect: (n) => `Дұрыс жауап: ${n}-нұсқа`,
    optionPlaceholder: (n) => `${n}-нұсқа`,
    explanationLabel: 'Шешімнің түсіндірмесі',
    explanationPlaceholder: 'Оны оқушы жауап бергеннен кейін көреді, AI-талдау да соған сүйенеді',
    submit: 'Тақырып қосу',
    cancel: 'Болдырмау',
  },
  en: {
    added: 'Topic added, students can already see it.',
    addTopic: 'Add topic',
    formTitle: (subject) => `New topic in “${subject}”`,
    titleLabel: 'Topic title',
    titlePlaceholder: 'For example, Special product formulas',
    summaryLabel: 'Short description',
    summaryPlaceholder: 'What the topic covers and why it matters',
    gradeLabel: 'Grade',
    gradeOption: (n) => `Grade ${n}`,
    difficultyLabel: 'Difficulty',
    minutesLabel: 'Minutes per topic',
    taskTitle: 'Task',
    questionLabel: 'Question',
    optionsHint: 'Answer options: mark the correct one',
    optionCorrect: (n) => `Option ${n} is correct`,
    optionPlaceholder: (n) => `Option ${n}`,
    explanationLabel: 'Solution explanation',
    explanationPlaceholder: 'Students see it after answering, and the AI explanation builds on it',
    submit: 'Add topic',
    cancel: 'Cancel',
  },
};

export function AddTopicForm({ subject }: { subject: Subject }) {
  const { state, addCustomTopic } = useStore();
  const t = TEXT[state.language];

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [grade, setGrade] = useState<Grade>(9);
  const [difficulty, setDifficulty] = useState<Difficulty>(3);
  const [minutes, setMinutes] = useState(20);

  // Одно задание — обязательный минимум, иначе тему нечего решать.
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [explanation, setExplanation] = useState('');

  const [saved, setSaved] = useState(false);

  const canSave =
    title.trim() !== '' &&
    summary.trim() !== '' &&
    question.trim() !== '' &&
    options.every((option) => option.trim() !== '') &&
    explanation.trim() !== '';

  /** Меняет один вариант ответа, не трогая остальные. */
  function setOption(index: number, value: string) {
    setOptions((current) => current.map((item, i) => (i === index ? value : item)));
  }

  function save() {
    const topicId = createId('topic');

    const task: Task = {
      id: `${topicId}.t1`,
      topicId,
      // Привязываем к первому навыку предмета: в форме нет выбора навыка,
      // чтобы не усложнять её, а прогресс всё равно должен куда-то засчитываться.
      skillId: subject.skills[0].id,
      difficulty,
      kind: 'single',
      prompt: question.trim(),
      options: options.map((option) => option.trim()),
      correctIndex,
      hint: 'Перечитай условие и вспомни материал темы.',
      explanation: explanation.trim(),
    };

    const topic: Topic = {
      id: topicId,
      subjectId: subject.id,
      title: title.trim(),
      summary: summary.trim(),
      grades: [grade],
      difficulty,
      skills: [subject.skills[0].id],
      prerequisites: [],
      estimatedMinutes: minutes,
      material: {
        intro: summary.trim(),
        sections: [],
        keyPoints: [summary.trim()],
        examples: [],
      },
      tasks: [task],
      custom: true,
    };

    addCustomTopic(topic);

    // Очищаем форму, чтобы можно было сразу добавить следующую тему.
    setTitle('');
    setSummary('');
    setQuestion('');
    setOptions(['', '', '', '']);
    setCorrectIndex(0);
    setExplanation('');
    setSaved(true);
    setOpen(false);
  }

  if (!open) {
    return (
      <div>
        {saved && (
          <div className="mb-4">
            <Alert tone="success">{t.added}</Alert>
          </div>
        )}
        <Button onClick={() => setOpen(true)}>
          <Icon name="plus" size={18} />
          {t.addTopic}
        </Button>
      </div>
    );
  }

  return (
    <Card className="space-y-5">
      <h3 className="flex items-center gap-2 font-medium text-ink-900">
        <Icon name="pencil" size={18} className="text-brand-600" />
        {t.formTitle(subject.title)}
      </h3>

      <Field label={t.titleLabel}>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t.titlePlaceholder}
          className={INPUT}
        />
      </Field>

      <Field label={t.summaryLabel}>
        <textarea
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          rows={2}
          placeholder={t.summaryPlaceholder}
          className={INPUT}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t.gradeLabel}>
          <select value={grade} onChange={(e) => setGrade(Number(e.target.value) as Grade)} className={INPUT}>
            {GRADES.map((item) => (
              <option key={item} value={item}>
                {t.gradeOption(item)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t.difficultyLabel}>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value) as Difficulty)}
            className={INPUT}
          >
            {[1, 2, 3, 4, 5].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t.minutesLabel}>
          <input
            type="number"
            min={5}
            max={90}
            value={minutes}
            onChange={(event) => setMinutes(Number(event.target.value))}
            className={`${INPUT} tabular-nums`}
          />
        </Field>
      </div>

      <div className="border-t border-ink-200 pt-5">
        <h4 className="flex items-center gap-2 font-medium text-ink-900">
          <Icon name="clipboard" size={18} className="text-ink-400" />
          {t.taskTitle}
        </h4>

        <Field label={t.questionLabel} className="mt-3">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={2}
            className={INPUT}
          />
        </Field>

        <p className="mt-4 text-sm font-semibold text-ink-800">{t.optionsHint}</p>
        <div className="mt-2 space-y-2">
          {options.map((option, index) => (
            <label key={index} className="flex items-center gap-3">
              <input
                type="radio"
                name="correct"
                checked={correctIndex === index}
                onChange={() => setCorrectIndex(index)}
                className="h-4 w-4 accent-[var(--color-brand-500)]"
                aria-label={t.optionCorrect(index + 1)}
              />
              <input
                type="text"
                value={option}
                onChange={(event) => setOption(index, event.target.value)}
                placeholder={t.optionPlaceholder(index + 1)}
                className={INPUT}
              />
            </label>
          ))}
        </div>

        <Field label={t.explanationLabel} className="mt-4">
          <textarea
            value={explanation}
            onChange={(event) => setExplanation(event.target.value)}
            rows={3}
            placeholder={t.explanationPlaceholder}
            className={INPUT}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={save} disabled={!canSave}>
          <Icon name="check" size={18} />
          {t.submit}
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          {t.cancel}
        </Button>
      </div>
    </Card>
  );
}

const INPUT =
  'w-full rounded-xl border border-ink-200 px-4 py-2.5 text-ink-900 outline-none transition-all duration-150 hover:border-ink-300 focus:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500';

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-semibold text-ink-800">{label}</span>
      {children}
    </label>
  );
}
