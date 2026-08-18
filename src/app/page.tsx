'use client';

/**
 * Главная страница (лендинг).
 *
 * Клиентский компонент: разметка статическая, но подписи берутся по текущему
 * языку интерфейса, а хук языка работает только на клиенте. Данные предметов
 * по-прежнему приходят из реестра контента и остаются на русском.
 */

import Link from 'next/link';
import { SUBJECTS } from '@/data';
import { ButtonLink, Card } from '@/components/ui';
import { useLang, type Dict } from '@/lib/i18n';

/** Подписи лендинга на трёх языках. Ключи одинаковые — за этим следит TypeScript. */
const TEXT: Dict<{
  kicker: string;
  heroTitle: string;
  heroText: string;
  ctaStart: string;
  ctaDiagnostics: string;
  problemsTitle: string;
  /** Проблемы из кейса хакатона — то, ради чего продукт существует. */
  problems: { icon: string; title: string; text: string }[];
  stepsTitle: string;
  steps: { title: string; text: string }[];
  subjectsTitle: string;
  counts: (topics: number, tasks: number) => string;
  teacherTitle: string;
  teacherText: string;
  teacherCta: string;
  finalTitle: string;
  finalText: string;
}> = {
  ru: {
    kicker: 'AI-наставник для школьников Казахстана',
    heroTitle: 'Качественное образование не должно зависеть от того, где ты живёшь',
    heroText:
      'Tanym измеряет твой уровень по каждой теме, строит персональный план и разбирает каждую ошибку. Как репетитор, только бесплатно и в любое время.',
    ctaStart: 'Начать обучение',
    ctaDiagnostics: 'Пройти диагностику',
    problemsTitle: 'Почему это важно',
    problems: [
      {
        icon: '📍',
        title: 'Место решает больше, чем способности',
        text: 'В областном центре можно нанять репетитора. В ауле — не у кого и не за что.',
      },
      {
        icon: '👩‍🏫',
        title: 'У учителя 30 учеников и один урок',
        text: 'Найти пробел у каждого физически невозможно — не хватает часов в сутках.',
      },
      {
        icon: '🧩',
        title: 'Материалы есть, системы нет',
        text: 'Сборники и видео разбросаны по источникам и не подстроены под твой уровень.',
      },
    ],
    stepsTitle: 'Как это работает',
    steps: [
      { title: 'Профиль и цель', text: 'Класс, предметы и зачем ты учишься: ЕНТ, олимпиада или закрыть пробелы.' },
      { title: 'Диагностика', text: '8 заданий, которые показывают твой уровень по каждому навыку отдельно.' },
      { title: 'Персональный план', text: 'Система отбирает темы и объясняет, почему именно они и в таком порядке.' },
      { title: 'Задания и разбор', text: 'Решаешь — получаешь объяснение своей ошибки, а не просто «неверно».' },
    ],
    subjectsTitle: 'Что можно изучать',
    counts: (topics, tasks) => `${topics} тем · ${tasks} заданий`,
    teacherTitle: 'Учителю — карта пробелов всего класса',
    teacherText:
      'Видно, кто отстал и по какой теме, без проверки тридцати тетрадей. Свои темы и задания добавляются прямо в панели.',
    teacherCta: 'Открыть панель учителя',
    finalTitle: 'Начни с диагностики — это 7 минут',
    finalText: 'План появится сразу после неё.',
  },
  kk: {
    kicker: 'Қазақстан оқушыларына арналған AI-тәлімгер',
    heroTitle: 'Сапалы білім қай жерде тұратыныңа байланысты болмауға тиіс',
    heroText:
      'Tanym әр тақырып бойынша деңгейіңді өлшейді, жеке жоспар құрады және әр қатеңді талдап береді. Репетитор сияқты, тек тегін әрі кез келген уақытта.',
    ctaStart: 'Оқуды бастау',
    ctaDiagnostics: 'Диагностикадан өту',
    problemsTitle: 'Бұл неге маңызды',
    problems: [
      {
        icon: '📍',
        title: 'Тұрған жерің қабілеттен де көп нәрсені шешеді',
        text: 'Облыс орталығында репетитор жалдауға болады. Ауылда — жалдайтын адам да, қаражат та жоқ.',
      },
      {
        icon: '👩‍🏫',
        title: 'Мұғалімде 30 оқушы және бір ғана сабақ',
        text: 'Әрқайсысының олқылығын табу мүмкін емес — тәулікте сағат жетпейді.',
      },
      {
        icon: '🧩',
        title: 'Материал бар, жүйе жоқ',
        text: 'Жинақтар мен бейнесабақтар әртүрлі дереккөзде шашырап жатыр әрі сенің деңгейіңе бейімделмеген.',
      },
    ],
    stepsTitle: 'Бұл қалай жұмыс істейді',
    steps: [
      {
        title: 'Профиль және мақсат',
        text: 'Сыныбың, пәндерің және не үшін оқитының: ҰБТ, олимпиада немесе олқылықтарды жабу.',
      },
      { title: 'Диагностика', text: 'Әр дағды бойынша деңгейіңді бөлек көрсететін 8 тапсырма.' },
      {
        title: 'Жеке жоспар',
        text: 'Жүйе тақырыптарды таңдап, неліктен дәл соларды және осы ретпен ұсынғанын түсіндіреді.',
      },
      { title: 'Тапсырмалар мен талдау', text: 'Шығарасың — жай ғана «қате» емес, қатеңнің түсіндірмесін аласың.' },
    ],
    subjectsTitle: 'Нені оқуға болады',
    counts: (topics, tasks) => `${topics} тақырып · ${tasks} тапсырма`,
    teacherTitle: 'Мұғалімге — бүкіл сыныптың олқылық картасы',
    teacherText:
      'Отыз дәптерді тексермей-ақ кімнің қай тақырыптан қалып қойғаны көрініп тұрады. Өз тақырыптарың мен тапсырмаларыңды панельдің өзінде қосасың.',
    teacherCta: 'Мұғалім панелін ашу',
    finalTitle: 'Диагностикадан баста — бар болғаны 7 минут',
    finalText: 'Жоспар одан кейін бірден пайда болады.',
  },
  en: {
    kicker: 'An AI mentor for students in Kazakhstan',
    heroTitle: 'A good education should not depend on where you live',
    heroText:
      'Tanym measures your level topic by topic, builds a personal study plan and explains every mistake. Like a tutor, only free and available any time.',
    ctaStart: 'Start learning',
    ctaDiagnostics: 'Take the assessment',
    problemsTitle: 'Why this matters',
    problems: [
      {
        icon: '📍',
        title: 'Where you live matters more than how able you are',
        text: 'In a regional centre you can hire a tutor. In a village there is no one to hire and no money for it.',
      },
      {
        icon: '👩‍🏫',
        title: 'One teacher, 30 students, one lesson',
        text: 'Spotting every gap in every student is physically impossible — there simply are not enough hours.',
      },
      {
        icon: '🧩',
        title: 'Plenty of material, no system',
        text: 'Workbooks and videos are scattered across sources and none of them match your level.',
      },
    ],
    stepsTitle: 'How it works',
    steps: [
      {
        title: 'Profile and goal',
        text: 'Your grade, subjects and why you study: the UNT exam, an olympiad or closing gaps.',
      },
      { title: 'Assessment', text: '8 tasks that show your level for each skill separately.' },
      { title: 'Personal plan', text: 'The system picks the topics and explains why these ones and in this order.' },
      { title: 'Practice and feedback', text: 'You solve a task and get your mistake explained, not just a "wrong".' },
    ],
    subjectsTitle: 'What you can study',
    counts: (topics, tasks) => `${topics} topics · ${tasks} tasks`,
    teacherTitle: 'For teachers — a gap map for the whole class',
    teacherText:
      'See who fell behind and on which topic without grading thirty notebooks. Your own topics and tasks are added right in the dashboard.',
    teacherCta: 'Open the teacher dashboard',
    finalTitle: 'Start with the assessment — it takes 7 minutes',
    finalText: 'Your plan appears right after it.',
  },
};

