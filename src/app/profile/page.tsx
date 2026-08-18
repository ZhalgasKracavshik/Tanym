'use client';

/**
 * Настройки профиля: изменить класс, предметы, цель, дату экзамена.
 *
 * Отдельная страница, а не модальное окно: настройки открываются редко,
 * и ради них не стоит усложнять кабинет.
 */

import { useState } from 'react';
import { GRADES, LEARNING_GOALS } from '@/lib/types';
import type { Grade, LearningGoal } from '@/lib/types';
import { SUBJECTS } from '@/data';
import { useStore } from '@/components/StoreProvider';
import { Alert, Button, ButtonLink, Card, EmptyState, Skeleton } from '@/components/ui';

export default function ProfilePage() {
  const { state, hydrated, updateProfile, resetAll } = useStore();
  const profile = state.profile;

  const [saved, setSaved] = useState(false);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          icon="⚙️"
          title="Профиля пока нет"
          description="Создайте профиль, чтобы им управлять."
          action={<ButtonLink href="/onboarding">Создать профиль</ButtonLink>}
        />
      </div>
    );
  }

  /** Любое изменение сразу пишется в хранилище и показывает подтверждение. */
  function save(patch: Parameters<typeof updateProfile>[0]) {
    updateProfile(patch);
    setSaved(true);
  }

  function toggleSubject(id: string) {
    if (!profile) return;
    const current = profile.subjectIds;
    const updated = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    // Хотя бы один предмет должен остаться, иначе плану не из чего строиться.
    if (updated.length > 0) save({ subjectIds: updated });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">Профиль</h1>

      {saved && (
        <div className="mt-4">
          <Alert tone="success">Изменения сохранены.</Alert>
        </div>
      )}

      <Card className="mt-6 space-y-6">
        <label className="block">
          <span className="font-semibold text-ink-800">Имя</span>
          <input
            type="text"
            value={profile.name}
            onChange={(event) => save({ name: event.target.value })}
            className="mt-2 w-full rounded-xl border border-ink-200 px-4 py-3 outline-none focus:border-brand-500"
          />
        </label>

        <div>
          <span className="font-semibold text-ink-800">Класс</span>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {GRADES.map((grade: Grade) => (
              <button
                key={grade}
                onClick={() => save({ grade })}
                className={`rounded-xl border-2 py-3 font-bold transition-colors ${
                  profile.grade === grade
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-ink-200 text-ink-700 hover:border-brand-300'
                }`}
              >
                {grade}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="font-semibold text-ink-800">Предметы</span>
          <div className="mt-2 grid gap-2">
            {SUBJECTS.map((subject) => (
              <button
                key={subject.id}
                onClick={() => toggleSubject(subject.id)}
                className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors ${
                  profile.subjectIds.includes(subject.id)
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-ink-200 hover:border-brand-300'
                }`}
              >
                <span aria-hidden>{subject.icon}</span>
                <span className="font-semibold text-ink-800">{subject.title}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="font-semibold text-ink-800">Цель</span>
          <div className="mt-2 grid gap-2">
            {LEARNING_GOALS.map((item: { id: LearningGoal; title: string; icon: string }) => (
              <button
                key={item.id}
                onClick={() => save({ goal: item.id })}
                className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors ${
                  profile.goal === item.id ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-brand-300'
                }`}
              >
                <span aria-hidden>{item.icon}</span>
                <span className="font-semibold text-ink-800">{item.title}</span>
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="font-semibold text-ink-800">Дата экзамена или олимпиады</span>
          <input
            type="date"
            value={profile.targetDate ?? ''}
            onChange={(event) => save({ targetDate: event.target.value || undefined })}
            className="mt-2 w-full rounded-xl border border-ink-200 px-4 py-3 outline-none focus:border-brand-500"
          />
        </label>
      </Card>

      <Card className="mt-6">
        <h2 className="font-bold text-ink-900">Данные</h2>
        <p className="mt-2 text-sm text-ink-500">
          Весь прогресс хранится только в этом браузере (localStorage) и никуда не отправляется.
          Если очистить данные сайта, прогресс пропадёт.
        </p>
        <Button
          variant="danger"
          className="mt-4"
          onClick={() => {
            // Действие необратимо, поэтому спрашиваем подтверждение.
            if (window.confirm('Удалить профиль и весь прогресс? Это действие нельзя отменить.')) {
              resetAll();
            }
          }}
        >
          Сбросить весь прогресс
        </Button>
      </Card>

      <div className="mt-6">
        <ButtonLink href="/dashboard" variant="secondary">
          Вернуться в кабинет
        </ButtonLink>
      </div>
    </div>
  );
}
