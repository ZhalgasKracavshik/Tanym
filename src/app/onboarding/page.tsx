'use client';

/**
 * Онбординг: код класса → класс → предметы → цель.
 *
 * Собирает поля, без которых кабинет, план и диагностика не работают.
 * Это не выдуманный список: useEffectiveProfile возвращает null, пока у
 * ученика нет grade и subject_ids, и все эти страницы показывают «Профиль
 * ещё не создан». Раньше кнопка оттуда вела сюда, а здесь стоял только
 * спиннер с редиректом — круг замыкался, и заполнить профиль по подсказке
 * приложения было невозможно.
 *
 * Шаг с кодом класса появляется, только если класса ещё нет: код перестал
 * быть обязательным на регистрации, потому что упирал в тупик тех, у кого
 * его нет под рукой, — а без регистрации они не могут вообще ничего.
 *
 * Даты здесь нет намеренно: срок под свою цель ученик ставит сам в
 * профиле, и это не обязательно дата экзамена.
 *
 * Мастер, а не одна форма: короткие экраны с крупными кнопками выбора
 * читаются как знакомство, а длинная анкета на входе — как препятствие.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { createClient } from '@/lib/supabase/client';
import { useStore } from '@/components/StoreProvider';
import { SUBJECTS } from '@/data';
import { GRADES, LEARNING_GOALS } from '@/lib/types';
import type { Grade, LearningGoal, SubjectId } from '@/lib/types';
import { Icon } from '@/components/Icon';
import { Spinner } from '@/components/motion';
import { SuccessCheckMark } from '@/components/SuccessCheckMark';

type Step = 'classcode' | 'grade' | 'subjects' | 'goal';

/*
  Пропустить можно только те шаги, ответ на которые ученик может не знать
  прямо сейчас: код класса ему выдаёт учитель, а цель — вопрос, на который
  не у всех есть готовый ответ в первую минуту. Класс и предметы он про
  себя знает всегда, и без них персонализация не считается вовсе, поэтому
  там «Позже» не показываем.
*/
const SKIPPABLE: Step[] = ['classcode', 'goal'];

