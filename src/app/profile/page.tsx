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
import type { Dict } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { Alert, Button, ButtonLink, Card, EmptyState, Skeleton } from '@/components/ui';

/**
 * Подписи страницы на трёх языках. Ключи одинаковые — за этим следит TypeScript.
 * Названия целей переводятся по id, как в онбординге: сами данные в LEARNING_GOALS
 * остаются на русском.
 */
const TEXT: Dict<{
  noProfileTitle: string;
  noProfileText: string;
  createProfile: string;
  title: string;
  saved: string;
  name: string;
  grade: string;
  subjects: string;
  goal: string;
  goals: Record<LearningGoal, string>;
  targetDate: string;
  dataTitle: string;
  dataText: string;
  resetConfirm: string;
  reset: string;
  backToDashboard: string;
}> = {
  ru: {
    noProfileTitle: 'Профиля пока нет',
    noProfileText: 'Создайте профиль, чтобы им управлять.',
    createProfile: 'Создать профиль',
    title: 'Профиль',
    saved: 'Изменения сохранены.',
    name: 'Имя',
    grade: 'Класс',
    subjects: 'Предметы',
    goal: 'Цель',
    goals: {
      ent: 'Подготовка к ЕНТ',
      olympiad: 'Олимпиада',
      review: 'Повторение темы',
      catchup: 'Догнать программу',
    },
    targetDate: 'Дата экзамена или олимпиады',
    dataTitle: 'Данные',
    dataText:
      'Весь прогресс хранится только в этом браузере (localStorage) и никуда не отправляется. Если очистить данные сайта, прогресс пропадёт.',
    resetConfirm: 'Удалить профиль и весь прогресс? Это действие нельзя отменить.',
    reset: 'Сбросить весь прогресс',
    backToDashboard: 'Вернуться в кабинет',
  },
  kk: {
    noProfileTitle: 'Профиль әзірге жоқ',
    noProfileText: 'Оны басқару үшін алдымен профиль құрыңыз.',
    createProfile: 'Профиль құру',
    title: 'Профиль',
    saved: 'Өзгерістер сақталды.',
    name: 'Аты',
    grade: 'Сынып',
    subjects: 'Пәндер',
    goal: 'Мақсат',
    goals: {
      ent: 'ҰБТ-ға дайындық',
      olympiad: 'Олимпиада',
      review: 'Тақырыпты қайталау',
      catchup: 'Бағдарламаны қуып жету',
    },
    targetDate: 'Емтихан немесе олимпиада күні',
    dataTitle: 'Деректер',
    dataText:
      'Барлық прогресс тек осы браузерде (localStorage) сақталады және еш жаққа жіберілмейді. Сайт деректерін тазаласаң, прогресс жоғалады.',
    resetConfirm: 'Профиль мен бүкіл прогресс жойылсын ба? Бұл әрекетті кері қайтару мүмкін емес.',
    reset: 'Бүкіл прогрессті тазалау',
    backToDashboard: 'Кабинетке оралу',
  },
  en: {
    noProfileTitle: 'No profile yet',
    noProfileText: 'Create a profile to manage it.',
    createProfile: 'Create profile',
    title: 'Profile',
    saved: 'Changes saved.',
    name: 'Name',
    grade: 'Grade',
    subjects: 'Subjects',
    goal: 'Goal',
    goals: {
      ent: 'ENT preparation',
      olympiad: 'Olympiad',
      review: 'Topic review',
      catchup: 'Catch up with the class',
    },
    targetDate: 'Exam or olympiad date',
    dataTitle: 'Data',
    dataText:
      'All progress is stored only in this browser (localStorage) and is never sent anywhere. Clearing site data erases it.',
    resetConfirm: 'Delete your profile and all progress? This cannot be undone.',
    reset: 'Reset all progress',
    backToDashboard: 'Back to dashboard',
  },
};

export default function ProfilePage() {
  const { state, hydrated, updateProfile, resetAll } = useStore();
  const profile = state.profile;
  const t = TEXT[state.language];

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
        {/* Иконка вынесена наружу: проп icon у EmptyState принимает строку,
            а рисованные иконки набора приходят готовым элементом. */}
        <div className="mb-3 flex justify-center text-ink-300">
          <Icon name="user" size={40} />
        </div>
        <EmptyState
          title={t.noProfileTitle}
          description={t.noProfileText}
          action={<ButtonLink href="/onboarding">{t.createProfile}</ButtonLink>}
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
      {/* Заголовок с именем в строку: настройки открываются данными
          пользователя, а не описанием раздела. */}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-3xl font-semibold text-ink-900 sm:text-4xl">{t.title}</h1>
        <p className="text-sm text-ink-400">{profile.name}</p>
      </div>

      {saved && (
        <div className="mt-4">
          <Alert tone="success">{t.saved}</Alert>
        </div>
      )}

      <Card className="mt-6 space-y-6">
        <label className="block">
          <span className="font-semibold text-ink-800">{t.name}</span>
          <input
            type="text"
            value={profile.name}
            onChange={(event) => save({ name: event.target.value })}
            className="mt-2 w-full rounded-xl border border-ink-200 px-4 py-3 outline-none transition-all duration-150 focus:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500"
          />
        </label>

        <div>
          <span className="font-semibold text-ink-800">{t.grade}</span>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {GRADES.map((grade: Grade) => (
              <button
                key={grade}
                onClick={() => save({ grade })}
                className={`rounded-xl border-2 py-3 font-bold tabular-nums transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  profile.grade === grade
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-ink-200 text-ink-700 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]'
                }`}
              >
                {grade}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="font-semibold text-ink-800">{t.subjects}</span>
          <div className="mt-2 grid gap-2">
            {SUBJECTS.map((subject) => (
              <button
                key={subject.id}
                onClick={() => toggleSubject(subject.id)}
                className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  profile.subjectIds.includes(subject.id)
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-ink-200 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]'
                }`}
              >
                <Icon name={subject.icon} size={20} className="text-brand-500" />
                <span className="font-semibold text-ink-800">{subject.title}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="font-semibold text-ink-800">{t.goal}</span>
          <div className="mt-2 grid gap-2">
            {LEARNING_GOALS.map((item) => (
              <button
                key={item.id}
                onClick={() => save({ goal: item.id })}
                className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  profile.goal === item.id
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-ink-200 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]'
                }`}
              >
                <Icon name={item.icon} size={20} className="text-brand-500" />
                <span className="font-semibold text-ink-800">{t.goals[item.id]}</span>
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="font-semibold text-ink-800">{t.targetDate}</span>
          <input
            type="date"
            value={profile.targetDate ?? ''}
            onChange={(event) => save({ targetDate: event.target.value || undefined })}
            className="mt-2 w-full rounded-xl border border-ink-200 px-4 py-3 tabular-nums outline-none transition-all duration-150 focus:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500"
          />
        </label>
      </Card>

      <Card className="mt-6">
        <h2 className="font-bold text-ink-900">{t.dataTitle}</h2>
        <p className="mt-2 text-sm text-ink-500">{t.dataText}</p>
        <Button
          variant="danger"
          className="mt-4"
          onClick={() => {
            // Действие необратимо, поэтому спрашиваем подтверждение.
            if (window.confirm(t.resetConfirm)) {
              resetAll();
            }
          }}
        >
          {t.reset}
        </Button>
      </Card>

      <div className="mt-6">
        <ButtonLink href="/dashboard" variant="secondary">
          {t.backToDashboard}
        </ButtonLink>
      </div>
    </div>
  );
}
