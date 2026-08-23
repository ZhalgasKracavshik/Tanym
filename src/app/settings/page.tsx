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

import { Icon } from '@/components/Icon';
import { PasswordField, SubmitButton } from '@/components/auth-ui';
import { Alert, Button, ButtonLink, Card, Kicker, Skeleton } from '@/components/ui';
import { COVER_TYPES, coverError } from '@/components/ImageField';
import { avatarPhotoUrl } from '@/lib/supabase/avatarPhoto';
import { createClient } from '@/lib/supabase/client';
import {
  INTERESTS,
  KNOWLEDGE_LEVELS,
  REMINDER_LEADS,
  STUDY_TIMES,
  WEEKDAYS,
  normalizePhone,
  reminderLabel,
} from '@/lib/profileFields';

/** Языки интерфейса — те же три, что и в переключателе меню. */
const LANGUAGE_OPTIONS: { id: 'ru' | 'kk' | 'en'; title: string }[] = [
  { id: 'ru', title: 'Русский' },
  { id: 'kk', title: 'Қазақша' },
  { id: 'en', title: 'English' },
];

const OPTION =
  'flex items-center gap-3 rounded-[var(--radius-control)] border-2 p-3 text-left transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500';

export default function SettingsPage() {
  const { state, hydrated, updateProfile, resetAll, setLanguage } = useStore();
  const {
    profile: schoolProfile,
    schoolClass,
    email,
    emailConfirmed,
    signOut,
    updatePassword,
    refresh,
  } = useSchoolAuth();

  const [saved, setSaved] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<'idle' | 'uploading'>('idle');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [phoneDraft, setPhoneDraft] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [bioDraft, setBioDraft] = useState<string | null>(null);
  const [availabilityDraft, setAvailabilityDraft] = useState<string | null>(null);
  /*
    null означает «поле не трогали» — тогда показываем текущее имя.
    Синхронизировать состояние с профилем через эффект было бы хуже:
    это лишний рендер и гонка, при которой набранный текст затирается
    ответом сервера прямо под пальцами.
  */
  const [nameDraft, setNameDraft] = useState<string | null>(null);
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

  /**
   * Загружает фотографию и сохраняет путь к ней.
   *
   * Файл кладётся в папку с id пользователя: политика бакета разрешает
   * писать только туда, поэтому подменить чужой аватар нельзя даже прямым
   * обращением к storage. Имя со временем — чтобы замена не упиралась в
   * кэш браузера по прежнему адресу.
   */
  async function uploadPhoto(file: File) {
    if (!schoolProfile) return;
    const problem = coverError(file);
    if (problem) {
      setPhotoError(problem);
      return;
    }
    setPhotoError(null);
    setPhotoStatus('uploading');

    const supabase = createClient();
    const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${schoolProfile.id}/${Date.now()}.${extension}`;

    const { error } = await supabase.storage.from('avatars').upload(path, file);
    if (error) {
      setPhotoStatus('idle');
      setPhotoError('Не удалось загрузить фотографию. Попробуйте ещё раз.');
      return;
    }

    setPhotoStatus('idle');
    save({}, { avatarPhotoPath: path });
  }

  /**
   * Сохраняет телефон, проверив его до отправки.
   *
   * Проверка здесь и на сервере одна и та же по смыслу, но нужна в обоих
   * местах: тут — чтобы человек увидел ошибку сразу, там — потому что
   * PATCH можно отправить в обход формы.
   */
  function savePhone() {
    const raw = phoneDraft ?? '';
    if (raw.trim() !== '' && normalizePhone(raw) === null) {
      setPhoneError('Проверьте номер: нужно от 10 до 15 цифр.');
      return;
    }
    setPhoneError(null);
    save({}, { phone: raw.trim() === '' ? null : raw });
    setPhoneDraft(null);
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

  const isStudent = schoolProfile?.role === 'student';
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
            photoUrl={avatarPhotoUrl(schoolProfile?.avatar_photo_path)}
            size={64}
          />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-bold text-ink-900">{displayName}</h2>
            <p className="truncate text-sm text-ink-400">{email ?? 'без аккаунта'}</p>
          </div>
        </div>

        {/*
          Имя редактируется здесь и нигде больше.

          До этого сменить его было невозможно вообще: оно приходило из
          Google при первом входе и оставалось навсегда. Между тем имя стоит
          в рейтинге, в ленте и в портфолио — то есть ровно там, где его
          видят одноклассники.
        */}
        <div className="mt-6">
          <label className="block">
            <span className="text-sm font-semibold text-ink-800">Имя</span>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                value={nameDraft ?? displayName}
                onChange={(event) => setNameDraft(event.target.value)}
                maxLength={60}
                placeholder="Как вас зовут"
                className="min-w-[12rem] flex-1 rounded-[var(--radius-control)] border border-ink-200 px-4 py-2.5 text-sm outline-none transition-colors duration-150 focus:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-500"
              />
              <Button
                variant="secondary"
                disabled={
                  nameDraft === null ||
                  nameDraft.trim().length < 2 ||
                  nameDraft.trim() === displayName
                }
                onClick={() => {
                  const value = (nameDraft ?? '').trim();
                  save({ name: value }, { name: value });
                  setNameDraft(null);
                }}
              >
                Сохранить
              </Button>
            </div>
          </label>
        </div>

        {/*
          Фотография необязательна. Требовать снимок ребёнка школьная
          платформа не вправе: у кого-то дома это не разрешают, кому-то
          просто не хочется. Без неё аватар — буква имени на цветной
          подложке, и это законченный вид, а не заглушка.
        */}
        <p className="mt-8 text-sm font-semibold text-ink-800">Фотография</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition-colors duration-150 hover:border-brand-300 hover:bg-brand-50/50 focus-within:ring-2 focus-within:ring-brand-500">
            <Icon name="image" size={17} className="text-brand-500" />
            {photoStatus === 'uploading' ? 'Загружаю…' : schoolProfile?.avatar_photo_path ? 'Заменить фото' : 'Загрузить фото'}
            <input
              type="file"
              accept={COVER_TYPES.join(',')}
              className="sr-only"
              disabled={photoStatus === 'uploading'}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) uploadPhoto(file);
              }}
            />
          </label>

          {schoolProfile?.avatar_photo_path && (
            <button
              onClick={() => save({}, { avatarPhotoPath: null })}
              className="text-sm font-semibold text-ink-400 underline-offset-2 hover:text-danger-600 hover:underline"
            >
              Убрать фото
            </button>
          )}
        </div>
        {photoError && <p className="mt-2 text-xs font-medium text-danger-600">{photoError}</p>}

      </Card>

      {/* Учебные параметры */}
      <Card className="mt-6 space-y-6">
        <div>
          <h2 className="text-base font-bold text-ink-900">Учёба</h2>
          <p className="mt-1 text-xs text-ink-500">Настройки программы, предметов и целей.</p>
        </div>

        <div>
          <span className="text-sm font-semibold text-ink-800">Класс</span>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {GRADES.map((grade: Grade) => {
              const active = state.profile?.grade === grade;
              return (
                <button
                  key={grade}
                  onClick={() => save({ grade }, { grade })}
                  className={`rounded-xl border-2 py-3 text-base font-bold tabular-nums transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    active
                      ? 'border-brand-500 bg-brand-500 text-white shadow-sm'
                      : 'border-ink-200 bg-white text-ink-700 hover:border-brand-300'
                  }`}
                >
                  {grade} класс
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="text-sm font-semibold text-ink-800">Предметы</span>
          <div className="mt-2 grid gap-2.5 sm:grid-cols-3">
            {SUBJECTS.map((subject) => {
              const active = state.profile?.subjectIds.includes(subject.id);
              return (
                <button
                  key={subject.id}
                  onClick={() => toggleSubject(subject.id)}
                  className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    active
                      ? 'border-brand-500 bg-brand-50/70 shadow-xs'
                      : 'border-ink-200 bg-white hover:border-brand-300'
                  }`}
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white shrink-0"
                    style={{ backgroundColor: subject.accent }}
                  >
                    <Icon name={subject.icon} size={16} />
                  </span>
                  <div>
                    <span className="block text-sm font-bold text-ink-800">{subject.title}</span>
                    <span className="block text-xs text-ink-500">{active ? 'Изучается' : 'Не выбран'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="text-sm font-semibold text-ink-800">Цель</span>
          <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
            {LEARNING_GOALS.map((item) => {
              const active = state.profile?.goal === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => save({ goal: item.id as LearningGoal }, { goal: item.id })}
                  className={`flex items-start gap-3 rounded-xl border-2 p-3.5 text-left transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    active
                      ? 'border-brand-500 bg-brand-50/70 shadow-xs'
                      : 'border-ink-200 bg-white hover:border-brand-300'
                  }`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700 shrink-0 mt-0.5">
                    <Icon name={item.icon} size={18} />
                  </span>
                  <div>
                    <span className="block text-sm font-bold text-ink-800">{item.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">{item.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-ink-800">Дата экзамена или олимпиады</span>
          <input
            type="date"
            value={state.profile?.targetDate ?? ''}
            onChange={(event) =>
              save(
                { targetDate: event.target.value || undefined },
                { targetDate: event.target.value || null },
              )
            }
            className="mt-2 h-11 w-full sm:w-64 rounded-xl border border-ink-200 px-4 text-sm tabular-nums outline-none transition-all focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
          />
        </label>
      </Card>

      {/* Класс и код */}
      <Card className="mt-6 bg-gradient-to-br from-brand-50/60 to-white border-brand-200/80">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-600">
              <Icon name="school" size={14} />
              Школьный класс
            </span>
            <h2 className="mt-1 text-lg font-bold text-ink-900">
              {schoolClass ? `Вы состоите в классе «${schoolClass.name}»` : 'Вы состоите в классе «Мой класс»'}
            </h2>
            <p className="mt-1 text-xs text-ink-600">
              {schoolProfile?.role === 'teacher'
                ? 'Код для учеников — раздайте его, чтобы они присоединились к классу.'
                : 'Ваш учитель видит результаты тренировок и карту прогресса.'}
            </p>
          </div>
          <div className="rounded-xl border border-brand-300 bg-white px-4 py-2 text-center shadow-xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-400">Код класса</span>
            <span className="font-mono text-lg font-black tracking-widest text-brand-600">
              {schoolClass?.code ?? 'VNMBCD'}
            </span>
          </div>
        </div>
      </Card>

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

      {/*
        Язык и приватность.

        Переключатель языка есть в меню, но искать настройку в навигации
        неочевидно: человек, которому понадобился казахский, идёт в
        настройки. Анонимность в рейтинге жила на самой странице рейтинга —
        это удобно в момент, когда увидел себя в списке, но найти её потом,
        чтобы отключить, было негде.
      */}
      <Card className="mt-6 space-y-6">
        <div>
          <h2 className="font-bold text-ink-900">Язык интерфейса</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setLanguage(option.id)}
                aria-pressed={state.language === option.id}
                className={`rounded-[var(--radius-control)] border px-4 py-2 text-sm font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  state.language === option.id
                    ? 'border-brand-300 bg-brand-50 text-brand-700'
                    : 'border-ink-200 bg-white text-ink-500 hover:border-brand-200 hover:text-brand-600'
                }`}
              >
                {option.title}
              </button>
            ))}
          </div>
        </div>

        {isStudent && (
          <div className="space-y-4 border-t border-ink-100 pt-6">
            <h2 className="font-bold text-ink-900">Приватность</h2>

            <Toggle
              checked={schoolProfile?.leaderboard_anonymous ?? false}
              onChange={(value) => save({}, { leaderboardAnonymous: value })}
              title="Скрыть моё имя в рейтинге"
              hint="Одноклассники увидят псевдоним. Баллы продолжают начисляться, место сохраняется, из рейтинга вы не выпадаете."
            />

            <Toggle
              checked={schoolProfile?.profile_visible ?? true}
              onChange={(value) => save({}, { profileVisible: value })}
              title="Показывать профиль другим ученикам"
              hint="Выключите, если не хотите, чтобы одноклассники открывали вашу страницу с портфолио."
            />

            <Toggle
              checked={schoolProfile?.progress_visible ?? false}
              onChange={(value) => save({}, { progressVisible: value })}
              title="Показывать оценки и домашние работы"
              hint="Классный руководитель видит их всегда — это его работа. Речь только об одноклассниках."
            />
          </div>
        )}
      </Card>

      {/* Контакты */}
      <Card className="mt-6 space-y-6">
        <div>
          <h2 className="font-bold text-ink-900">Контакты</h2>
          <p className="mt-1 text-sm text-ink-500">
            По ним с вами связывается классный руководитель.
          </p>
        </div>

        <div>
          <span className="text-sm font-semibold text-ink-800">Почта</span>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="rounded-[var(--radius-control)] border border-ink-200 bg-ink-50 px-4 py-2.5 text-sm text-ink-600">
              {email ?? 'без аккаунта'}
            </span>
            {emailConfirmed ? (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-success-700">
                <Icon name="check" size={16} />
                подтверждена
              </span>
            ) : (
              <span className="text-sm font-semibold text-accent-600">не подтверждена</span>
            )}
          </div>
          {/* Почта меняется только вместе с аккаунтом: по ней пускают
              в систему и по её домену проверяют, что человек из школы. */}
          <p className="mt-2 text-xs text-ink-400">
            Почта привязана к аккаунту и меняется вместе с ним.
          </p>
        </div>

        <div>
          <label className="text-sm font-semibold text-ink-800" htmlFor="phone">
            Телефон
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              value={phoneDraft ?? schoolProfile?.phone ?? ''}
              onChange={(event) => setPhoneDraft(event.target.value)}
              placeholder="+7 700 000 00 00"
              className="min-w-[14rem] flex-1 rounded-[var(--radius-control)] border border-ink-200 px-4 py-2.5 text-sm outline-none transition-colors duration-150 focus:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-500"
            />
            <Button variant="secondary" disabled={phoneDraft === null} onClick={savePhone}>
              Сохранить
            </Button>
          </div>
          {phoneError ? (
            <p className="mt-2 text-xs font-medium text-danger-600">{phoneError}</p>
          ) : (
            <p className="mt-2 text-xs text-ink-400">
              Необязательно. Можно указать номер родителя.
            </p>
          )}
        </div>

        <div>
          <span className="text-sm font-semibold text-ink-800">Мессенджер и ссылки</span>
          <p className="mt-1 text-xs text-ink-400">
            Telegram, WhatsApp и остальные ссылки добавляются в профиле.
          </p>
          <div className="mt-3">
            <ButtonLink href="/profile" size="sm" variant="secondary">
              Открыть профиль
            </ButtonLink>
          </div>
        </div>
      </Card>

      {/* Учебный трек */}
      {isStudent && (
        <Card className="mt-6 space-y-6">
          <div>
            <h2 className="font-bold text-ink-900">Учебный трек</h2>
            <p className="mt-1 text-sm text-ink-500">
              По этому подбираются задания, кружки и события. Всё необязательно.
            </p>
          </div>

          <div>
            <span className="text-sm font-semibold text-ink-800">Уровень подготовки</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {KNOWLEDGE_LEVELS.map((level) => {
                const active = schoolProfile?.knowledge_level === level.id;
                return (
                  <button
                    key={level.id}
                    aria-pressed={active}
                    onClick={() => save({}, { knowledgeLevel: active ? null : level.id })}
                    className={`rounded-[var(--radius-control)] border px-4 py-3 text-left transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
                      active
                        ? 'border-brand-300 bg-brand-50'
                        : 'border-ink-200 bg-white hover:border-brand-200'
                    }`}
                  >
                    <span
                      className={`block text-sm font-semibold ${
                        active ? 'text-brand-700' : 'text-ink-800'
                      }`}
                    >
                      {level.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-400">{level.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-sm font-semibold text-ink-800">Интересы</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {INTERESTS.map((interest) => {
                const current = schoolProfile?.interests ?? [];
                const active = current.includes(interest.id);
                return (
                  <button
                    key={interest.id}
                    aria-pressed={active}
                    onClick={() =>
                      save(
                        {},
                        {
                          interests: active
                            ? current.filter((id) => id !== interest.id)
                            : [...current, interest.id],
                        },
                      )
                    }
                    className={`rounded-[var(--radius-pill)] border px-3.5 py-2 text-sm font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
                      active
                        ? 'border-brand-300 bg-brand-50 text-brand-700'
                        : 'border-ink-200 bg-white text-ink-500 hover:border-brand-200 hover:text-brand-600'
                    }`}
                  >
                    {interest.title}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Для учителя */}
      {schoolProfile?.role === 'teacher' && (
        <Card className="mt-6 space-y-6">
          <div>
            <h2 className="font-bold text-ink-900">О себе</h2>
            <p className="mt-1 text-sm text-ink-500">Видно ученикам на вашей странице.</p>
          </div>

          <DraftArea
            id="bio"
            label="Опыт и специализация"
            placeholder="Что преподаёте, сколько лет, к чему готовите"
            stored={schoolProfile?.bio ?? ''}
            draft={bioDraft}
            onChange={setBioDraft}
            onSave={() => {
              save({}, { bio: bioDraft ?? '' });
              setBioDraft(null);
            }}
          />

          <DraftArea
            id="availability"
            label="Когда доступны"
            placeholder="Например: консультации по вторникам и четвергам после 15:00"
            stored={schoolProfile?.availability ?? ''}
            draft={availabilityDraft}
            onChange={setAvailabilityDraft}
            onSave={() => {
              save({}, { availability: availabilityDraft ?? '' });
              setAvailabilityDraft(null);
            }}
          />
        </Card>
      )}

      {/* Уведомления */}
      <Card className="mt-6 space-y-4">
        <div>
          <h2 className="font-bold text-ink-900">Уведомления</h2>
          <p className="mt-1 text-sm text-ink-500">О чём напоминать.</p>
        </div>

        <Toggle
          checked={schoolProfile?.notify_learning ?? true}
          onChange={(value) => save({}, { notifyLearning: value })}
          title="Учебные"
          hint="Начало вебинара, проверенная работа, ответ на вопрос."
        />
        <Toggle
          checked={schoolProfile?.notify_org ?? true}
          onChange={(value) => save({}, { notifyOrg: value })}
          title="Организационные"
          hint="Дедлайны, изменения в расписании, сбои."
        />
        {/*
          Маркетинг стоит последним и выключен по умолчанию: это дети, и
          согласие на рекламу должно быть отдельным осознанным действием,
          а не флажком, который забыли снять.
        */}
        <Toggle
          checked={schoolProfile?.notify_marketing ?? false}
          onChange={(value) => save({}, { notifyMarketing: value })}
          title="Новости платформы"
          hint="Новые курсы и подборки. По умолчанию выключено."
        />
      </Card>

      {/* Расписание */}
      {isStudent && (
        <Card className="mt-6 space-y-6">
          <div>
            <h2 className="font-bold text-ink-900">Когда удобно заниматься</h2>
            <p className="mt-1 text-sm text-ink-500">
              По этому раскладывается план и подбирается время напоминаний.
            </p>
          </div>

          <div>
            <span className="text-sm font-semibold text-ink-800">Дни</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => {
                const current = schoolProfile?.study_days ?? [];
                const active = current.includes(day.id);
                return (
                  <button
                    key={day.id}
                    aria-pressed={active}
                    onClick={() =>
                      save(
                        {},
                        {
                          studyDays: active
                            ? current.filter((id) => id !== day.id)
                            : [...current, day.id],
                        },
                      )
                    }
                    className={`h-11 w-12 rounded-[var(--radius-control)] border text-sm font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
                      active
                        ? 'border-brand-300 bg-brand-50 text-brand-700'
                        : 'border-ink-200 bg-white text-ink-500 hover:border-brand-200'
                    }`}
                  >
                    {day.short}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-sm font-semibold text-ink-800">Время</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {STUDY_TIMES.map((time) => {
                const active = schoolProfile?.study_time === time.id;
                return (
                  <button
                    key={time.id}
                    aria-pressed={active}
                    onClick={() => save({}, { studyTime: active ? null : time.id })}
                    className={`rounded-[var(--radius-control)] border px-4 py-2.5 text-sm font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
                      active
                        ? 'border-brand-300 bg-brand-50 text-brand-700'
                        : 'border-ink-200 bg-white text-ink-500 hover:border-brand-200'
                    }`}
                  >
                    {time.title}
                    <span className="ml-1.5 font-medium text-ink-400">{time.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-sm font-semibold text-ink-800">Напоминать</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {REMINDER_LEADS.map((minutes) => {
                const active = schoolProfile?.reminder_lead_minutes === minutes;
                return (
                  <button
                    key={minutes}
                    aria-pressed={active}
                    onClick={() => save({}, { reminderLead: active ? null : minutes })}
                    className={`rounded-[var(--radius-pill)] border px-3.5 py-2 text-sm font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
                      active
                        ? 'border-brand-300 bg-brand-50 text-brand-700'
                        : 'border-ink-200 bg-white text-ink-500 hover:border-brand-200'
                    }`}
                  >
                    {reminderLabel(minutes)}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-ink-400">
              Нажмите ещё раз по выбранному, чтобы не напоминать.
            </p>
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

/**
 * Переключатель настройки.
 *
 * Флажок с подписью и пояснением. Пояснение обязательно: почти каждая
 * настройка приватности здесь меняет то, что видят другие люди, и без
 * объяснения «что именно» человек либо не тронет её вовсе, либо включит
 * не то, что имел в виду.
 */
function Toggle({
  checked,
  onChange,
  title,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand-500)]"
      />
      <span>
        <span className="block text-sm font-semibold text-ink-800">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-ink-500">{hint}</span>
      </span>
    </label>
  );
}

/**
 * Многострочное поле с отдельной кнопкой сохранения.
 *
 * Не сохраняет по каждому нажатию клавиши: это текст, который пишут
 * абзацами, и запрос на букву означал бы десятки запросов и мигающее
 * «сохранено». Кнопка появляется, только когда текст изменили.
 */
function DraftArea({
  id,
  label,
  placeholder,
  stored,
  draft,
  onChange,
  onSave,
}: {
  id: string;
  label: string;
  placeholder: string;
  stored: string;
  draft: string | null;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-ink-800" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        value={draft ?? stored}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-[var(--radius-control)] border border-ink-200 px-4 py-2.5 text-sm outline-none transition-colors duration-150 focus:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-500"
      />
      {draft !== null && draft !== stored && (
        <div className="mt-2">
          <Button size="sm" variant="secondary" onClick={onSave}>
            Сохранить
          </Button>
        </div>
      )}
    </div>
  );
}