const STEP_TITLE: Record<Step, { title: string; hint: string }> = {
  classcode: {
    title: 'Код класса',
    hint: 'Шесть символов от классного руководителя — по ним учитель увидит ваш прогресс. Если кода пока нет, введёте позже в профиле.',
  },
  grade: {
    title: 'В каком вы классе?',
    hint: 'От класса зависит программа и сложность заданий.',
  },
  subjects: {
    title: 'Какие предметы вам нужны?',
    hint: 'Можно выбрать несколько — план построится по каждому.',
  },
  goal: {
    title: 'Чего хотите добиться?',
    hint: 'Цель задаёт темп: подготовка к экзамену и повторение темы идут по-разному.',
  },
};

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, isSignedIn, loading, refresh } = useSchoolAuth();
  const { updateProfile } = useStore();

  const [stepIndex, setStepIndex] = useState(0);
  const [classCode, setClassCode] = useState('');
  const [grade, setGrade] = useState<Grade | null>(null);
  const [subjectIds, setSubjectIds] = useState<SubjectId[]>([]);
  const [goal, setGoal] = useState<LearningGoal | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
    Шаг с кодом показываем только тем, у кого класса ещё нет: пришедший с
    кодом на регистрации уже подключён, и переспрашивать его незачем.
    Состав шагов фиксируем на первый рендер — иначе успешное присоединение
    к классу убрало бы текущий шаг из списка прямо под ногами.
  */
  const [needsClassCode] = useState(
    () => profile?.role === 'student' && !profile.class_id,
  );
  const steps = useMemo<Step[]>(
    () => (needsClassCode ? ['classcode', 'grade', 'subjects', 'goal'] : ['grade', 'subjects', 'goal']),
    [needsClassCode],
  );

  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const canSkip = SKIPPABLE.includes(step);

  /*
    Учителю здесь делать нечего: класс, предметы и цель — ученические поля,
    у него вместо них своя панель и код класса. Гостя разворачиваем на вход.
  */
  useEffect(() => {
    if (loading) return;
    if (!isSignedIn) {
      router.replace('/login');
      return;
    }
    if (profile?.role === 'teacher') router.replace('/teacher');
    if (profile?.role === 'admin') router.replace('/admin');
  }, [loading, isSignedIn, profile?.role, router]);

  /*
    Подставляем то, что уже есть в профиле: сюда попадают и те, кто зашёл
    второй раз — переспрашивать заполненное незачем.

    Правка состояния прямо в рендере, а не в эффекте. Это тот самый случай,
    который React описывает как «поправить состояние при смене входных
    данных»: эффект дал бы лишний коммит и один кадр с пустым выбором,
    который тут же перерисовывается заполненным.
  */
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);
  if (profile && prefilledFor !== profile.id) {
    setPrefilledFor(profile.id);
    if (profile.grade != null) setGrade(profile.grade as Grade);
    if (profile.subject_ids?.length) setSubjectIds(profile.subject_ids as SubjectId[]);
    if (profile.goal) setGoal(profile.goal as LearningGoal);
  }

  const canContinue = useMemo(() => {
    if (step === 'classcode') return classCode.trim().length > 0;
    if (step === 'grade') return grade !== null;
    if (step === 'subjects') return subjectIds.length > 0;
    return goal !== null;
  }, [step, classCode, grade, subjectIds, goal]);

  /**
   * Присоединение к классу по коду.
   *
   * Через функцию в базе, а не обычным обновлением: class_id намеренно
   * закрыт для правки пользователем, иначе класс можно было бы себе
   * назначить любой, вообще не зная кода.
   */
  async function joinClass(): Promise<boolean> {
    const code = classCode.trim();
    if (!code) return true;
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc('join_class_by_code', { p_code: code });
    if (rpcError) {
      setError(
        /class_not_found/.test(rpcError.message)
          ? 'Класс с таким кодом не найден. Проверьте код у учителя.'
          : 'Не удалось присоединиться к классу. Попробуйте ещё раз.',
      );
      return false;
    }
    await refresh();
    return true;
  }

  function toggleSubject(id: SubjectId) {
    setSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  /**
   * Сохраняем всё, что успели выбрать, — в том числе при пропуске.
   *
   * Частично заполненный профиль лучше пустого: если ученик указал класс и
   * ушёл, план хотя бы знает программу. Поля, которых нет, просто не
   * попадают в запрос, а не перетирают уже сохранённое нулями.
   */
  async function persist(): Promise<boolean> {
    const patch: Record<string, unknown> = {};
    if (grade !== null) patch.grade = grade;
    if (subjectIds.length > 0) patch.subjectIds = subjectIds;
    if (goal !== null) patch.goal = goal;

    // Локальная копия — на ней держится движок персонализации.
    updateProfile({
      ...(grade !== null ? { grade } : {}),
      ...(subjectIds.length > 0 ? { subjectIds } : {}),
      ...(goal !== null ? { goal } : {}),
    });

    if (Object.keys(patch).length === 0) return true;

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(
          data?.error === 'not_authenticated'
            ? 'Сессия истекла — войдите заново.'
            : 'Не удалось сохранить. Проверьте связь и попробуйте ещё раз.',
        );
        return false;
      }
      await refresh();
      return true;
    } catch {
      setError('Не удалось сохранить. Проверьте связь и попробуйте ещё раз.');
      return false;
    }
  }

  async function finish() {
    setError(null);
    setSaving(true);
    const ok = await persist();
    setSaving(false);
    if (!ok) return;

    // Показываем галочку и только потом уходим — переход без подтверждения
    // читается как «ничего не сохранилось».
    setDone(true);
    setTimeout(() => {
      router.replace('/dashboard');
      router.refresh();
    }, 1100);
  }

  async function next() {
    setError(null);

    // Код отправляем при уходе с шага, а не отдельной кнопкой: иначе
    // «Далее» после ввода кода молча ничего бы с ним не сделало.
    if (step === 'classcode') {
      setSaving(true);
      const joined = await joinClass();
      setSaving(false);
      if (!joined) return;
    }

    if (stepIndex < steps.length - 1) {
      setStepIndex((index) => index + 1);
      return;
    }
    await finish();
  }

  /**
   * «Позже» — пропуск текущего шага, а не всего мастера.
   *
   * На последнем шаге пропускать дальше нечего, поэтому он завершает
   * онбординг, сохранив то, что уже выбрано.
   */
  async function skip() {
    setError(null);
    if (stepIndex < steps.length - 1) {
      setStepIndex((index) => index + 1);
      return;
    }
    await finish();
  }

  if (loading || !isSignedIn || profile?.role === 'teacher' || profile?.role === 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <span className="text-success-600">
          <SuccessCheckMark size={68} />
        </span>
        <h1 className="mt-6 text-2xl font-bold text-ink-900">Профиль готов</h1>
        <p className="mt-2 text-sm text-ink-500">Собираем ваш план обучения…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-10 sm:px-6">
      {/* Прогресс: видно, сколько осталось, — три шага не пугают */}
      <div className="flex items-center gap-2">
        {steps.map((item, index) => (
          <span
            key={item}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              index <= stepIndex ? 'bg-brand-500' : 'bg-ink-200'
            }`}
          />
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-ink-400">
        Шаг {stepIndex + 1} из {steps.length}
      </p>

      <h1 className="mt-4 text-2xl font-bold text-ink-900 sm:text-3xl">
        {STEP_TITLE[step].title}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">{STEP_TITLE[step].hint}</p>

      <div className="mt-7 flex-1">
        {step === 'classcode' && (
          <div className="max-w-xs">
            <input
              value={classCode}
              onChange={(event) => setClassCode(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && canContinue && !saving) next();
              }}
              maxLength={6}
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="K7X9QF"
              aria-label="Код класса"
              className="h-14 w-full rounded-[var(--radius-control)] border-2 border-ink-200 bg-white px-4 text-center font-mono text-xl font-black tracking-[0.3em] uppercase text-ink-900 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </div>
        )}

        {step === 'grade' && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {GRADES.map((item) => {
              const active = grade === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setGrade(item)}
                  aria-pressed={active}
                  className={`flex h-20 flex-col items-center justify-center rounded-[var(--radius-control)] border-2 font-bold transition-all ${
                    active
                      ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-[var(--shadow-rest)]'
                      : 'border-ink-200 bg-white text-ink-700 hover:border-brand-300'
                  }`}
                >
                  <span className="text-2xl">{item}</span>
                  <span className="mt-0.5 text-[11px] font-semibold text-ink-400">класс</span>
                </button>
              );
            })}
          </div>
        )}

        {step === 'subjects' && (
          <div className="grid gap-3 sm:grid-cols-2">
            {SUBJECTS.map((subject) => {
              const active = subjectIds.includes(subject.id);
              return (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => toggleSubject(subject.id)}
                  aria-pressed={active}
                  className={`flex items-center gap-3 rounded-[var(--radius-control)] border-2 p-4 text-left transition-all ${
                    active
                      ? 'border-brand-500 bg-brand-50 shadow-[var(--shadow-rest)]'
                      : 'border-ink-200 bg-white hover:border-brand-300'
                  }`}
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-white"
                    style={{ backgroundColor: subject.accent }}
                  >
                    <Icon name={subject.icon} size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-ink-900">{subject.title}</span>
                    <span className="mt-0.5 block text-xs text-ink-500">
                      {subject.topics.length} тем
                    </span>
                  </span>
                  {active && (
                    <span className="text-brand-600">
                      <Icon name="check" size={18} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {step === 'goal' && (
          <div className="grid gap-3 sm:grid-cols-2">
            {LEARNING_GOALS.map((item) => {
              const active = goal === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setGoal(item.id)}
                  aria-pressed={active}
                  className={`flex items-start gap-3 rounded-[var(--radius-control)] border-2 p-4 text-left transition-all ${
                    active
                      ? 'border-brand-500 bg-brand-50 shadow-[var(--shadow-rest)]'
                      : 'border-ink-200 bg-white hover:border-brand-300'
                  }`}
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-brand-100 text-brand-700">
                    <Icon name={item.icon} size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-ink-900">{item.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                      {item.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-5 rounded-[var(--radius-control)] border border-danger-200 bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-700">
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center gap-3">
        {stepIndex > 0 && (
          <button
            type="button"
            onClick={() => setStepIndex((index) => index - 1)}
            className="rounded-[var(--radius-control)] px-4 py-3 text-sm font-semibold text-ink-500 transition-colors hover:text-ink-800"
          >
            Назад
          </button>
        )}

        <button
          type="button"
          onClick={next}
          disabled={!canContinue || saving}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius-control)] text-[15px] font-bold text-white shadow-[var(--shadow-glow)] transition-all disabled:opacity-45 disabled:shadow-none"
          style={{ background: 'var(--gradient-brand)' }}
        >
          {saving ? <Spinner /> : stepIndex === steps.length - 1 ? 'Готово' : 'Далее'}
          {!saving && <Icon name="arrowRight" size={17} />}
        </button>
      </div>

      {/* «Позже» есть только там, где ответа может не быть на руках */}
      {canSkip && (
        <button
          type="button"
          onClick={skip}
          disabled={saving}
          className="mx-auto mt-4 rounded-lg px-3 py-2 text-sm font-semibold text-ink-400 transition-colors hover:text-ink-700 disabled:opacity-50"
        >
          Позже
        </button>
      )}
    </div>
  );
}
