'use client';

/**
 * Форма публикации материала архива учителем или админом.
 *
 * PDF — необязательное приложение для скачивания, а метод Сократа работает
 * по заданиям, которые автор вводит здесь вручную (текст, ответ, разбор).
 * Автоматически вытащить задания из PDF мы не умеем — для этого нужен
 * RAG или OCR, которых в MVP нет, — поэтому автор описывает задания сам,
 * ровно в том же формате, что и у стандартного архива.
 */

import { useRef, useState } from 'react';
import { SUBJECTS } from '@/data';
import { ARCHIVE_CATEGORIES } from '@/lib/archive';
import type { ArchiveCategory } from '@/lib/archive';
import type { Language } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui';
import { Icon } from './Icon';
import { MathKeys } from './MathKeys';
import type { ArchiveTaskKind } from '@/lib/archive';

interface DraftTask {
  id: string;
  /** Открытый ответ, выбор варианта или выбор нескольких. */
  kind: ArchiveTaskKind;
  prompt: string;
  answer: string;
  unit: string;
  opening: string;
  explanation: string;
  /** Варианты — только для выбора. */
  options: string[];
  /** Номера верных вариантов. Для одиночного выбора в списке ровно один. */
  correct: number[];
}

function emptyTask(): DraftTask {
  return {
    id: crypto.randomUUID(),
    kind: 'open',
    prompt: '',
    answer: '',
    unit: '',
    opening: '',
    explanation: '',
    options: ['', '', '', ''],
    correct: [0],
  };
}

/**
 * Заполнено ли задание настолько, чтобы его можно было решать.
 *
 * У видов разные требования, и это не придирка: открытому заданию нужен
 * эталонный ответ и первый наводящий вопрос, потому что оно ведётся
 * диалогом. Заданию с вариантами наводящий вопрос не нужен вовсе —
 * подводить там не к чему, ученик выбирает из готового списка.
 */
function taskReady(task: DraftTask): boolean {
  if (!task.prompt.trim() || !task.explanation.trim()) return false;
  if (task.kind === 'open') return Boolean(task.answer.trim() && task.opening.trim());
  const filled = task.options.filter((option) => option.trim() !== '');
  if (filled.length < 2) return false;
  return task.correct.length > 0 && task.correct.every((index) => index < filled.length);
}

const TEXT = {
  ru: {
    title: 'Название материала',
    titlePlaceholder: 'Например: Пробный ЕНТ по физике, вариант 3',
    category: 'Категория',
    subject: 'Предмет',
    difficulty: 'Сложность',
    year: 'Год',
    source: 'Источник',
    sourcePlaceholder: 'Например: составлено учителем школы',
    grades: 'Классы (через запятую)',
    description: 'Описание (необязательно)',
    file: 'PDF-файл (необязательно, для скачивания)',
    tasksTitle: 'Задания для метода Сократа',
    tasksHint: 'Нужно хотя бы одно задание — иначе наставник не сможет вести разбор.',
    addTask: 'Добавить задание',
    removeTask: 'Удалить',
    prompt: 'Условие',
    answer: 'Правильный ответ',
    unit: 'Единица (необязательно)',
    opening: 'Первый наводящий вопрос наставника',
    explanation: 'Полное решение (для кнопки «Показать разбор»)',
    publish: 'Опубликовать',
    publishing: 'Публикуем…',
    done: 'Материал опубликован и виден в архиве.',
    error: 'Не получилось опубликовать. Проверьте поля.',
    needTask: 'Заполните хотя бы одно задание полностью или приложите файл.',
    withTasks: 'С заданиями',
    fileOnly: 'Только файл',
    modeHint: 'Материал можно выложить и без заданий — одним файлом.',
    fileRequired: 'Приложите файл: без заданий материал состоит только из него.',
    kind: 'Вид задания',
    kindOpen: 'Открытый ответ',
    kindSingle: 'Один верный вариант',
    kindMultiple: 'Несколько верных',
    options: 'Варианты ответа',
    markCorrect: 'верный',
    addOption: 'Ещё вариант',
  },
} as const;

