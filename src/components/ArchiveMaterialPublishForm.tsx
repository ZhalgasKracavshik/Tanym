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

import { useState } from 'react';
import { SUBJECTS } from '@/data';
import { ARCHIVE_CATEGORIES } from '@/lib/archive';
import type { ArchiveCategory } from '@/lib/archive';
import type { Language } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui';
import { Icon } from './Icon';

interface DraftTask {
  id: string;
  prompt: string;
  answer: string;
  unit: string;
  opening: string;
  explanation: string;
}

function emptyTask(): DraftTask {
  return { id: crypto.randomUUID(), prompt: '', answer: '', unit: '', opening: '', explanation: '' };
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
    needTask: 'Заполните хотя бы одно задание полностью.',
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
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error' | 'need-task'>('idle');

  function updateTask(id: string, patch: Partial<DraftTask>) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...patch } : task)));
  }

  async function submit() {
    const validTasks = tasks.filter(
      (task) => task.prompt.trim() && task.answer.trim() && task.opening.trim() && task.explanation.trim(),
    );
    if (validTasks.length === 0 || !title.trim()) {
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
      file_path: filePath ?? '',
      tasks: validTasks.map((task) => ({
        id: task.id,
        prompt: task.prompt,
        answer: task.answer,
        unit: task.unit || undefined,
        opening: task.opening,
        explanation: task.explanation,
      })),
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
        <p className="font-semibold text-ink-800">{t.tasksTitle}</p>
        <p className="mt-1 text-xs text-ink-400">{t.tasksHint}</p>

        <div className="mt-3 space-y-4">
          {tasks.map((task, index) => (
            <div key={task.id} className="rounded-xl border border-ink-200 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-ink-400">#{index + 1}</span>
                {tasks.length > 1 && (
                  <button
                    onClick={() => setTasks((current) => current.filter((item) => item.id !== task.id))}
                    className="flex items-center gap-1 text-xs font-semibold text-danger-600 hover:underline"
                  >
                    <Icon name="close" size={12} />
                    {t.removeTask}
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <textarea
                  value={task.prompt}
                  onChange={(e) => updateTask(task.id, { prompt: e.target.value })}
                  placeholder={t.prompt}
                  rows={2}
                  className={inputCls}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={task.answer}
                    onChange={(e) => updateTask(task.id, { answer: e.target.value })}
                    placeholder={t.answer}
                    className={inputCls}
                  />
                  <input
                    value={task.unit}
                    onChange={(e) => updateTask(task.id, { unit: e.target.value })}
                    placeholder={t.unit}
                    className={inputCls}
                  />
                </div>
                <textarea
                  value={task.opening}
                  onChange={(e) => updateTask(task.id, { opening: e.target.value })}
                  placeholder={t.opening}
                  rows={2}
                  className={inputCls}
                />
                <textarea
                  value={task.explanation}
                  onChange={(e) => updateTask(task.id, { explanation: e.target.value })}
                  placeholder={t.explanation}
                  rows={2}
                  className={inputCls}
                />
              </div>
            </div>
          ))}
        </div>

        <Button variant="ghost" size="sm" className="mt-3" onClick={() => setTasks((current) => [...current, emptyTask()])}>
          <Icon name="plus" size={16} />
          {t.addTask}
        </Button>
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
