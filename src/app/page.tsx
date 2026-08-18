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
import { Icon, type IconName } from '@/components/Icon';
import { useLang, type Dict } from '@/lib/i18n';

/** Подписи лендинга на трёх языках. Ключи одинаковые — за этим следит TypeScript. */
const TEXT: Dict<{
  kicker: string;
  heroTitle: string;
  heroText: string;
  ctaStart: string;
  ctaDiagnostics: string;
  proofLabel: string;
  mockPlanTitle: string;
  mockMentor: string;
  mockWeak: string;
  mockMastered: string;
  mockMentorText: string;
  problemsTitle: string;
  /** Проблемы из кейса хакатона — то, ради чего продукт существует. */
  problems: { icon: IconName; title: string; text: string }[];
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
    proofLabel: 'Уже готово к работе',
    mockPlanTitle: 'Мой план',
    mockMentor: 'Что говорит наставник',
    mockWeak: 'Слабое место',
    mockMastered: 'Освоено',
    mockMentorText:
      'Диагностика показала 34% по линейным уравнениям. Начни с них: на них опираются квадратные, и без этой базы дальше будет тяжело.',
    problemsTitle: 'Почему это важно',
    problems: [
      {
        icon: 'pin',
        title: 'Место решает больше, чем способности',
        text: 'В областном центре можно нанять репетитора. В ауле нанимать некого и не за что.',
      },
      {
        icon: 'presentation',
        title: 'У учителя 30 учеников и один урок',
        text: 'Найти пробел у каждого физически невозможно: не хватает часов в сутках.',
      },
      {
        icon: 'folder',
        title: 'Материалы есть, системы нет',
        text: 'Сборники и видео разбросаны по источникам и не подстроены под твой уровень.',
      },
    ],
    stepsTitle: 'Как это работает',
    steps: [
      { title: 'Профиль и цель', text: 'Класс, предметы и зачем ты учишься: ЕНТ, олимпиада или закрыть пробелы.' },
      { title: 'Диагностика', text: '8 заданий, которые показывают твой уровень по каждому навыку отдельно.' },
      { title: 'Персональный план', text: 'Система отбирает темы и объясняет, почему именно они и в таком порядке.' },
      { title: 'Задания и разбор', text: 'Решаешь и получаешь объяснение своей ошибки, а не просто «неверно».' },
    ],
    subjectsTitle: 'Что можно изучать',
    counts: (topics, tasks) => `${topics} тем · ${tasks} заданий`,
    teacherTitle: 'Учителю: карта пробелов всего класса',
    teacherText:
      'Видно, кто отстал и по какой теме, без проверки тридцати тетрадей. Свои темы и задания добавляются прямо в панели.',
    teacherCta: 'Открыть панель учителя',
    finalTitle: 'Начни с диагностики, это всего 7 минут',
    finalText: 'План появится сразу после неё.',
  },
  kk: {
    kicker: 'Қазақстан оқушыларына арналған AI-тәлімгер',
    heroTitle: 'Сапалы білім қай жерде тұратыныңа байланысты болмауға тиіс',
    heroText:
      'Tanym әр тақырып бойынша деңгейіңді өлшейді, жеке жоспар құрады және әр қатеңді талдап береді. Репетитор сияқты, тек тегін әрі кез келген уақытта.',
    ctaStart: 'Оқуды бастау',
    ctaDiagnostics: 'Диагностикадан өту',
    proofLabel: 'Жұмысқа дайын',
    mockPlanTitle: 'Жоспарым',
    mockMentor: 'Тәлімгер не дейді',
    mockWeak: 'Әлсіз тұс',
    mockMastered: 'Меңгерілді',
    mockMentorText:
      'Диагностика сызықтық теңдеулер бойынша 34% көрсетті. Соларды бастап шеш: квадрат теңдеулер соған сүйенеді, бұл негізсіз әрі қарай қиын болады.',
    problemsTitle: 'Бұл неге маңызды',
    problems: [
      {
        icon: 'pin',
        title: 'Тұрған жерің қабілеттен де көп нәрсені шешеді',
        text: 'Облыс орталығында репетитор жалдауға болады. Ауылда жалдайтын адам да, қаражат та жоқ.',
      },
      {
        icon: 'presentation',
        title: 'Мұғалімде 30 оқушы және бір ғана сабақ',
        text: 'Әрқайсысының олқылығын табу мүмкін емес: тәулікте сағат жетпейді.',
      },
      {
        icon: 'folder',
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
      { title: 'Тапсырмалар мен талдау', text: 'Шығарасың, жай ғана «қате» емес, қатеңнің түсіндірмесін аласың.' },
    ],
    subjectsTitle: 'Нені оқуға болады',
    counts: (topics, tasks) => `${topics} тақырып · ${tasks} тапсырма`,
    teacherTitle: 'Мұғалімге: бүкіл сыныптың олқылық картасы',
    teacherText:
      'Отыз дәптерді тексермей-ақ кімнің қай тақырыптан қалып қойғаны көрініп тұрады. Өз тақырыптарың мен тапсырмаларыңды панельдің өзінде қосасың.',
    teacherCta: 'Мұғалім панелін ашу',
    finalTitle: 'Диагностикадан баста, бар болғаны 7 минут',
    finalText: 'Жоспар одан кейін бірден пайда болады.',
  },
  en: {
    kicker: 'An AI mentor for students in Kazakhstan',
    heroTitle: 'A good education should not depend on where you live',
    heroText:
      'Tanym measures your level topic by topic, builds a personal study plan and explains every mistake. Like a tutor, only free and available any time.',
    ctaStart: 'Start learning',
    ctaDiagnostics: 'Take the assessment',
    proofLabel: 'Ready to use',
    mockPlanTitle: 'My plan',
    mockMentor: 'What your mentor says',
    mockWeak: 'Weak spot',
    mockMastered: 'Mastered',
    mockMentorText:
      'The assessment put you at 34% on linear equations. Start there: quadratics build on them, and without that base the rest gets hard.',
    problemsTitle: 'Why this matters',
    problems: [
      {
        icon: 'pin',
        title: 'Where you live matters more than how able you are',
        text: 'In a regional centre you can hire a tutor. In a village there is no one to hire and no money for it.',
      },
      {
        icon: 'presentation',
        title: 'One teacher, 30 students, one lesson',
        text: 'Spotting every gap in every student is physically impossible: there simply are not enough hours.',
      },
      {
        icon: 'folder',
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
    teacherTitle: 'For teachers: a gap map for the whole class',
    teacherText:
      'See who fell behind and on which topic without grading thirty notebooks. Your own topics and tasks are added right in the dashboard.',
    teacherCta: 'Open the teacher dashboard',
    finalTitle: 'Start with the assessment, it takes just 7 minutes',
    finalText: 'Your plan appears right after it.',
  },
};

export default function HomePage() {
  const t = TEXT[useLang()];

  // Цифры берём из самого контента, а не пишем руками: добавится тема,
  // и строка на первом экране обновится сама.
  //
  // В счёт заданий входят и диагностические: ученик решает их наравне
  // с остальными, и не показать их значило бы занизить объём продукта.
  const totalTopics = SUBJECTS.reduce((sum, subject) => sum + subject.topics.length, 0);
  const totalTasks = SUBJECTS.reduce(
    (sum, subject) =>
      sum +
      subject.diagnostic.length +
      subject.topics.reduce((count, topic) => count + topic.tasks.length, 0),
    0,
  );

  return (
    <div>
      {/*
        Первый экран.

        Композиция построена на вертикальных линиях, которые продолжают поля
        контейнера сверху донизу. Приём из редакционной вёрстки: линии задают
        колонку и удерживают взгляд по центру, поэтому крупный заголовок
        не расползается по ширине экрана.

        Под текстом стоит макет самого продукта. Ученик и жюри видят, что внутри,
        не нажимая ни одной кнопки, и это снимает главный вопрос любого лендинга:
        что там вообще происходит.
      */}
      <section className="border-b border-ink-200 bg-white">
        <div className="mx-auto max-w-6xl border-x border-ink-200 px-6 py-14 text-center sm:py-20">
          <p className="animate-fade-up text-xs font-bold uppercase tracking-[0.2em] text-brand-600">
            {t.kicker}
          </p>

          <h1
            className="animate-fade-up mx-auto mt-6 max-w-4xl text-4xl font-semibold leading-[1.08] text-ink-900 sm:text-6xl"
            style={{ animationDelay: '60ms' }}
          >
            {t.heroTitle}
          </h1>

          <p
            className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-400"
            style={{ animationDelay: '120ms' }}
          >
            {t.heroText}
          </p>

          <div
            className="animate-fade-up mt-9 flex flex-wrap justify-center gap-3"
            style={{ animationDelay: '180ms' }}
          >
            {/* Скруглённая до предела кнопка: форма отличает главное действие
                от прямоугольных кнопок внутри продукта */}
            <ButtonLink href="/onboarding" size="lg" className="rounded-full px-9">
              {t.ctaStart}
            </ButtonLink>
            <ButtonLink href="/onboarding" size="lg" variant="secondary" className="rounded-full px-9">
              {t.ctaDiagnostics}
            </ButtonLink>
          </div>

          {/*
            В исходном образце здесь стояло «нас уже 80 000» с чужими аватарками.
            Выдуманное число пользователей на публичной странице было бы обманом,
            поэтому вместо него настоящий состав продукта: он проверяется за две
            секунды переходом в каталог.
          */}
          <div className="animate-fade-up mt-9" style={{ animationDelay: '240ms' }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-300">{t.proofLabel}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {SUBJECTS.map((subject) => (
                <span
                  key={subject.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-600"
                >
                  <Icon name={subject.icon} size={14} className="text-brand-500" />
                  {subject.title}
                </span>
              ))}
              <span className="rounded-full bg-ink-900 px-3 py-1.5 text-xs font-semibold tabular-nums text-white">
                {t.counts(totalTopics, totalTasks)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Макет продукта: показываем экран плана так, как его увидит ученик */}
      <section className="border-b border-ink-200 bg-white pb-16">
        <div className="mx-auto max-w-6xl border-x border-ink-200 px-6">
          <div
            className="animate-fade-up rounded-3xl border border-ink-200 bg-white p-2 shadow-[0_40px_100px_-30px_rgb(13_27_38_/_0.25)]"
            style={{ animationDelay: '300ms' }}
          >
            <div className="rounded-[1.25rem] bg-gradient-to-b from-ink-100 to-brand-200 px-4 pt-14 sm:px-10 sm:pt-20">
              {/* Две подложки создают ощущение стопки экранов позади основного */}
              <div className="relative mx-auto max-w-3xl">
                <div className="absolute -top-7 left-[7%] h-full w-[86%] rounded-t-2xl border border-ink-200 bg-ink-50" />
                <div className="absolute -top-3.5 left-[3%] h-full w-[94%] rounded-t-2xl border border-ink-200 bg-white/70" />

                <div className="relative rounded-t-2xl border border-ink-200 bg-white p-5 text-left sm:p-7">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-ink-900">{t.mockPlanTitle}</span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-100 text-xs font-bold text-accent-700">
                      А
                    </span>
                  </div>

                  <div className="mt-5 rounded-xl border border-ink-200 p-4">
                    <div className="flex items-center gap-2">
                      <Icon name="sparkles" size={14} className="text-brand-500" />
                      <span className="text-xs font-bold uppercase tracking-wide text-ink-400">
                        {t.mockMentor}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-ink-700">{t.mockMentorText}</p>
                  </div>

                  <div className="mt-3 rounded-xl border border-ink-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-bold text-ink-900">Линейные уравнения и неравенства</span>
                      <span className="rounded-full bg-danger-50 px-2.5 py-1 text-xs font-semibold text-danger-700">
                        {t.mockWeak}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs font-semibold text-ink-500">
                      <span>{t.mockMastered}</span>
                      <span className="tabular-nums">34%</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100">
                      <div className="h-full w-[34%] rounded-full bg-brand-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-16 sm:px-6">
        {/* Проблема */}
        <section>
          <h2 className="text-center text-2xl font-bold text-ink-900 sm:text-3xl">{t.problemsTitle}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {/* map превращает массив данных в массив карточек.
                key нужен React, чтобы отличать элементы списка друг от друга. */}
            {t.problems.map((problem) => (
              <Card
                key={problem.title}
                className="transition-all duration-150 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon name={problem.icon} size={22} />
                </span>
                <h3 className="mt-3 font-bold text-ink-900">{problem.title}</h3>
                <p className="mt-2 text-sm text-ink-500">{problem.text}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Как работает */}
        <section>
          <h2 className="text-center text-2xl font-bold text-ink-900 sm:text-3xl">{t.stepsTitle}</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.steps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-2xl border border-ink-200 bg-white p-5 transition-all duration-150 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 font-bold tabular-nums text-white">
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
          <h2 className="text-center text-2xl font-bold text-ink-900 sm:text-3xl">{t.subjectsTitle}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {SUBJECTS.map((subject) => (
              <Card
                key={subject.id}
                className="transition-all duration-150 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon name={subject.icon} size={22} />
                </span>
                <h3 className="mt-3 font-bold text-ink-900">{subject.title}</h3>
                <p className="mt-2 text-sm text-ink-500">{subject.description}</p>
                <p className="mt-3 text-xs font-semibold tabular-nums text-brand-600">
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
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{t.teacherTitle}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-ink-300">{t.teacherText}</p>
          <Link
            href="/teacher"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-ink-900 transition-all duration-150 hover:bg-ink-100 hover:shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900"
          >
            <Icon name="chart" size={18} />
            {t.teacherCta}
          </Link>
        </section>

        {/* Финальный призыв */}
        <section className="text-center">
          <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">{t.finalTitle}</h2>
          <p className="mt-3 text-ink-500">{t.finalText}</p>
          <ButtonLink href="/onboarding" size="lg" className="mt-6">
            {t.ctaStart}
          </ButtonLink>
        </section>
      </div>
    </div>
  );
}