export function ArchiveMaterialPublishForm({
  language,
  userId,
  onPublished,
}: {
  language: Language;
  userId: string;
  onPublished: () => void;
}) {
  const t = TEXT.ru;
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ArchiveCategory>('ent');
  const [subjectId, setSubjectId] = useState(SUBJECTS[0]?.id ?? '');
  const [difficulty, setDifficulty] = useState(3);
  const [year, setYear] = useState(new Date().getFullYear());
  const [source, setSource] = useState('');
  const [grades, setGrades] = useState('9,10,11');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [tasks, setTasks] = useState<DraftTask[]>([emptyTask()]);
  /*
    Режим материала. «Только файл» — не упрощение ради упрощения: у
    учителя часто уже есть готовый сборник в PDF, и требовать к нему
    выдуманные задания значит либо получить пустышки, либо не получить
    материал вовсе.
  */
  const [withTasks, setWithTasks] = useState(true);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error' | 'need-task'>('idle');

  function updateTask(id: string, patch: Partial<DraftTask>) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...patch } : task)));
  }

  async function submit() {
    const validTasks = withTasks ? tasks.filter(taskReady) : [];
    /*
      Материал обязан нести хоть что-то: либо задания, либо файл. Пустая
      строка в списке архива только мешает искать.
    */
    if (!title.trim() || (validTasks.length === 0 && !file)) {
      setStatus('need-task');
      return;
    }
    setStatus('sending');

    const supabase = createClient();
    let filePath: string | null = null;
    if (file) {
      const path = `${userId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('archive-materials').upload(path, file);
      if (uploadError) {
        setStatus('error');
        return;
      }
      filePath = path;
    }

    const gradeList = grades
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item) && item > 0);

    const { error } = await supabase.from('archive_materials').insert({
      teacher_id: userId,
      title,
      category,
      subject: subjectId,
      difficulty,
      year,
      source,
      grades: gradeList,
      description,
      file_path: filePath,
      tasks: validTasks.map((task) => {
        const filled = task.options.map((option) => option.trim()).filter(Boolean);
        return {
          id: task.id,
          kind: task.kind,
          prompt: task.prompt,
          /*
            У задания с вариантами эталонный ответ — текст верного
            варианта. Так разбор наставника и подпись «правильный ответ»
            работают одинаково для всех видов, без отдельной ветки.
          */
          answer: task.kind === 'open' ? task.answer : task.correct.map((i) => filled[i]).join(', '),
          options: task.kind === 'open' ? undefined : filled,
          correctIndexes: task.kind === 'open' ? undefined : task.correct,
          unit: task.unit || undefined,
          opening: task.opening,
          explanation: task.explanation,
        };
      }),
    });

    if (error) {
      setStatus('error');
      return;
    }

    setStatus('done');
    setTitle('');
    setDescription('');
    setFile(null);
    setTasks([emptyTask()]);
    onPublished();
  }

  return (
    <div className="space-y-4">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.titlePlaceholder} className={inputCls} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <select value={category} onChange={(e) => setCategory(e.target.value as ArchiveCategory)} className={inputCls}>
          {ARCHIVE_CATEGORIES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title[language]}
            </option>
          ))}
        </select>
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={inputCls}>
          {SUBJECTS.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.title}
            </option>
          ))}
        </select>
        <select value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} className={inputCls}>
          {[1, 2, 3, 4, 5].map((level) => (
            <option key={level} value={level}>
              {t.difficulty} {level}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          placeholder={t.year}
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input value={source} onChange={(e) => setSource(e.target.value)} placeholder={t.sourcePlaceholder} className={inputCls} />
        <input value={grades} onChange={(e) => setGrades(e.target.value)} placeholder={t.grades} className={inputCls} />
      </div>

      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.description} rows={2} className={inputCls} />

      <div>
        <label className="text-sm font-semibold text-ink-700" htmlFor="material-file">
          {t.file}
        </label>
        <input
          id="material-file"
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-2 block text-sm text-ink-600"
        />
      </div>

      <div className="border-t border-ink-200 pt-4">
        {/*
          Переключатель режима стоит ПЕРЕД списком заданий, а не галочкой
          под ним: решение «с заданиями или без» принимается раньше, чем
          человек начнёт их заполнять, и предлагать его после десяти
          заполненных полей означало бы обесценить уже сделанную работу.
        */}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={withTasks ? 'primary' : 'secondary'} onClick={() => setWithTasks(true)}>
            {t.withTasks}
          </Button>
          <Button size="sm" variant={withTasks ? 'secondary' : 'primary'} onClick={() => setWithTasks(false)}>
            {t.fileOnly}
          </Button>
        </div>
        <p className="mt-2 text-xs text-ink-400">{withTasks ? t.tasksHint : t.fileRequired}</p>

        {withTasks && (
          <>
            <p className="mt-4 font-semibold text-ink-800">{t.tasksTitle}</p>
            <div className="mt-3 space-y-4">
              {tasks.map((task, index) => (
                <TaskFields
                  key={task.id}
                  task={task}
                  index={index}
                  removable={tasks.length > 1}
                  t={t}
                  inputCls={inputCls}
                  onChange={(patch) => updateTask(task.id, patch)}
                  onRemove={() => setTasks((current) => current.filter((item) => item.id !== task.id))}
                />
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => setTasks((current) => [...current, emptyTask()])}
            >
              <Icon name="plus" size={16} />
              {t.addTask}
            </Button>
          </>
        )}
      </div>

      {status === 'done' && <p className="text-sm font-semibold text-success-700">{t.done}</p>}
      {status === 'error' && <p className="text-sm font-semibold text-danger-600">{t.error}</p>}
      {status === 'need-task' && <p className="text-sm font-semibold text-danger-600">{t.needTask}</p>}

      <Button onClick={submit} disabled={status === 'sending'}>
        {status === 'sending' ? t.publishing : t.publish}
      </Button>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-ink-200 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

/**
 * Поля одного задания.
 *
 * Вынесено отдельным компонентом ради ссылки на поле условия: клавиша
 * математического знака вставляет символ по месту курсора, а значит ей
 * нужен доступ именно к тому полю, рядом с которым она стоит. Держать
 * массив ссылок в родителе означало бы синхронизировать его с массивом
 * заданий при каждом добавлении и удалении.
 */
function TaskFields({
  task,
  index,
  removable,
  t,
  inputCls,
  onChange,
  onRemove,
}: {
  task: DraftTask;
  index: number;
  removable: boolean;
  t: Record<string, string>;
  inputCls: string;
  onChange: (patch: Partial<DraftTask>) => void;
  onRemove: () => void;
}) {
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const choice = task.kind !== 'open';

  function toggleCorrect(optionIndex: number) {
    if (task.kind === 'single') {
      onChange({ correct: [optionIndex] });
      return;
    }
    const next = task.correct.includes(optionIndex)
      ? task.correct.filter((i) => i !== optionIndex)
      : [...task.correct, optionIndex].sort((a, b) => a - b);
    onChange({ correct: next });
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-ink-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-medium tabular-nums text-ink-400">#{index + 1}</span>
        <div className="flex items-center gap-2">
          <select
            value={task.kind}
            onChange={(event) => {
              const kind = event.target.value as ArchiveTaskKind;
              // При переходе к одиночному выбору оставляем ровно один
              // верный вариант: два «единственно верных» — бессмыслица.
              onChange({ kind, correct: kind === 'single' ? task.correct.slice(0, 1) : task.correct });
            }}
            className="rounded-[var(--radius-control)] border border-ink-200 px-2 py-1.5 text-sm text-ink-800"
            aria-label={t.kind}
          >
            <option value="open">{t.kindOpen}</option>
            <option value="single">{t.kindSingle}</option>
            <option value="multiple">{t.kindMultiple}</option>
          </select>
          {removable && (
            <button
              type="button"
              onClick={onRemove}
              className="flex items-center gap-1 text-xs font-medium text-danger-600 hover:underline"
            >
              <Icon name="close" size={12} />
              {t.removeTask}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <textarea
          ref={promptRef}
          value={task.prompt}
          onChange={(e) => onChange({ prompt: e.target.value })}
          placeholder={t.prompt}
          rows={2}
          className={inputCls}
        />
        {/* Клавиатура знаков стоит под условием — именно там она нужна. */}
        <MathKeys target={promptRef} onInsert={(value) => onChange({ prompt: value })} />

        {choice ? (
          <div className="pt-1">
            <p className="text-sm font-medium text-ink-800">{t.options}</p>
            <div className="mt-2 space-y-2">
              {task.options.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center gap-2">
                  <input
                    type={task.kind === 'single' ? 'radio' : 'checkbox'}
                    name={`correct-${task.id}`}
                    checked={task.correct.includes(optionIndex)}
                    onChange={() => toggleCorrect(optionIndex)}
                    aria-label={`${optionIndex + 1} — ${t.markCorrect}`}
                    className="h-4 w-4 shrink-0 accent-[var(--color-brand-600)]"
                  />
                  <input
                    value={option}
                    onChange={(e) =>
                      onChange({
                        options: task.options.map((item, i) => (i === optionIndex ? e.target.value : item)),
                      })
                    }
                    placeholder={`${optionIndex + 1}`}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
            {task.options.length < 6 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => onChange({ options: [...task.options, ''] })}
              >
                {t.addOption}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={task.answer}
                onChange={(e) => onChange({ answer: e.target.value })}
                placeholder={t.answer}
                className={inputCls}
              />
              <input
                value={task.unit}
                onChange={(e) => onChange({ unit: e.target.value })}
                placeholder={t.unit}
                className={inputCls}
              />
            </div>
            <textarea
              value={task.opening}
              onChange={(e) => onChange({ opening: e.target.value })}
              placeholder={t.opening}
              rows={2}
              className={inputCls}
            />
          </>
        )}

        <textarea
          value={task.explanation}
          onChange={(e) => onChange({ explanation: e.target.value })}
          placeholder={t.explanation}
          rows={2}
          className={inputCls}
        />
      </div>
    </div>
  );
}
