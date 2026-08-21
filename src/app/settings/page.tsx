'use client';

/**
 * Настройки: всё, что касается только самого пользователя.
 *
 * Отделено от профиля намеренно. Профиль — это витрина, которую показывают
 * другим (портфолио, достижения, место в рейтинге). Настройки — учебные
 * параметры, аватар, пароль и выход. Когда они лежали на одной странице,
 * человек, зашедший похвастаться достижением, первым делом видел форму
 * смены класса.
 *
 * Учебные параметры сохраняются сразу в двух местах: в Supabase (чтобы
 * не потерялись при смене устройства) и в локальном состоянии (движок
 * персонализации читает их оттуда синхронно при подборе заданий).
 */

import { useState } from 'react';
import { GRADES, LEARNING_GOALS } from '@/lib/types';
import type { Grade, LearningGoal } from '@/lib/types';
import { SUBJECTS } from '@/data';
import { useStore } from '@/components/StoreProvider';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { Avatar } from '@/components/Avatar';
import { AVATAR_COLORS, AVATAR_EMOJI } from '@/lib/avatar';
import { Icon } from '@/components/Icon';
import { PasswordField, SubmitButton } from '@/components/auth-ui';
import { Alert, Button, ButtonLink, Card, Kicker, Skeleton } from '@/components/ui';

const OPTION =
  'flex items-center gap-3 rounded-[var(--radius-control)] border-2 p-3 text-left transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500';

