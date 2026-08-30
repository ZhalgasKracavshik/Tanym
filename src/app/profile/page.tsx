'use client';

/**
 * Профиль пользователя Tanym.
 *
 * Полный личный кабинет со структурированными вкладками:
 * 1. Личные данные и «О себе» (биография, телефон, соцсети, уровень, интересы).
 * 2. Учёба и класс (класс 7-12, предметы, цели, дата экзамена, карточка класса с кодом).
 * 3. Активность и портфолио (достижения, олимпиады, освоенные темы, баллы).
 * 4. Настройки и безопасность (пароль, язык, приватность, уведомления, выход).
 */

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/components/StoreProvider';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { useOwnStreakPoints, useSchoolLeaderboard } from '@/lib/supabase/leaderboard';
import { rankEntries } from '@/lib/leaderboard';
import { summarize } from '@/lib/personalization';
import { AchievementForm, PortfolioGrid, portfolioPoints, usePortfolio } from '@/components/Portfolio';
import { Avatar } from '@/components/Avatar';
import { SocialLinks } from '@/components/SocialLinks';
import { parseSocialLinks } from '@/lib/social';
import type { SocialLink } from '@/lib/social';
import { Icon, type IconName } from '@/components/Icon';
import { Reveal } from '@/components/motion';
import { SuccessCheckMark } from '@/components/SuccessCheckMark';
import { TIER_LABEL, levelFromPoints, pointsWord } from '@/lib/level';
import { Button, Card, Kicker, Skeleton } from '@/components/ui';
import { PasswordField, SubmitButton } from '@/components/auth-ui';
import { COVER_TYPES, coverError } from '@/components/ImageField';
import { avatarPhotoUrl } from '@/lib/supabase/avatarPhoto';
import { createClient } from '@/lib/supabase/client';
import { GRADES, LEARNING_GOALS } from '@/lib/types';
import type { Grade, LearningGoal } from '@/lib/types';
import { SUBJECTS } from '@/data';
import {
  INTERESTS,
  KNOWLEDGE_LEVELS,
  STUDY_TIMES,
  WEEKDAYS,
  normalizePhone,
} from '@/lib/profileFields';

/** Языки интерфейса */
const LANGUAGE_OPTIONS: { id: 'ru' | 'kk' | 'en'; title: string }[] = [
  { id: 'ru', title: 'Русский' },
  { id: 'kk', title: 'Қазақша' },
  { id: 'en', title: 'English' },
];

type ProfileTab = 'personal' | 'study' | 'activity' | 'settings';

const TABS: { id: ProfileTab; label: string; icon: IconName }[] = [
  { id: 'personal', label: 'Личные данные', icon: 'sparkles' },
  { id: 'study', label: 'Учёба и класс', icon: 'cap' },
  { id: 'activity', label: 'Активность и достижения', icon: 'trophy' },
  { id: 'settings', label: 'Настройки и безопасность', icon: 'settings' },
];

const ROLE_TITLE: Record<string, string> = {
  student: 'Ученик',
  teacher: 'Учитель',
  admin: 'Администратор',
};

function StatCard({ icon, value, label }: { icon: IconName; value: number | string; label: string }) {
  return (
    <div className="rounded-[var(--radius-control)] border border-white/15 bg-white/10 px-4 py-3.5 backdrop-blur transition-all hover:bg-white/15">
      <p className="flex items-center gap-2 text-xl font-bold tabular-nums text-white">
        <Icon name={icon} size={18} className="text-white/70" />
        {value}
      </p>
      <p className="mt-0.5 text-xs text-white/60">{label}</p>
    </div>
  );
}

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
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-100 p-3.5 transition-colors hover:bg-ink-50/50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[var(--color-brand-500)]"
      />
      <div>
        <span className="block text-sm font-semibold text-ink-800">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">{hint}</span>
      </div>
    </label>
  );
}

function ProfileContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as ProfileTab | null;

  const { state, hydrated, updateProfile, resetAll, setLanguage } = useStore();
  const {
    profile: schoolProfile,
    schoolClass,
    email,
    emailConfirmed,
    loading,
    signOut,
    updatePassword,
    refresh,
  } = useSchoolAuth();

  const [activeTab, setActiveTab] = useState<ProfileTab>(
    tabParam && ['personal', 'study', 'activity', 'settings'].includes(tabParam)
      ? tabParam
      : 'personal',
  );

  useEffect(() => {
    if (tabParam && ['personal', 'study', 'activity', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const [refreshKey, setRefreshKey] = useState(0);
  const [savedAlert, setSavedAlert] = useState(false);
  const [savedTick, setSavedTick] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);

  /*
    Черновики множественных наборов.

    Отметки предметов, интересов и дней считались от значения, пришедшего
    с сервера, а оно обновляется только после ответа PATCH. Три быстрых
    клика подряд читали одну и ту же исходную пустоту и уходили тремя
    запросами вида ['math'], ['physics'], ['history'] — в базе оставался
    последний, то есть один предмет вместо трёх. Пока ответ не пришёл,
    источник истины — то, что человек уже нажал.
  */
  const [subjectsDraft, setSubjectsDraft] = useState<string[] | null>(null);
  const [interestsDraft, setInterestsDraft] = useState<string[] | null>(null);
  const [daysDraft, setDaysDraft] = useState<number[] | null>(null);

  /*
    Те же наборы, но в ref — и это не дубль состояния, а необходимость.

    Состояние обновляется к следующему рендеру, а два клика подряд успевают
    произойти в одном такте: второй обработчик читает замыкание первого
    рендера и не видит только что сделанного выбора. Проверено вживую —
    два быстрых клика сохраняли один предмет вместо двух. Ref меняется
    синхронно, поэтому следующий клик в том же такте считает от него.
  */
  const subjectsRef = useRef<string[] | null>(null);
  const interestsRef = useRef<string[] | null>(null);
  const daysRef = useRef<number[] | null>(null);

  // Редактирование имени
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  // Загрузка фото
  const [photoStatus, setPhotoStatus] = useState<'idle' | 'uploading'>('idle');
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Личные данные
  const [phoneDraft, setPhoneDraft] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [bioDraft, setBioDraft] = useState<string | null>(null);
  const [socialDraft, setSocialDraft] = useState<SocialLink[] | null>(null);

  // Смена пароля
  const [password, setPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Копирование кода класса
  const [copiedCode, setCopiedCode] = useState(false);

  /*
    Подпись к сроку правится черновиком: поле текстовое, и сохранять его
    нужно по уходу с фокуса, а не на каждое нажатие клавиши.
  */
  const [targetLabelDraft, setTargetLabelDraft] = useState<string>('');
  const loadedLabelFor = useRef<string | null>(null);

  /*
    Подтягиваем сохранённое значение ровно один раз на пользователя.
    Синхронизировать черновик с профилем на каждый рендер нельзя: ответ
    PATCH возвращается позже нажатий, и текст прыгал бы под курсором.
  */
  useEffect(() => {
    if (!schoolProfile) return;
    if (loadedLabelFor.current === schoolProfile.id) return;
    loadedLabelFor.current = schoolProfile.id;
    setTargetLabelDraft(schoolProfile.target_label ?? '');
  }, [schoolProfile]);

  const achievements = usePortfolio(schoolProfile?.id ?? null, refreshKey);
  const streakPoints = useOwnStreakPoints(schoolProfile?.id ?? null);
  const others = useSchoolLeaderboard(schoolProfile?.id ?? null);

  if (!hydrated || loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-48 w-full rounded-[var(--radius-card)]" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-[var(--radius-card)]" />
      </div>
    );
  }

  const displayName = schoolProfile?.name ?? state.profile?.name ?? 'Ученик';
  const role = schoolProfile?.role ?? state.profile?.role ?? 'student';
  const isStudent = role === 'student';

  const summary = summarize(state);
  const achievementPoints = portfolioPoints(achievements);
  const totalPoints = summary.points + achievementPoints + streakPoints;
  const level = levelFromPoints(totalPoints);

  const socialLinks = socialDraft ?? parseSocialLinks(schoolProfile?.social_links);
  const currentGrade = (schoolProfile?.grade ?? state.profile?.grade ?? 10) as Grade;
  const currentSubjects = subjectsDraft ?? schoolProfile?.subject_ids ?? state.profile?.subjectIds ?? ['math'];
  const currentGoal = (schoolProfile?.goal ?? state.profile?.goal ?? 'ent') as LearningGoal;
  const currentTargetDate = schoolProfile?.target_date ?? state.profile?.targetDate ?? '';

  // Текущая фотография (локальная Data URL или URL из Supabase)
  const currentPhotoUrl =
    state.profile?.avatarPhotoUrl ||
    avatarPhotoUrl(schoolProfile?.avatar_photo_path) ||
    null;

  const myRank =
    isStudent && others
      ? (rankEntries([
          ...others,
          {
            id: schoolProfile?.id ?? 'local',
            name: displayName,
            grade: currentGrade as never,
            points: totalPoints,
            topicsMastered: summary.topicsMastered,
            streak: state.streak.current,
            isCurrentUser: true,
          },
        ]).find((entry) => entry.isCurrentUser)?.rank ?? null)
      : null;

  function triggerSaveFeedback() {
    setSavedAlert(true);
    // Счётчик меняет key у галочки — иначе при втором сохранении подряд
    // она просто останется висеть, не проигравшись заново.
    setSavedTick((tick) => tick + 1);
    setTimeout(() => setSavedAlert(false), 3000);
  }

  /**
   * Сохранение поля профиля.
   *
   * Плашка «Изменения успешно сохранены» показывается ТОЛЬКО после
   * успешного ответа. Раньше она рисовалась до запроса и не зависела от
   * него вовсе: протухшая сессия давала 401, ошибка глоталась пустым
   * catch, а человек видел зелёное «сохранено» — и терял введённое,
   * ничего об этом не узнав.
   */
  async function save(
    patch: Parameters<typeof updateProfile>[0],
    remote: Record<string, unknown>,
  ): Promise<boolean> {
    // Локальную копию меняем сразу: экран не должен ждать сети.
    updateProfile(patch);
    setSaveError(null);

    // Без школьного профиля сохранять некуда — правка чисто локальная.
    if (!schoolProfile) {
      triggerSaveFeedback();
      return true;
    }

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(remote),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setSaveError(
          data?.error === 'not_authenticated'
            ? 'Сессия истекла — войдите заново, изменения не сохранены.'
            : data?.error === 'invalid_phone'
              ? 'Проверьте номер телефона: изменения не сохранены.'
              : 'Не удалось сохранить. Проверьте связь и попробуйте ещё раз.',
        );
        return false;
      }

      triggerSaveFeedback();
      /*
        Тихое обновление. refresh() без флага поднимает loading, а на нём
        завязан скелетон в начале этой же страницы: выбор класса или
        предмета гасил всю страницу и рисовал её заново — со стороны это
        выглядело как полная перезагрузка на каждое нажатие.
      */
      await refresh(true);
      return true;
    } catch {
      setSaveError('Не удалось сохранить. Проверьте связь и попробуйте ещё раз.');
      return false;
    }
  }

  /**
   * Загрузка фотографии:
   * 1. Считываем Data URL для мгновенного локального превью в любом режиме.
   * 2. Если пользователь авторизован, отправляем файл в бакет Supabase и сохраняем путь.
   */
  function handlePhotoSelect(file: File) {
    const problem = coverError(file);
    if (problem) {
      setPhotoError(problem);
      return;
    }
    setPhotoError(null);
    setPhotoStatus('uploading');

    // Локальное чтение (мгновенное отображение)
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        updateProfile({ avatarPhotoUrl: dataUrl });
      }

      // Если есть профиль Supabase — загружаем в хранилище
      if (schoolProfile) {
        try {
          const supabase = createClient();
          const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
          const path = `${schoolProfile.id}/${Date.now()}.${extension}`;

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(path, file, { upsert: true });

          if (!uploadError) {
            const publicUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
            save(
              { avatarPhotoPath: path, avatarPhotoUrl: publicUrl || dataUrl },
              { avatarPhotoPath: path },
            );
          } else {
            // Даже если облачное хранилище не ответило, локально фото уже сохранено
            save({ avatarPhotoUrl: dataUrl }, {});
          }
        } catch {
          save({ avatarPhotoUrl: dataUrl }, {});
        }
      } else {
        triggerSaveFeedback();
      }
      setPhotoStatus('idle');
    };

    reader.onerror = () => {
      setPhotoStatus('idle');
      setPhotoError('Не удалось прочитать файл изображения.');
    };

    reader.readAsDataURL(file);
  }

  function handleRemovePhoto() {
    updateProfile({ avatarPhotoUrl: null, avatarPhotoPath: null });
    save({ avatarPhotoUrl: null, avatarPhotoPath: null }, { avatarPhotoPath: null });
  }

  function saveName() {
    const trimmed = nameDraft.trim();
    if (trimmed.length >= 2 && trimmed !== displayName) {
      save({ name: trimmed }, { name: trimmed });
    }
    setEditingName(false);
  }

  function saveBio() {
    const text = bioDraft ?? schoolProfile?.bio ?? '';
    save({}, { bio: text.trim() });
    setBioDraft(null);
  }

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

  function saveSocialLinks(next: SocialLink[]) {
    setSocialDraft(next);
    save({}, { socialLinks: next });
  }

  async function toggleSubject(id: string) {
    const base = subjectsRef.current ?? currentSubjects;
    const updated = base.includes(id) ? base.filter((item) => item !== id) : [...base, id];
    // Хотя бы один предмет обязателен: без них план строить не из чего.
    if (updated.length === 0) return;

    subjectsRef.current = updated;
    setSubjectsDraft(updated);
    const ok = await save({ subjectIds: updated }, { subjectIds: updated });
    // Не сохранилось — возвращаем отметки к тому, что реально в базе.
    if (!ok) {
      subjectsRef.current = null;
      setSubjectsDraft(null);
    }
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
    triggerSaveFeedback();
  }

  function copyClassCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  // Сколько дней осталось до срока, который ученик поставил себе сам.
  const daysUntilTarget = currentTargetDate
    ? Math.max(0, Math.ceil((new Date(currentTargetDate).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)))
    : null;

  /*
    Склонение «день/дня/дней»: «Осталось 2 дней» в интерфейсе, который
    читают школьники, выглядит как недоделка. Правило стандартное —
    11–14 всегда «дней», дальше по последней цифре.
  */
  function daysWord(count: number): string {
    const lastTwo = count % 100;
    if (lastTwo >= 11 && lastTwo <= 14) return 'дней';
    const last = count % 10;
    if (last === 1) return 'день';
    if (last >= 2 && last <= 4) return 'дня';
    return 'дней';
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Шапка профиля */}
      <Reveal immediate>
        <div
          className="relative overflow-hidden rounded-[var(--radius-card)] p-6 text-white shadow-[var(--shadow-float)] sm:p-8"
          style={{ background: 'var(--gradient-ink)' }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
            style={{ background: 'var(--gradient-brand)' }}
          />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
            {/* Аватар с возможностью мгновенной загрузки */}
            <div className="group relative flex shrink-0 items-center justify-center">
              <Avatar
                name={displayName}
                colorId={schoolProfile?.avatar_color}
                photoUrl={currentPhotoUrl}
                size={84}
                className="border-2 border-white/20 shadow-md"
              />
              <label
                title="Загрузить фото"
                className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 text-xs font-semibold text-white opacity-0 backdrop-blur-xs transition-opacity group-hover:opacity-100"
              >
                <Icon name="image" size={20} />
                <input
                  type="file"
                  accept={COVER_TYPES.join(',')}
                  className="sr-only"
                  disabled={photoStatus === 'uploading'}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) handlePhotoSelect(file);
                  }}
                />
              </label>
            </div>

            {/* Имя, никнейм и статус */}
            <div className="min-w-0 flex-1">
              {editingName ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder="Ваше имя или никнейм"
                    maxLength={60}
                    autoFocus
                    className="rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xl font-bold text-white outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/40"
                  />
                  <Button size="sm" onClick={saveName}>
                    Сохранить
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>
                    Отмена
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-2xl font-bold text-white sm:text-3xl">{displayName}</h1>
                  <button
                    onClick={() => {
                      setNameDraft(displayName);
                      setEditingName(true);
                    }}
                    title="Изменить имя"
                    className="rounded p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Icon name="edit" size={16} />
                  </button>
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-white/70">
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 font-semibold text-white">
                  {ROLE_TITLE[role]}
                </span>
                {isStudent && (
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5">
                    {currentGrade} класс
                  </span>
                )}
                {schoolClass ? (
                  <span className="rounded-full bg-brand-500/30 px-2.5 py-0.5 text-brand-200">
                    «{schoolClass.name}»
                  </span>
                ) : (
                  <span className="rounded-full bg-brand-500/30 px-2.5 py-0.5 text-brand-200">
                    Мой класс
                  </span>
                )}
                {email && <span className="truncate text-white/50">{email}</span>}
              </div>

              {/* Кнопки управления фото */}
              <div className="mt-3 flex items-center gap-3 text-xs text-white/60">
                <label className="cursor-pointer font-semibold text-brand-300 transition-colors hover:text-brand-200 hover:underline">
                  {photoStatus === 'uploading' ? 'Загрузка…' : 'Загрузить фото'}
                  <input
                    type="file"
                    accept={COVER_TYPES.join(',')}
                    className="sr-only"
                    disabled={photoStatus === 'uploading'}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) handlePhotoSelect(file);
                    }}
                  />
                </label>
                {currentPhotoUrl && (
                  <>
                    <span>·</span>
                    <button
                      onClick={handleRemovePhoto}
                      className="text-white/50 transition-colors hover:text-danger-300 hover:underline"
                    >
                      Удалить фото
                    </button>
                  </>
                )}
              </div>
              {photoError && <p className="mt-1 text-xs text-danger-300">{photoError}</p>}
            </div>
          </div>

          {/* Статистика */}
          {isStudent && (
            <>
              <div className="relative mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <StatCard icon="trophy" value={totalPoints} label="всего баллов" />
                <StatCard icon="medal" value={achievementPoints} label="за достижения" />
                <StatCard icon="flame" value={state.streak.current} label="дней подряд" />
                <StatCard icon="chart" value={myRank ? `#${myRank}` : '—'} label="место в школе" />
              </div>

              {/* Уровень и прогресс */}
              <div className="relative mt-4 rounded-[var(--radius-control)] border border-white/15 bg-white/5 px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-xs font-bold text-white">
                    Уровень {level.level}
                    <span className="ml-2 font-medium text-white/60">{TIER_LABEL[level.tier]}</span>
                  </p>
                  {level.nextAt !== null && (
                    <p className="text-[11px] tabular-nums text-white/50">
                      до следующего уровня: {level.nextAt - totalPoints} {pointsWord(level.nextAt - totalPoints)}
                    </p>
                  )}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max(4, Math.round(level.progress * 100))}%`,
                      background: 'var(--gradient-brand)',
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </Reveal>

      {/* Ошибка сохранения — важнее успеха, поэтому выше него */}
      {saveError && (
        <div className="mt-4 flex items-center gap-3 rounded-[var(--radius-control)] border border-danger-200 bg-danger-50 px-4 py-3">
          <span className="shrink-0 text-danger-600">
            <Icon name="alert" size={18} />
          </span>
          <span className="text-sm font-semibold text-danger-700">{saveError}</span>
        </div>
      )}

      {/* Уведомление об успешном сохранении */}
      {savedAlert && !saveError && (
        <div className="mt-4 flex items-center gap-3 rounded-[var(--radius-control)] border border-success-200 bg-success-50 px-4 py-3">
          {/*
            key по счётчику: без него React переиспользует тот же узел при
            повторном сохранении, состояние остаётся "in", и анимация
            проигрывается ровно один раз за всю жизнь страницы.
          */}
          <span className="shrink-0 text-success-600">
            <SuccessCheckMark key={savedTick} size={22} />
          </span>
          <span className="text-sm font-semibold text-success-700">
            Изменения успешно сохранены
          </span>
        </div>
      )}

      {/* Вкладки навигации по профилю */}
      <div className="mt-6 border-b border-ink-200">
        <div className="flex gap-1 overflow-x-auto pb-px">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  active
                    ? 'border-brand-500 text-brand-700 bg-brand-50/40 rounded-t-lg'
                    : 'border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-800'
                }`}
              >
                <Icon name={tab.icon} size={17} className={active ? 'text-brand-600' : 'text-ink-400'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Контент вкладок */}
      <div className="mt-6">
        {/* ВКЛАДКА 1: ЛИЧНЫЕ ДАННЫЕ */}
        {activeTab === 'personal' && (
          <div className="space-y-6">
            {/* О себе / Биография */}
            <Card>
              <h2 className="text-base font-bold text-ink-900">О себе</h2>
              <p className="mt-1 text-xs text-ink-500">
                Расскажите о своих целях, любимых предметах или увлечениях.
              </p>
              <div className="mt-3">
                <textarea
                  rows={3}
                  value={bioDraft ?? schoolProfile?.bio ?? ''}
                  placeholder="Например: Готовлюсь к ЕНТ по профильной физике, увлекаюсь программированием и олимпиадами…"
                  onChange={(e) => setBioDraft(e.target.value)}
                  className="w-full rounded-[var(--radius-control)] border border-ink-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
                {bioDraft !== null && bioDraft !== (schoolProfile?.bio ?? '') && (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={saveBio}>
                      Сохранить описание
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setBioDraft(null)}>
                      Отмена
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Контакты и связь */}
            <Card className="space-y-4">
              <h2 className="text-base font-bold text-ink-900">Контакты</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Почта */}
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">Почта</span>
                  <div className="mt-1.5 flex items-center justify-between rounded-xl border border-ink-200 bg-ink-50/70 px-3.5 py-2.5 text-sm">
                    <span className="truncate text-ink-700 font-medium">{email ?? 'Без почты'}</span>
                    {emailConfirmed ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-success-600">
                        <Icon name="check" size={14} /> Подтверждена
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-accent-600">Не подтверждена</span>
                    )}
                  </div>
                </div>

                {/* Телефон */}
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">Телефон</span>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      type="tel"
                      value={phoneDraft ?? schoolProfile?.phone ?? ''}
                      onChange={(e) => setPhoneDraft(e.target.value)}
                      placeholder="+7 700 000 00 00"
                      className="min-w-0 flex-1 rounded-xl border border-ink-200 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={phoneDraft === null || phoneDraft === (schoolProfile?.phone ?? '')}
                      onClick={savePhone}
                    >
                      Сохранить
                    </Button>
                  </div>
                  {phoneError && <p className="mt-1 text-xs text-danger-600">{phoneError}</p>}
                </div>
              </div>

              {/* Социальные сети и мессенджеры */}
              <div className="pt-3 border-t border-ink-100">
                <span className="block text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2">
                  Мессенджеры и социальные сети
                </span>
                <SocialLinks links={socialLinks} editable onChange={saveSocialLinks} />
              </div>
            </Card>

            {/* Уровень подготовки и интересы */}
            {isStudent && (
              <Card className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-ink-900">Уровень подготовки</h2>
                  <p className="mt-1 text-xs text-ink-500">Ваша текущая самооценка владения школьной программой.</p>
                  <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    {KNOWLEDGE_LEVELS.map((lvl) => {
                      const active = schoolProfile?.knowledge_level === lvl.id;
                      return (
                        <button
                          key={lvl.id}
                          onClick={() => save({}, { knowledgeLevel: active ? null : lvl.id })}
                          className={`rounded-xl border p-3 text-left transition-all ${
                            active
                              ? 'border-brand-500 bg-brand-50/70 text-brand-900 shadow-xs'
                              : 'border-ink-200 bg-white hover:border-ink-300'
                          }`}
                        >
                          <span className="block text-sm font-bold">{lvl.title}</span>
                          <span className="mt-0.5 block text-xs text-ink-500">{lvl.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-ink-100 pt-5">
                  <h2 className="text-base font-bold text-ink-900">Интересы</h2>
                  <p className="mt-1 text-xs text-ink-500">По ним подбираются конкурсы, кружки и дополнительные темы.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {INTERESTS.map((interest) => {
                      const current = interestsDraft ?? schoolProfile?.interests ?? [];
                      const active = current.includes(interest.id);
                      return (
                        <button
                          key={interest.id}
                          onClick={async () => {
                            const base = interestsRef.current ?? current;
                            const updated = base.includes(interest.id)
                              ? base.filter((id) => id !== interest.id)
                              : [...base, interest.id];
                            interestsRef.current = updated;
                            setInterestsDraft(updated);
                            const ok = await save({}, { interests: updated });
                            if (!ok) {
                              interestsRef.current = null;
                              setInterestsDraft(null);
                            }
                          }}
                          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                            active
                              ? 'border-brand-400 bg-brand-50 text-brand-700 font-bold'
                              : 'border-ink-200 bg-white text-ink-600 hover:border-brand-200'
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
          </div>
        )}

        {/* ВКЛАДКА 2: УЧЁБА И КЛАСС */}
        {activeTab === 'study' && (
          <div className="space-y-6">
            {/* Класс */}
            <Card>
              <h2 className="text-base font-bold text-ink-900">Класс обучения</h2>
              <p className="mt-1 text-xs text-ink-500">Выберите текущий класс для калибровки учебной программы.</p>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {GRADES.map((grade: Grade) => {
                  const active = currentGrade === grade;
                  return (
                    <button
                      key={grade}
                      onClick={() => save({ grade }, { grade })}
                      className={`rounded-xl border-2 py-3 text-base font-bold tabular-nums transition-all ${
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
            </Card>

            {/* Предметы */}
            <Card>
              <h2 className="text-base font-bold text-ink-900">Изучаемые предметы</h2>
              <p className="mt-1 text-xs text-ink-500">Выберите предметы, по которым строится персональный план.</p>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
                {SUBJECTS.map((subject) => {
                  const active = currentSubjects.includes(subject.id);
                  return (
                    <button
                      key={subject.id}
                      onClick={() => toggleSubject(subject.id)}
                      className={`flex items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all ${
                        active
                          ? 'border-brand-500 bg-brand-50/70 shadow-xs'
                          : 'border-ink-200 bg-white hover:border-brand-300'
                      }`}
                    >
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-white shrink-0"
                        style={{ backgroundColor: subject.accent }}
                      >
                        <Icon name={subject.icon} size={18} />
                      </span>
                      <div>
                        <span className="block text-sm font-bold text-ink-900">{subject.title}</span>
                        <span className="block text-xs text-ink-500">{active ? 'Изучается' : 'Не выбран'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Цель обучения */}
            <Card>
              <h2 className="text-base font-bold text-ink-900">Цель обучения</h2>
              <p className="mt-1 text-xs text-ink-500">Определяет темп и уровень сложности подбираемых заданий.</p>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {LEARNING_GOALS.map((goal) => {
                  const active = currentGoal === goal.id;
                  return (
                    <button
                      key={goal.id}
                      onClick={() => save({ goal: goal.id as LearningGoal }, { goal: goal.id })}
                      className={`flex items-start gap-3 rounded-xl border-2 p-3.5 text-left transition-all ${
                        active
                          ? 'border-brand-500 bg-brand-50/70 shadow-xs'
                          : 'border-ink-200 bg-white hover:border-brand-300'
                      }`}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700 shrink-0 mt-0.5">
                        <Icon name={goal.icon} size={18} />
                      </span>
                      <div>
                        <span className="block text-sm font-bold text-ink-900">{goal.title}</span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">{goal.description}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/*
              Свой срок под свою цель.

              Раньше здесь стояла «Дата экзамена или олимпиады» — одна дата
              без подписи. Но цель у каждого своя: подтянуть тему к четверти,
              сдать пробник, дойти до районного этапа. Дата без названия не
              отвечает, срок чего это, а подставлять всем «экзамен» — значит
              решать за человека, к чему он готовится.
            */}
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-ink-900">Мой дедлайн</h2>
                  <p className="mt-1 text-xs text-ink-500">
                    Напишите, к чему готовитесь, и поставьте срок — система рассчитает
                    ежедневную норму заданий до этой даты.
                  </p>
                </div>
                {daysUntilTarget !== null && (
                  <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">
                    Осталось {daysUntilTarget} {daysWord(daysUntilTarget)}
                  </span>
                )}
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                <div>
                  <label
                    htmlFor="target-label"
                    className="block text-xs font-semibold text-ink-500"
                  >
                    К чему готовитесь
                  </label>
                  <input
                    id="target-label"
                    type="text"
                    maxLength={120}
                    value={targetLabelDraft}
                    onChange={(event) => setTargetLabelDraft(event.target.value)}
                    /*
                      Сохраняем по уходу с поля, а не на каждую букву: иначе
                      PATCH улетал бы на каждое нажатие, а плашка «Сохранено»
                      мигала бы всю дорогу, пока человек печатает.

                      Значение читаем из самого поля, а не из состояния:
                      состояние приходит из замыкания того рендера, в котором
                      повесили обработчик, и если ввод и уход с поля попали в
                      один тик (автозаполнение, вставка с последующим кликом),
                      в замыкании осталась бы прошлая, пустая строка — и
                      сохранение молча не произошло бы.
                    */
                    onBlur={(event) => {
                      const value = event.target.value.trim();
                      if (value === (schoolProfile?.target_label ?? '')) return;
                      save({}, { targetLabel: value || null });
                    }}
                    // Enter — привычный способ подтвердить строку; без него
                    // приходится угадывать, что нужно щёлкнуть мимо поля.
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.currentTarget.blur();
                    }}
                    placeholder="Например: сдать ЕНТ на 120+"
                    className="mt-1.5 h-11 w-full rounded-xl border border-ink-200 px-4 text-sm outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  />
                </div>

                <div>
                  <label htmlFor="target-date" className="block text-xs font-semibold text-ink-500">
                    Срок
                  </label>
                  <input
                    id="target-date"
                    type="date"
                    value={currentTargetDate}
                    onChange={(event) =>
                      save(
                        { targetDate: event.target.value || undefined },
                        { targetDate: event.target.value || null },
                      )
                    }
                    className="mt-1.5 h-11 w-full sm:w-52 rounded-xl border border-ink-200 px-4 text-sm tabular-nums outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              </div>
            </Card>

            {/* Карточка класса */}
            <Card className="bg-gradient-to-br from-brand-50/60 to-white border-brand-200/80">
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
                      ? 'Раздайте код ученикам, чтобы подключить их к вашей панели.'
                      : 'Ваш учитель видит результаты выполненных заданий и прогресс.'}
                  </p>
                </div>

                {/* Код класса */}
                <div className="flex items-center gap-2">
                  <div className="rounded-xl border border-brand-300 bg-white px-4 py-2 text-center shadow-xs">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-400">Код класса</span>
                    <span className="font-mono text-lg font-black tracking-widest text-brand-600">
                      {schoolClass?.code ?? 'VNMBCD'}
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => copyClassCode(schoolClass?.code ?? 'VNMBCD')}
                  >
                    <Icon name={copiedCode ? 'check' : 'copy'} size={15} />
                    {copiedCode ? 'Скопировано!' : 'Копировать'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ВКЛАДКА 3: АКТИВНОСТЬ И ДОСТИЖЕНИЯ */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            {/* Обзор активности */}
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="text-center p-5">
                <p className="text-3xl font-black text-brand-600">{summary.topicsMastered}</p>
                <p className="mt-1 text-xs font-semibold text-ink-500">Освоено тем</p>
              </Card>
              <Card className="text-center p-5">
                <p className="text-3xl font-black text-ink-800">{state.attempts.length}</p>
                <p className="mt-1 text-xs font-semibold text-ink-500">Решено заданий</p>
              </Card>
              <Card className="text-center p-5">
                <p className="text-3xl font-black text-accent-600">{state.streak.current} дн.</p>
                <p className="mt-1 text-xs font-semibold text-ink-500">Серия занятий</p>
              </Card>
            </div>

            {/* Портфолио достижений */}
            {isStudent ? (
              <div className="space-y-6">
                <div>
                  <Kicker>Портфолио</Kicker>
                  <h2 className="mt-1 text-xl font-bold text-ink-900">Достижения и олимпиады</h2>
                  <p className="mt-1 text-xs text-ink-500">
                    Добавляйте грамоты, сертификаты и участие в олимпиадах — они начисляют баллы в рейтинг школы.
                  </p>
                </div>

                <AchievementForm
                  studentId={schoolProfile?.id ?? ''}
                  language={state.language}
                  onSubmitted={() => setRefreshKey((k) => k + 1)}
                />

                <PortfolioGrid
                  items={achievements ?? []}
                  language={state.language}
                  emptyText="У вас пока нет добавленных достижений. Добавьте первое выше!"
                />
              </div>
            ) : (
              <Card>
                <p className="text-sm text-ink-600">
                  Портфолио ведут ученики. Учителям доступны публикации материалов и мониторинг класса.
                </p>
              </Card>
            )}
          </div>
        )}

        {/* ВКЛАДКА 4: НАСТРОЙКИ И БЕЗОПАСНОСТЬ */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Смена пароля */}
            {email && (
              <Card className="space-y-4">
                <div>
                  <h2 className="text-base font-bold text-ink-900">Безопасность и пароль</h2>
                  <p className="mt-1 text-xs text-ink-500">Смените пароль для входа в аккаунт.</p>
                </div>
                <div className="max-w-md space-y-3">
                  <PasswordField
                    label="Новый пароль"
                    autoComplete="new-password"
                    placeholder="Не менее 6 символов"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {passwordError && <p className="text-xs font-semibold text-danger-600">{passwordError}</p>}
                  <SubmitButton
                    type="button"
                    onClick={changePassword}
                    loading={passwordStatus === 'loading'}
                    success={passwordStatus === 'success'}
                  >
                    Обновить пароль
                  </SubmitButton>
                </div>
              </Card>
            )}

            {/* Язык интерфейса */}
            <Card>
              <h2 className="text-base font-bold text-ink-900">Язык интерфейса</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setLanguage(opt.id)}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                      state.language === opt.id
                        ? 'border-brand-500 bg-brand-50 text-brand-700 font-bold shadow-xs'
                        : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
                    }`}
                  >
                    {opt.title}
                  </button>
                ))}
              </div>
            </Card>

            {/* Параметры приватности */}
            {isStudent && (
              <Card className="space-y-3">
                <h2 className="text-base font-bold text-ink-900">Приватность</h2>
                <Toggle
                  checked={schoolProfile?.leaderboard_anonymous ?? state.leaderboardAnonymous ?? false}
                  onChange={(val) => {
                    updateProfile({});
                    save({}, { leaderboardAnonymous: val });
                  }}
                  title="Скрыть моё имя в рейтинге (Анонимный режим)"
                  hint="Одноклассники увидят псевдоним. Ваши баллы и место сохраняются."
                />
                <Toggle
                  checked={schoolProfile?.profile_visible ?? true}
                  onChange={(val) => save({}, { profileVisible: val })}
                  title="Показывать профиль другим ученикам"
                  hint="Разрешить одноклассникам просматривать ваше портфолио."
                />
                <Toggle
                  checked={schoolProfile?.progress_visible ?? false}
                  onChange={(val) => save({}, { progressVisible: val })}
                  title="Показывать оценки и решённые темы"
                  hint="Открыть доступ к вашей детальной успеваемости для одноклассников."
                />
              </Card>
            )}

            {/* Уведомления */}
            <Card className="space-y-3">
              <h2 className="text-base font-bold text-ink-900">Уведомления</h2>
              <Toggle
                checked={schoolProfile?.notify_learning ?? true}
                onChange={(val) => save({}, { notifyLearning: val })}
                title="Учебные напоминания"
                hint="Напоминания о ежедневных уроках, проверенных заданиях и дедлайнах."
              />
              <Toggle
                checked={schoolProfile?.notify_org ?? true}
                onChange={(val) => save({}, { notifyOrg: val })}
                title="Организационные уведомления"
                hint="Сообщения от учителя, расписание и важные школьные новости."
              />
            </Card>

            {/* Расписание занятий */}
            {isStudent && (
              <Card className="space-y-4">
                <div>
                  <h2 className="text-base font-bold text-ink-900">Расписание и напоминания</h2>
                  <p className="mt-1 text-xs text-ink-500">Выберите удобные дни и время для занятий.</p>
                </div>

                <div>
                  <span className="text-xs font-semibold text-ink-600 block mb-2">Дни недели:</span>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => {
                      const current = daysDraft ?? schoolProfile?.study_days ?? [];
                      const active = current.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          onClick={async () => {
                            const base = daysRef.current ?? current;
                            const updated = base.includes(day.id)
                              ? base.filter((id) => id !== day.id)
                              : [...base, day.id];
                            daysRef.current = updated;
                            setDaysDraft(updated);
                            const ok = await save({}, { studyDays: updated });
                            if (!ok) {
                              daysRef.current = null;
                              setDaysDraft(null);
                            }
                          }}
                          className={`h-10 w-10 rounded-xl border text-sm font-bold transition-all ${
                            active
                              ? 'border-brand-500 bg-brand-50 text-brand-700'
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
                  <span className="text-xs font-semibold text-ink-600 block mb-2">Время занятий:</span>
                  <div className="flex flex-wrap gap-2">
                    {STUDY_TIMES.map((time) => {
                      const active = schoolProfile?.study_time === time.id;
                      return (
                        <button
                          key={time.id}
                          onClick={() => save({}, { studyTime: active ? null : time.id })}
                          className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
                            active
                              ? 'border-brand-500 bg-brand-50 text-brand-700 font-bold'
                              : 'border-ink-200 bg-white text-ink-600 hover:border-brand-200'
                          }`}
                        >
                          {time.title} ({time.hint})
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Card>
            )}

            {/* Выход из аккаунта */}
            <Card className="border-danger-100 bg-danger-50/20">
              <h2 className="text-base font-bold text-ink-900">Управление аккаунтом</h2>
              <p className="mt-1 text-xs text-ink-500">
                Вы можете завершить текущий сеанс или очистить локальные сохраненные данные.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => signOut()}>
                  <Icon name="arrowRight" size={16} />
                  Выйти из аккаунта
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    /*
                      Формулировка честная: после защиты в ProgressSync
                      сброс действительно остаётся локальным — пустое
                      состояние наверх больше не уходит, и место в рейтинге
                      школы сохраняется.
                    */
                    if (
                      window.confirm(
                        'Очистить прогресс тренировок в этом браузере? Баллы и место в школьном рейтинге сохранятся — они хранятся на сервере.',
                      )
                    ) {
                      resetAll();
                    }
                  }}
                >
                  Сбросить локальные данные
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl space-y-4 px-4 py-10 sm:px-6">
          <Skeleton className="h-48 w-full rounded-[var(--radius-card)]" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-[var(--radius-card)]" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
