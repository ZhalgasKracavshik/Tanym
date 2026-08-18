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
import { Alert, Button, Card } from '@/components/ui';

export function AddTopicForm({ subject }: { subject: Subject }) {
  const { addCustomTopic } = useStore();

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
            <Alert tone="success">Тема добавлена — она уже доступна ученикам.</Alert>
          </div>
        )}
        <Button onClick={() => setOpen(true)}>+ Добавить тему</Button>
      </div>
    );
  }

  return (
    <Card className="space-y-5">
      <h3 className="font-bold text-ink-900">Новая тема по предмету «{subject.title}»</h3>

      <Field label="Название темы">
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Например, Формулы сокращённого умножения"
          className={INPUT}
        />
      </Field>

      <Field label="Краткое описание">
        <textarea
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          rows={2}
          placeholder="О чём тема и зачем она нужна"
          className={INPUT}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Класс">
          <select value={grade} onChange={(e) => setGrade(Number(e.target.value) as Grade)} className={INPUT}>
            {GRADES.map((item) => (
              <option key={item} value={item}>
                {item} класс
              </option>
            ))}
          </select>
        </Field>

        <Field label="Сложность">
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

        <Field label="Минут на тему">
          <input
            type="number"
            min={5}
            max={90}
            value={minutes}
            onChange={(event) => setMinutes(Number(event.target.value))}
            className={INPUT}
          />
        </Field>
      </div>

      <div className="border-t border-ink-200 pt-5">
        <h4 className="font-bold text-ink-900">Задание</h4>

        <Field label="Вопрос" className="mt-3">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={2}
            className={INPUT}
          />
        </Field>

        <p className="mt-4 text-sm font-semibold text-ink-800">
          Варианты ответа — отметьте правильный
        </p>
        <div className="mt-2 space-y-2">
          {options.map((option, index) => (
            <label key={index} className="flex items-center gap-3">
              <input
                type="radio"
                name="correct"
                checked={correctIndex === index}
                onChange={() => setCorrectIndex(index)}
                className="h-4 w-4 accent-[var(--color-brand-500)]"
                aria-label={`Вариант ${index + 1} — правильный`}
              />
              <input
                type="text"
                value={option}
                onChange={(event) => setOption(index, event.target.value)}
                placeholder={`Вариант ${index + 1}`}
                className={INPUT}
              />
            </label>
          ))}
        </div>

        <Field label="Объяснение решения" className="mt-4">
          <textarea
            value={explanation}
            onChange={(event) => setExplanation(event.target.value)}
            rows={3}
            placeholder="Его увидит ученик после ответа, и на него опирается AI-разбор"
            className={INPUT}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={save} disabled={!canSave}>
          Добавить тему
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Отмена
        </Button>
      </div>
    </Card>
  );
}

const INPUT =
  'w-full rounded-xl border border-ink-200 px-4 py-2.5 text-ink-900 outline-none focus:border-brand-500';

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