export default function SettingsPage() {
  const { state, hydrated, updateProfile, resetAll } = useStore();
  const { profile: schoolProfile, schoolClass, email, signOut, updatePassword, refresh } = useSchoolAuth();

  const [saved, setSaved] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  /**
   * Сохраняет учебный параметр и туда, и туда.
   *
   * Локальное состояние обновляется сразу, чтобы подбор заданий не ждал
   * сеть; в Supabase уходит фоном. Если запрос не дойдёт, у человека
   * останется рабочая настройка на этом устройстве, а не пустая форма.
   */
  function save(patch: Parameters<typeof updateProfile>[0], remote: Record<string, unknown>) {
    updateProfile(patch);
    setSaved(true);
    if (!schoolProfile) return;
    fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(remote),
    })
      .then(() => refresh())
      .catch(() => {
        // Молча: настройка уже применена локально, ронять экран незачем.
      });
  }

  function toggleSubject(id: string) {
    const current = state.profile?.subjectIds ?? [];
    const updated = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    // Хотя бы один предмет должен остаться, иначе плану не из чего строиться.
    if (updated.length > 0) save({ subjectIds: updated }, { subjectIds: updated });
  }

  async function changePassword() {
    setPasswordError(null);
    if (password.length < 6) {
      setPasswordError('Пароль должен быть не короче 6 символов.');
      return;
    }
    setPasswordStatus('loading');
    const result = await updatePassword(password);
    if (!result.ok) {
      setPasswordStatus('idle');
      setPasswordError(result.error ?? 'Не удалось сменить пароль.');
      return;
    }
    setPasswordStatus('success');
    setPassword('');
  }

  const displayName = schoolProfile?.name ?? state.profile?.name ?? 'Ученик';

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Kicker>Аккаунт</Kicker>
      <h1 className="mt-2 text-3xl font-semibold text-ink-900 sm:text-4xl">Настройки</h1>
      <p className="mt-2 text-sm text-ink-500">
        Учебные параметры, внешний вид профиля и безопасность.
      </p>

      {saved && (
        <div className="mt-6">
          <Alert tone="success">Изменения сохранены.</Alert>
        </div>
      )}

      {/* Аватар */}
      <Card className="mt-8">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar
            name={displayName}
            colorId={schoolProfile?.avatar_color}
            emoji={schoolProfile?.avatar_emoji}
            size={64}
          />
          <div>
            <h2 className="font-bold text-ink-900">{displayName}</h2>
            <p className="text-sm text-ink-400">{email ?? 'без аккаунта'}</p>
          </div>
        </div>

        {/*
          Символ идёт первым, а цвет вторым: выбор картинки ощущается как
          «поставить себе аватарку», ради чего сюда и заходят, а фон —
          доводка. Обратный порядок делал бы главным менее важное.
        */}
        <div className="mt-6 flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-ink-800">Символ</p>
          {schoolProfile?.avatar_emoji && (
            <button
              onClick={() => save({}, { avatarEmoji: null })}
              className="text-xs font-semibold text-ink-400 underline-offset-2 hover:text-ink-600 hover:underline"
            >
              Вернуть букву
            </button>
          )}
        </div>
        {/*
          Шесть колонок на телефоне, а не восемь: кнопка должна попадать под
          палец, а не быть точкой в 30 пикселей. Ширина задаётся ячейкой
          (w-full + aspect-square), иначе фиксированные 40px вылезают за
          колонку и соседние кнопки наезжают друг на друга.
        */}
        <div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-11">
          {AVATAR_EMOJI.map((emoji) => {
            const active = schoolProfile?.avatar_emoji === emoji;
            return (
              <button
                key={emoji}
                aria-label={`Символ ${emoji}`}
                aria-pressed={active}
                onClick={() => save({}, { avatarEmoji: emoji })}
                className={`flex aspect-square w-full items-center justify-center rounded-[var(--radius-control)] text-xl leading-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  active
                    ? 'bg-brand-50 ring-2 ring-brand-500'
                    : 'bg-ink-50 hover:scale-105 hover:bg-ink-100'
                }`}
              >
                {emoji}
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-sm font-semibold text-ink-800">Цвет фона</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {AVATAR_COLORS.map((color) => (
            <button
              key={color.id}
              title={color.title}
              aria-label={color.title}
              aria-pressed={schoolProfile?.avatar_color === color.id}
              onClick={() => save({}, { avatarColor: color.id })}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
                schoolProfile?.avatar_color === color.id
                  ? 'ring-2 ring-brand-500 ring-offset-2'
                  : 'hover:scale-105'
              }`}
              style={{ background: color.value }}
            >
              {/* Символ виден прямо на образце — иначе выбор фона
                  приходится проверять, глядя на аватар выше. */}
              <span aria-hidden className="text-lg leading-none">
                {schoolProfile?.avatar_emoji ?? ''}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Учебные параметры */}
      <Card className="mt-6 space-y-6">
        <h2 className="font-bold text-ink-900">Учёба</h2>

        <div>
          <span className="font-semibold text-ink-800">Класс</span>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {GRADES.map((grade: Grade) => (
              <button
                key={grade}
                onClick={() => save({ grade }, { grade })}
                className={`rounded-[var(--radius-control)] border-2 py-3 font-bold tabular-nums transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  state.profile?.grade === grade
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
                className={`${OPTION} ${
                  state.profile?.subjectIds.includes(subject.id)
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-ink-200 hover:border-brand-300'
                }`}
              >
                <Icon name={subject.icon} size={20} className="text-brand-500" />
                <span className="font-semibold text-ink-800">{subject.title}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="font-semibold text-ink-800">Цель</span>
          <div className="mt-2 grid gap-2">
            {LEARNING_GOALS.map((item) => (
              <button
                key={item.id}
                onClick={() => save({ goal: item.id as LearningGoal }, { goal: item.id })}
                className={`${OPTION} ${
                  state.profile?.goal === item.id
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-ink-200 hover:border-brand-300'
                }`}
              >
                <Icon name={item.icon} size={20} className="text-brand-500" />
                <span className="font-semibold text-ink-800">{item.title}</span>
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="font-semibold text-ink-800">Дата экзамена или олимпиады</span>
          <input
            type="date"
            value={state.profile?.targetDate ?? ''}
            onChange={(event) =>
              save(
                { targetDate: event.target.value || undefined },
                { targetDate: event.target.value || null },
              )
            }
            className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-ink-200 px-4 tabular-nums outline-none transition-all focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
          />
        </label>
      </Card>

      {/* Класс и код */}
      {schoolClass && (
        <Card className="mt-6">
          <h2 className="font-bold text-ink-900">Класс</h2>
          <p className="mt-2 text-sm text-ink-500">
            {schoolProfile?.role === 'teacher'
              ? 'Код для учеников — раздайте его, чтобы они присоединились к классу.'
              : `Вы состоите в классе «${schoolClass.name}».`}
          </p>
          <p className="mt-3 inline-block rounded-[var(--radius-control)] bg-brand-50 px-4 py-2 font-mono text-lg font-bold tracking-[0.3em] text-brand-700">
            {schoolClass.code}
          </p>
        </Card>
      )}

      {/* Безопасность */}
      {email && (
        <Card className="mt-6">
          <h2 className="font-bold text-ink-900">Смена пароля</h2>
          <p className="mt-2 text-sm text-ink-500">
            Придумайте пароль, который не используете больше нигде.
          </p>
          <div className="mt-4 space-y-4">
            <PasswordField
              label="Новый пароль"
              autoComplete="new-password"
              placeholder="Не меньше 6 символов"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {passwordError && <p className="text-sm font-semibold text-danger-600">{passwordError}</p>}
            <SubmitButton
              type="button"
              onClick={changePassword}
              loading={passwordStatus === 'loading'}
              success={passwordStatus === 'success'}
            >
              Сохранить пароль
            </SubmitButton>
          </div>
        </Card>
      )}

      {/* Выход и сброс */}
      <Card className="mt-6">
        <h2 className="font-bold text-ink-900">Аккаунт</h2>
        <p className="mt-2 text-sm text-ink-500">
          Прогресс по заданиям хранится в этом браузере и синхронизируется с вашим аккаунтом.
          Достижения портфолио остаются в аккаунте всегда.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => signOut()}>
            <Icon name="arrowRight" size={17} />
            Выйти
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm('Удалить локальный прогресс по заданиям? Достижения останутся.')) {
                resetAll();
              }
            }}
          >
            Сбросить локальный прогресс
          </Button>
        </div>
      </Card>

      <div className="mt-6">
        <ButtonLink href="/profile" variant="secondary">
          К профилю
        </ButtonLink>
      </div>
    </div>
  );
}
