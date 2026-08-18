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
import type { Dict } from '@/lib/i18n';
import { SUBJECTS } from '@/data';
import { Alert, Button, Card } from '@/components/ui';

const TOTAL_STEPS = 4;

/**
 * Подписи онбординга на трёх языках. Ключи одинаковые — за этим следит TypeScript.
 *
 * Цели обучения переведены здесь по id: в LEARNING_GOALS лежат русские title и
 * description, оттуда берём только иконку.
 */
const TEXT: Dict<{
  stepOf: (step: number, total: number) => string;
  profileExists: string;
  nameTitle: string;
  nameHint: string;
  namePlaceholder: string;
  whoAreYou: string;
  roleStudent: string;
  roleStudentDesc: string;
  roleTeacher: string;
  roleTeacherDesc: string;
  gradeTitle: string;
  gradeHint: string;
  subjectsTitle: string;
  subjectsHint: string;
  goalTitle: string;
  goalHint: string;
  targetDateLabel: string;
  optional: string;
  back: string;
  next: string;
  finish: string;
  goals: Record<LearningGoal, { title: string; description: string }>;
}> = {
  ru: {
    stepOf: (step, total) => `Шаг ${step} из ${total}`,
    profileExists: 'Профиль уже создан. Если пройти мастер заново, прежние настройки заменятся.',
    nameTitle: 'Как тебя зовут?',
    nameHint: 'Имя нужно, чтобы обращаться к тебе и показать учителю.',
    namePlaceholder: 'Например, Аружан',
    whoAreYou: 'Кто ты?',
    roleStudent: 'Ученик',
    roleStudentDesc: 'Учусь и готовлюсь к экзаменам',
    roleTeacher: 'Учитель',
    roleTeacherDesc: 'Слежу за прогрессом класса',
    gradeTitle: 'В каком ты классе?',
    gradeHint: 'По классу подбираются доступные темы.',
    subjectsTitle: 'Какие предметы изучаешь?',
    subjectsHint: 'Можно выбрать несколько. Позже это меняется в профиле.',
    goalTitle: 'Зачем ты учишься?',
    goalHint: 'От цели зависит сложность подбираемых заданий.',
    targetDateLabel: 'Дата экзамена или олимпиады',
    optional: 'необязательно',
    back: 'Назад',
    next: 'Далее',
    finish: 'Начать обучение',
    goals: {
      ent: {
        title: 'Подготовка к ЕНТ',
        description: 'Системно закрыть программу и набрать максимум баллов на тестировании',
      },
      olympiad: {
        title: 'Олимпиада',
        description: 'Задачи повышенной сложности и нестандартные методы решения',
      },
      review: {
        title: 'Повторение темы',
        description: 'Освежить конкретный раздел перед контрольной или зачётом',
      },
      catchup: {
        title: 'Догнать программу',
        description: 'Закрыть пробелы по темам, которые остались непонятыми',
      },
    },
  },
  kk: {
    stepOf: (step, total) => `${step}-қадам, барлығы ${total}`,
    profileExists: 'Профиль бұрын құрылған. Шеберден қайта өтсең, алдыңғы параметрлер ауыстырылады.',
    nameTitle: 'Атың кім?',
    nameHint: 'Атың саған қарата сөйлеу және мұғалімге көрсету үшін керек.',
    namePlaceholder: 'Мысалы, Аружан',
    whoAreYou: 'Сен кімсің?',
    roleStudent: 'Оқушы',
    roleStudentDesc: 'Оқып жүрмін және емтихандарға дайындаламын',
    roleTeacher: 'Мұғалім',
    roleTeacherDesc: 'Сыныптың үлгерімін қадағалаймын',
    gradeTitle: 'Нешінші сыныпта оқисың?',
    gradeHint: 'Қолжетімді тақырыптар сынып бойынша таңдалады.',
    subjectsTitle: 'Қандай пәндерді оқисың?',
    subjectsHint: 'Бірнешеуін таңдауға болады. Кейін мұны профильде өзгертуге болады.',
    goalTitle: 'Не үшін оқисың?',
    goalHint: 'Тапсырмалардың күрделілігі мақсатқа байланысты таңдалады.',
    targetDateLabel: 'Емтихан немесе олимпиада күні',
    optional: 'міндетті емес',
    back: 'Артқа',
    next: 'Әрі қарай',
    finish: 'Оқуды бастау',
    goals: {
      ent: {
        title: 'ҰБТ-ға дайындық',
        description: 'Бағдарламаны жүйелі меңгеріп, тестілеуде барынша көп ұпай жинау',
      },
      olympiad: {
        title: 'Олимпиада',
        description: 'Күрделілігі жоғары есептер және стандартты емес шешу тәсілдері',
      },
      review: {
        title: 'Тақырыпты қайталау',
        description: 'Бақылау жұмысы немесе сынақ алдында нақты бөлімді еске түсіру',
      },
      catchup: {
        title: 'Бағдарламаны қуып жету',
        description: 'Түсініксіз қалған тақырыптардағы олқылықтардың орнын толтыру',
      },
    },
  },
  en: {
    stepOf: (step, total) => `Step ${step} of ${total}`,
    profileExists: 'A profile already exists. Going through the wizard again will replace your current settings.',
    nameTitle: 'What is your name?',
    nameHint: 'We use your name to address you and to show it to your teacher.',
    namePlaceholder: 'For example, Aruzhan',
    whoAreYou: 'Who are you?',
    roleStudent: 'Student',
    roleStudentDesc: 'I study and prepare for exams',
    roleTeacher: 'Teacher',
    roleTeacherDesc: 'I follow my class’s progress',
    gradeTitle: 'What grade are you in?',
    gradeHint: 'Available topics are matched to your grade.',
    subjectsTitle: 'Which subjects are you studying?',
    subjectsHint: 'You can pick several. You can change this later in your profile.',
    goalTitle: 'Why are you studying?',
    goalHint: 'Your goal sets how difficult the selected tasks will be.',
    targetDateLabel: 'Exam or olympiad date',
    optional: 'optional',
    back: 'Back',
    next: 'Next',
    finish: 'Start learning',
    goals: {
      ent: {
        title: 'Preparing for the ENT',
        description: 'Work through the whole syllabus and score as high as possible on the test',
      },
      olympiad: {
        title: 'Olympiad',
        description: 'Advanced problems and non-standard ways of solving them',
      },
      review: {
        title: 'Reviewing a topic',
        description: 'Refresh one particular section before a test or an assessment',
      },
      catchup: {
        title: 'Catching up',
        description: 'Close the gaps on topics that never quite made sense',
      },
    },
  },
};