export default function HomePage() {
  const t = TEXT[useLang()];

  return (
    <div>
      {/* Первый экран: за 15 секунд должно стать понятно, что это и кому */}
      <section className="bg-gradient-to-b from-brand-50 to-ink-50">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <p className="mb-4 text-sm font-bold uppercase tracking-widest text-brand-600">{t.kicker}</p>
          <h1 className="text-3xl font-black leading-tight text-ink-900 sm:text-5xl">{t.heroTitle}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-ink-500 sm:text-lg">{t.heroText}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/onboarding" size="lg">
              {t.ctaStart}
            </ButtonLink>
            <ButtonLink href="/onboarding" size="lg" variant="secondary">
              {t.ctaDiagnostics}
            </ButtonLink>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-16 sm:px-6">
        {/* Проблема */}
        <section>
          <h2 className="text-center text-2xl font-bold text-ink-900">{t.problemsTitle}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {/* map превращает массив данных в массив карточек.
                key нужен React, чтобы отличать элементы списка друг от друга. */}
            {t.problems.map((problem) => (
              <Card key={problem.title}>
                <span className="text-3xl" aria-hidden>
                  {problem.icon}
                </span>
                <h3 className="mt-3 font-bold text-ink-900">{problem.title}</h3>
                <p className="mt-2 text-sm text-ink-500">{problem.text}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Как работает */}
        <section>
          <h2 className="text-center text-2xl font-bold text-ink-900">{t.stepsTitle}</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.steps.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-ink-200 bg-white p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-3 font-bold text-ink-900">{step.title}</h3>
                <p className="mt-1.5 text-sm text-ink-500">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Предметы: берём из реестра контента, а не пишем руками —
            добавится предмет, страница обновится сама */}
        <section>
          <h2 className="text-center text-2xl font-bold text-ink-900">{t.subjectsTitle}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {SUBJECTS.map((subject) => (
              <Card key={subject.id}>
                <span className="text-3xl" aria-hidden>
                  {subject.icon}
                </span>
                <h3 className="mt-3 font-bold text-ink-900">{subject.title}</h3>
                <p className="mt-2 text-sm text-ink-500">{subject.description}</p>
                <p className="mt-3 text-xs font-semibold text-brand-600">
                  {t.counts(
                    subject.topics.length,
                    subject.topics.reduce((sum, topic) => sum + topic.tasks.length, 0),
                  )}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* Блок для учителя */}
        <section className="rounded-2xl bg-ink-900 px-6 py-10 text-center sm:px-12">
          <h2 className="text-2xl font-bold text-white">{t.teacherTitle}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-ink-300">{t.teacherText}</p>
          <Link
            href="/teacher"
            className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-ink-900 transition-colors hover:bg-ink-100"
          >
            {t.teacherCta}
          </Link>
        </section>

        {/* Финальный призыв */}
        <section className="text-center">
          <h2 className="text-2xl font-bold text-ink-900">{t.finalTitle}</h2>
          <p className="mt-3 text-ink-500">{t.finalText}</p>
          <ButtonLink href="/onboarding" size="lg" className="mt-6">
            {t.ctaStart}
          </ButtonLink>
        </section>
      </div>
    </div>
  );
}
