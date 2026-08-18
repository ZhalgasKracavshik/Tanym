'use client';

/**
 * Изучение темы: теория и задания с разбором ошибок.
 *
 * Это главный цикл продукта: ученик отвечает → сервер проверяет и просит модель
 * объяснить → результат записывается в прогресс → сложность следующих заданий
 * подстраивается. Всё остальное в приложении обслуживает этот цикл.
 */

import { useState } from 'react';
import { getSubject, getTopic } from '@/data';
import { computeSkillMastery, difficultyExplanation, selectTasks } from '@/lib/personalization';
import { DIFFICULTY_LABELS } from '@/lib/types';
import type { FeedbackRequest, FeedbackResponse } from '@/lib/ai/contracts';
import { useStore } from '@/components/StoreProvider';
import { AiBadge } from '@/components/AiBadge';
import { Badge, Button, ButtonLink, Card, EmptyState, Skeleton } from '@/components/ui';

export function LearnClient({ topicId }: { topicId: string }) {
  const { state, hydrated, recordAttempt } = useStore();

  const [tab, setTab] = useState<'theory' | 'tasks'>('theory');
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [solved, setSolved] = useState(0);

  const topic = getTopic(topicId, state.customTopics);
  const subject = getSubject(topic?.subjectId);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!topic || !subject) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          icon="📕"
          title="Тема не найдена"
          description="Возможно, ссылка устарела или тему удалили."
          action={<ButtonLink href="/plan">Вернуться к плану</ButtonLink>}
        />
      </div>
    );
  }

  // Уровень сложности задаёт движок: он растёт и падает по результатам ученика.
  const difficulty = state.difficulty[subject.id] ?? 2;
  const tasks = selectTasks(topic, difficulty, state);
  const task = tasks[index];

  /** Отправляет ответ на проверку и получает разбор. */
  async function submit() {
    if (!task || !topic || !subject) return;

    setLoading(true);
    setShowHint(false);

    const mastery = computeSkillMastery(state)[task.skillId]?.mastery ?? 0.5;
    const body: FeedbackRequest = {
      taskId: task.id,
      topicId: topic.id,
      answer,
      profile: state.profile,
      skillMastery: mastery,
      // Темы, созданные учителем, сервер не знает — они живут в браузере,
      // поэтому такое задание отправляем целиком.
      task: topic.custom ? task : undefined,
    };

    try {
      const response = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data: FeedbackResponse = await response.json();

      setFeedback(data);
      if (data.correct) setSolved((value) => value + 1);

      // Источник истины о правильности — сервер, а не проверка на клиенте.
      recordAttempt(
        {
          taskId: task.id,
          topicId: topic.id,
          skillId: task.skillId,
          subjectId: subject.id,
          difficulty: task.difficulty,
          correct: data.correct,
          answer,
        },
        topic.tasks.length,
      );
    } catch {
      setFeedback({
        text: 'Не удалось связаться с сервером. Проверь интернет и попробуй ещё раз.',
        live: false,
        correct: false,
        correctAnswer: '',
      });
    } finally {
      setLoading(false);
    }
  }

  function next() {
    setFeedback(null);
    setAnswer('');
    setShowHint(false);
    setIndex(index + 1);
  }

  function restart() {
    setFeedback(null);
    setAnswer('');
    setIndex(0);
    setSolved(0);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">
          <span aria-hidden>{subject.icon}</span> {subject.title}
        </Badge>
        {topic.custom && <Badge tone="accent">Тема учителя</Badge>}
      </div>
      <h1 className="mt-3 text-2xl font-bold text-ink-900 sm:text-3xl">{topic.title}</h1>
      <p className="mt-2 text-ink-500">{topic.summary}</p>

      {/* Вкладки */}
      <div className="mt-6 flex gap-2 border-b border-ink-200">
        {(['theory', 'tasks'] as const).map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === item
                ? 'border-brand-500 text-brand-700'
                : 'border-transparent text-ink-400 hover:text-ink-700'
            }`}
          >
            {item === 'theory' ? 'Теория' : `Задания (${tasks.length})`}
          </button>
        ))}
      </div>

      {/* ---------------- Теория ---------------- */}
      {tab === 'theory' && (
        <div className="mt-6 space-y-4">
          <Card>
            <p className="leading-relaxed text-ink-700">{topic.material.intro}</p>
          </Card>

          {topic.material.sections.map((section) => (
            <Card key={section.heading}>
              <h2 className="font-bold text-ink-900">{section.heading}</h2>
              <p className="mt-2 leading-relaxed text-ink-700">{section.body}</p>
              {section.formula && (
                <p className="mt-3 rounded-xl bg-ink-50 px-4 py-3 font-mono text-sm text-ink-800">
                  {section.formula}
                </p>
              )}
            </Card>
          ))}

          {topic.material.keyPoints.length > 0 && (
            <Card className="border-brand-200 bg-brand-50">
              <h2 className="font-bold text-brand-800">Главное запомнить</h2>
              <ul className="mt-3 space-y-2">
                {topic.material.keyPoints.map((point) => (
                  <li key={point} className="text-sm text-brand-800">
                    — {point}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {topic.material.examples.map((example, i) => (
            <Card key={example.problem}>
              <h2 className="font-bold text-ink-900">Пример {i + 1}</h2>
              <p className="mt-2 font-medium text-ink-800">{example.problem}</p>
              <p className="mt-2 leading-relaxed text-ink-600">{example.solution}</p>
            </Card>
          ))}

          <Button size="lg" className="w-full" onClick={() => setTab('tasks')}>
            Перейти к заданиям
          </Button>
        </div>
      )}

      {/* ---------------- Задания ---------------- */}
      {tab === 'tasks' && (
        <div className="mt-6">
          {!task ? (
            // Задания закончились — итог
            <Card className="text-center">
              <span className="text-5xl" aria-hidden>
                🎯
              </span>
              <h2 className="mt-4 text-xl font-bold text-ink-900">Тема пройдена</h2>
              <p className="mt-2 text-ink-500">
                Верно решено {solved} из {tasks.length}.
              </p>
              {difficultyExplanation(subject.id, state) && (
                <p className="mt-3 text-sm text-brand-700">{difficultyExplanation(subject.id, state)}</p>
              )}
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <ButtonLink href="/plan">Вернуться к плану</ButtonLink>
                <Button variant="secondary" onClick={restart}>
                  Решить ещё раз
                </Button>
              </div>
            </Card>
          ) : (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink-400">
                  Задание {index + 1} из {tasks.length}
                </span>
                <Badge>{DIFFICULTY_LABELS[task.difficulty]}</Badge>
              </div>

              <p className="mt-4 text-lg font-semibold text-ink-900">{task.prompt}</p>

              {/* Варианты ответа или поле ввода — в зависимости от типа задания */}
              {task.kind === 'single' && task.options && (
                <div className="mt-5 grid gap-2.5">
                  {task.options.map((option, i) => (
                    <button
                      key={option}
                      onClick={() => setAnswer(String(i))}
                      disabled={feedback !== null}
                      aria-pressed={answer === String(i)}
                      className={`rounded-xl border-2 p-4 text-left transition-colors disabled:opacity-70 ${
                        answer === String(i)
                          ? 'border-brand-500 bg-brand-50 text-brand-800'
                          : 'border-ink-200 bg-white text-ink-700 hover:border-brand-300'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {task.kind === 'numeric' && (
                <input
                  type="text"
                  inputMode="decimal"
                  value={answer}
                  disabled={feedback !== null}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Ответ числом"
                  className="mt-5 w-full rounded-xl border border-ink-200 px-4 py-3 outline-none focus:border-brand-500 disabled:bg-ink-50"
                />
              )}

              {/* Подсказка доступна только до ответа */}
              {!feedback && (
                <div className="mt-4">
                  {showHint ? (
                    <p className="rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-700">💡 {task.hint}</p>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setShowHint(true)}>
                      Показать подсказку
                    </Button>
                  )}
                </div>
              )}

              {loading && (
                <div className="mt-5 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-10/12" />
                </div>
              )}

              {/* Результат проверки */}
              {feedback && !loading && (
                <div className="mt-5">
                  <div
                    className={`rounded-xl px-4 py-3 font-bold ${
                      feedback.correct ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'
                    }`}
                  >
                    {feedback.correct ? '✓ Верно' : '✗ Пока не верно'}
                    {!feedback.correct && feedback.correctAnswer && (
                      <span className="ml-2 font-normal">Правильный ответ: {feedback.correctAnswer}</span>
                    )}
                  </div>

                  <div className="mt-4 rounded-xl border border-ink-200 p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-ink-800">Разбор</span>
                      <AiBadge live={feedback.live} reason={feedback.fallbackReason} />
                    </div>
                    <p className="whitespace-pre-line leading-relaxed text-ink-700">{feedback.text}</p>
                  </div>
                </div>
              )}

              <div className="mt-6">
                {feedback ? (
                  <Button size="lg" className="w-full" onClick={next}>
                    {index + 1 < tasks.length ? 'Следующее задание' : 'Завершить тему'}
                  </Button>
                ) : (
                  <Button size="lg" className="w-full" onClick={submit} disabled={answer === '' || loading}>
                    Ответить
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
