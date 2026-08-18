'use client';

/**
 * Онбординг: мастер из 4 шагов, который создаёт профиль ученика.
 *
 * 'use client' наверху обязателен: страница хранит состояние и реагирует на клики.
 * Без этой строки Next.js попытался бы отрисовать её только на сервере, где нет
 * ни useState, ни обработчиков событий.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/components/StoreProvider';
import { createId } from '@/lib/storage';
import { GRADES, LEARNING_GOALS } from '@/lib/types';
import type { Grade, LearningGoal, Profile, Role } from '@/lib/types';
import { SUBJECTS } from '@/data';
import { Alert, Button, Card } from '@/components/ui';

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const router = useRouter();
  const { state, setProfile } = useStore();

  // useState создаёт «ячейку памяти» компонента. Первое значение — текущее,
  // второе — функция, которая его меняет и перерисовывает страницу.
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [grade, setGrade] = useState<Grade | null>(null);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [goal, setGoal] = useState<LearningGoal | null>(null);
  const [targetDate, setTargetDate] = useState('');

  /** Добавляет предмет в выбор или убирает его, если он уже выбран. */
  function toggleSubject(id: string) {
    setSubjectIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  /** Можно ли перейти к следующему шагу: на каждом шаге своё условие. */
  const canContinue =
    (step === 1 && name.trim().length > 0) ||
    (step === 2 && grade !== null) ||
    (step === 3 && subjectIds.length > 0) ||
    (step === 4 && goal !== null);

  function finish() {
    if (grade === null || goal === null) return;

    const profile: Profile = {
      id: createId('user'),
      name: name.trim(),
      role,
      grade,
      subjectIds,
      goal,
      targetDate: targetDate || undefined,
      createdAt: new Date().toISOString(),
    };

    setProfile(profile);

    // Учителю диагностика не нужна — он идёт сразу в свою панель.
    router.push(role === 'teacher' ? '/teacher' : `/diagnostics/${subjectIds[0]}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {/* Индикатор прогресса: ученик должен видеть, сколько осталось */}
      <p className="text-sm font-semibold text-brand-600">
        Шаг {step} из {TOTAL_STEPS}
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-300"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {state.profile && step === 1 && (
        <div className="mt-6">
          <Alert>Профиль уже создан. Если пройти мастер заново, прежние настройки заменятся.</Alert>
        </div>
      )}

      <Card className="mt-6">
        {/* Шаг 1: имя и роль */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold text-ink-900">Как тебя зовут?</h1>
            <p className="mt-2 text-ink-500">Имя нужно, чтобы обращаться к тебе и показать учителю.</p>

            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Например, Аружан"
              className="mt-5 w-full rounded-xl border border-ink-200 px-4 py-3 text-ink-900 outline-none focus:border-brand-500"
            />

            <p className="mt-6 font-semibold text-ink-800">Кто ты?</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <ChoiceCard
                selected={role === 'student'}
                onClick={() => setRole('student')}
                icon="🎒"
                title="Ученик"
                description="Учусь и готовлюсь к экзаменам"
              />
              <ChoiceCard
                selected={role === 'teacher'}
                onClick={() => setRole('teacher')}
                icon="👩‍🏫"
                title="Учитель"
                description="Слежу за прогрессом класса"
              />
            </div>
          </div>
        )}

        {/* Шаг 2: класс */}
        {step === 2 && (
          <div>
            <h1 className="text-2xl font-bold text-ink-900">В каком ты классе?</h1>
            <p className="mt-2 text-ink-500">По классу подбираются доступные темы.</p>

            <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {GRADES.map((item) => (
                <button
                  key={item}
                  onClick={() => setGrade(item)}
                  className={`rounded-xl border-2 py-4 text-lg font-bold transition-colors ${
                    grade === item
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-ink-200 bg-white text-ink-700 hover:border-brand-300'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Шаг 3: предметы */}
        {step === 3 && (
          <div>
            <h1 className="text-2xl font-bold text-ink-900">Какие предметы изучаешь?</h1>
            <p className="mt-2 text-ink-500">Можно выбрать несколько. Позже это меняется в профиле.</p>

            <div className="mt-5 grid gap-3">
              {SUBJECTS.map((subject) => (
                <ChoiceCard
                  key={subject.id}
                  selected={subjectIds.includes(subject.id)}
                  onClick={() => toggleSubject(subject.id)}
                  icon={subject.icon}
                  title={subject.title}
                  description={subject.description}
                />
              ))}
            </div>
          </div>
        )}

        {/* Шаг 4: цель */}
        {step === 4 && (
          <div>
            <h1 className="text-2xl font-bold text-ink-900">Зачем ты учишься?</h1>
            <p className="mt-2 text-ink-500">От цели зависит сложность подбираемых заданий.</p>

            <div className="mt-5 grid gap-3">
              {LEARNING_GOALS.map((item) => (
                <ChoiceCard
                  key={item.id}
                  selected={goal === item.id}
                  onClick={() => setGoal(item.id)}
                  icon={item.icon}
                  title={item.title}
                  description={item.description}
                />
              ))}
            </div>

            <label className="mt-6 block">
              <span className="font-semibold text-ink-800">Дата экзамена или олимпиады</span>
              <span className="ml-2 text-sm text-ink-400">необязательно</span>
              <input
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-ink-200 px-4 py-3 text-ink-900 outline-none focus:border-brand-500"
              />
            </label>
          </div>
        )}

        {/* Навигация по шагам */}
        <div className="mt-8 flex justify-between gap-3">
          <Button variant="secondary" onClick={() => setStep(step - 1)} disabled={step === 1}>
            Назад
          </Button>

          {step < TOTAL_STEPS ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canContinue}>
              Далее
            </Button>
          ) : (
            <Button onClick={finish} disabled={!canContinue}>
              Начать обучение
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

/**
 * Карточка выбора. Вынесена отдельно, потому что используется на трёх шагах:
 * роль, предметы и цель выглядят одинаково, и дублировать разметку незачем.
 *
 * Всё, что в фигурных скобках у компонента — это props, входные данные.
 */
function ChoiceCard({
  selected,
  onClick,
  icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
        selected ? 'border-brand-500 bg-brand-50' : 'border-ink-200 bg-white hover:border-brand-300'
      }`}
    >
      <span className="text-2xl" aria-hidden>
        {icon}
      </span>
      <span>
        <span className="block font-bold text-ink-900">{title}</span>
        <span className="mt-0.5 block text-sm text-ink-500">{description}</span>
      </span>
    </button>
  );
}