export default function OnboardingPage() {
  const router = useRouter();
  const { state, setProfile } = useStore();

  const t = TEXT[state.language];

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
      <p className="text-sm font-semibold text-brand-600">{t.stepOf(step, TOTAL_STEPS)}</p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-300"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {state.profile && step === 1 && (
        <div className="mt-6">
          <Alert>{t.profileExists}</Alert>
        </div>
      )}

      <Card className="mt-6">
        {/* Шаг 1: имя и роль */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold text-ink-900">{t.nameTitle}</h1>
            <p className="mt-2 text-ink-500">{t.nameHint}</p>

            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t.namePlaceholder}
              className="mt-5 w-full rounded-xl border border-ink-200 px-4 py-3 text-ink-900 outline-none focus:border-brand-500"
            />

            <p className="mt-6 font-semibold text-ink-800">{t.whoAreYou}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <ChoiceCard
                selected={role === 'student'}
                onClick={() => setRole('student')}
                icon="🎒"
                title={t.roleStudent}
                description={t.roleStudentDesc}
              />
              <ChoiceCard
                selected={role === 'teacher'}
                onClick={() => setRole('teacher')}
                icon="👩‍🏫"
                title={t.roleTeacher}
                description={t.roleTeacherDesc}
              />
            </div>
          </div>
        )}

        {/* Шаг 2: класс */}
        {step === 2 && (
          <div>
            <h1 className="text-2xl font-bold text-ink-900">{t.gradeTitle}</h1>
            <p className="mt-2 text-ink-500">{t.gradeHint}</p>

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
            <h1 className="text-2xl font-bold text-ink-900">{t.subjectsTitle}</h1>
            <p className="mt-2 text-ink-500">{t.subjectsHint}</p>

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
            <h1 className="text-2xl font-bold text-ink-900">{t.goalTitle}</h1>
            <p className="mt-2 text-ink-500">{t.goalHint}</p>

            <div className="mt-5 grid gap-3">
              {LEARNING_GOALS.map((item) => (
                <ChoiceCard
                  key={item.id}
                  selected={goal === item.id}
                  onClick={() => setGoal(item.id)}
                  icon={item.icon}
                  title={t.goals[item.id].title}
                  description={t.goals[item.id].description}
                />
              ))}
            </div>

            <label className="mt-6 block">
              <span className="font-semibold text-ink-800">{t.targetDateLabel}</span>
              <span className="ml-2 text-sm text-ink-400">{t.optional}</span>
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
            {t.back}
          </Button>

          {step < TOTAL_STEPS ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canContinue}>
              {t.next}
            </Button>
          ) : (
            <Button onClick={finish} disabled={!canContinue}>
              {t.finish}
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
