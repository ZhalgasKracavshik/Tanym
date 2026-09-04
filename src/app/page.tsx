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
import { Icon, type IconName } from '@/components/Icon';
import { useLang, type Dict } from '@/lib/i18n';
import { LiftCard, PressLink, Reveal, StaggerGroup, StaggerItem, motion } from '@/components/motion';

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
  partnersTitle: string;
  partnersText: string;
  partners: {
    href: string;
    title: string;
    text: string;
    cta: string;
    badge: string;
    /**
     * Карточка целиком залита цветом — это подпись взятой за образец
     * системы: не белый прямоугольник с цветной иконкой, а само пятно.
     * Иконки здесь нет намеренно: скруглённый значок над заголовком —
     * самый узнаваемый признак шаблонной вёрстки, и смысла он не несёт.
     */
    bg: string;
  }[];
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
    partnersTitle: 'Школам и учебным центрам',
    partnersText:
      'Для учеников Tanym бесплатен. Платят школы и центры — за инструменты и за доступ к аудитории.',
    partners: [
      {
        href: '/for-schools',
        badge: 'Пилот на один класс',
        bg: '#c9542a',
        title: 'Для школ',
        text: 'Карта пробелов по каждому классу, свои материалы учителей и портфолио учеников в одном месте.',
        cta: 'Условия для школ',
      },
      {
        href: '/for-centers',
        badge: 'Размещение с проверкой',
        bg: '#16293a',
        title: 'Для учебных центров',
        text: 'Размещение в разделе «Возможности» с проверкой школой — ученик приходит, уже зная свой уровень.',
        cta: 'Условия размещения',
      },
    ],
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
    partnersTitle: 'Мектептер мен оқу орталықтарына',
    partnersText:
      'Оқушыларға Tanym тегін. Мектептер мен орталықтар төлейді — құралдар мен аудиторияға қолжетімділік үшін.',
    partners: [
      {
        href: '/for-schools',
        badge: 'Бір сыныпқа пилот',
        bg: '#c9542a',
        title: 'Мектептерге',
        text: 'Әр сынып бойынша олқылық картасы, мұғалімдердің өз материалдары және оқушы портфолиосы бір жерде.',
        cta: 'Мектептерге шарттар',
      },
      {
        href: '/for-centers',
        badge: 'Тексерумен орналастыру',
        bg: '#16293a',
        title: 'Оқу орталықтарына',
        text: '«Мүмкіндіктер» бөлімінде мектеп тексеруімен орналастыру — оқушы деңгейін біліп келеді.',
        cta: 'Орналастыру шарттары',
      },
    ],
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
    partnersTitle: 'For schools and learning centres',
    partnersText:
      'Tanym is free for students. Schools and centres pay — for the tools and for access to the audience.',
    partners: [
      {
        href: '/for-schools',
        badge: 'Pilot with one class',
        bg: '#c9542a',
        title: 'For schools',
        text: 'A gap map for every class, teachers’ own materials and student portfolios in one place.',
        cta: 'Terms for schools',
      },
      {
        href: '/for-centers',
        badge: 'Vetted listing',
        bg: '#16293a',
        title: 'For learning centres',
        text: 'A listing under Opportunities, vetted by the school — students arrive already knowing their level.',
        cta: 'Listing terms',
      },
    ],
    finalTitle: 'Start with the assessment, it takes just 7 minutes',
    finalText: 'Your plan appears right after it.',
  },
};

export default function HomePage() {
  const language = useLang();
  const t = TEXT[language];

  // Цифры берём из самого контента, а не пишем руками: добавится тема,
  // и строка на первом экране обновится сама.
  //


  return (
    <div className="overflow-x-hidden">
      {/* Первый экран */}
      {/*
        Первый экран — чистое белое полотно, без подсветки за заголовком.

        Раньше здесь лежало размытое радиальное пятно в терракоту. Такая
        подсветка («mesh», «aurora») — первое, что выдаёт типовой
        SaaS-шаблон: она есть у всех и не говорит ничего о продукте.
        Заголовок в тишине белого поля держит внимание сам, а фирменный
        цвет приходит ниже — целыми полосами, а не дымкой под текстом.
      */}
      <section className="border-b border-ink-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center sm:py-28">
          <Reveal immediate>
            <h1 className="mx-auto max-w-4xl text-[2.6rem] font-medium leading-[1.05] tracking-tight text-balance text-ink-900 sm:text-6xl">
              {t.heroTitle}
            </h1>
          </Reveal>

          <Reveal immediate delay={0.08}>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-500">{t.heroText}</p>
          </Reveal>

          <Reveal immediate delay={0.16}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <PressLink
                href="/register"
                /* Сплошной цвет, а не градиент со свечением: главное
                   действие должно читаться как решённое, а не как
                   украшение. Свечение под кнопкой — тот же типовой приём,
                   что и подсветка за заголовком. */
                className="inline-flex h-14 items-center gap-2 rounded-[var(--radius-pill)] bg-ink-900 px-8 text-base font-medium text-white transition-colors duration-200 hover:bg-ink-800"
              >
                {t.ctaStart}
                <Icon name="arrowRight" size={18} />
              </PressLink>

              <PressLink
                href="/register"
                className="inline-flex h-14 items-center gap-2 rounded-[var(--radius-pill)] border border-ink-300 bg-white px-8 text-base font-medium text-ink-900 transition-colors duration-200 hover:border-ink-500"
              >
                {t.ctaDiagnostics}
              </PressLink>
            </div>
          </Reveal>

          {/*
            Макет продукта под текстом: ученик и жюри видят, что внутри,
            не нажимая ни одной кнопки. Это снимает главный вопрос любого
            лендинга — что там вообще происходит.
          */}
          <Reveal delay={0.3}>
            <div className="mx-auto mt-16 max-w-3xl">
              <div className="rounded-[var(--radius-card)] border border-ink-200/80 bg-white p-2 shadow-[var(--shadow-float)]">
                <div className="rounded-[18px] bg-ink-50/70 p-6 text-left sm:p-8">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-ink-900">{t.mockPlanTitle}</p>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                      А
                    </span>
                  </div>

                  <div className="mt-6 rounded-[var(--radius-control)] border border-ink-200 bg-white p-4">
                    <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-brand-600">
                      <Icon name="columns" size={13} />
                      {t.mockMentor}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-ink-600">{t.mockMentorText}</p>
                  </div>

                  <div className="mt-4 rounded-[var(--radius-control)] border border-ink-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-ink-900">Линейные уравнения и неравенства</p>
                      <span className="rounded-[var(--radius-pill)] bg-danger-50 px-3 py-1 text-xs font-semibold text-danger-700">
                        {t.mockWeak}
                      </span>
                    </div>
                    {/* Полоса едет от нуля до реального значения при появлении:
                        статичная полоса читается как картинка, едущая — как данные */}
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-100">
                      <motion.div
                        className="h-full rounded-full bg-brand-500"
                        initial={{ width: 0 }}
                        whileInView={{ width: '34%' }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                      />
                    </div>
                    <p className="mt-2 text-xs font-semibold tabular-nums text-ink-400">34%</p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/*
        Проблемы — цветная полоса во всю ширину, а не белые карточки на сером.

        Это единственное место, где страница повышает голос, и повышает его
        цветом целой полосы, а не мелкими акцентами. Раньше фирменный цвет
        appearance-ом присутствовал только в значках и кнопках — то есть нигде:
        страница читалась как ряд одинаковых белых карточек на сером фоне.
        Карточек внутри полосы нет намеренно: карточка на цветном поле
        возвращает ту же белую сетку, от которой полоса и уходит.
      */}
      <section className="bg-brand-700">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal>
            <h2 className="max-w-2xl text-3xl font-medium leading-tight text-balance text-white sm:text-4xl">
              {t.problemsTitle}
            </h2>
          </Reveal>

          <StaggerGroup className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            {t.problems.map((problem) => (
              <StaggerItem key={problem.title}>
                <div className="border-t border-white/25 pt-6">
                  <Icon name={problem.icon} size={22} className="text-white/70" />
                  <h3 className="mt-4 text-lg font-medium text-white">{problem.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{problem.text}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* Как это работает: четыре шага */}
      <section className="border-b border-ink-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal>
            <h2 className="max-w-2xl text-3xl font-medium leading-tight text-balance text-ink-900 sm:text-4xl">
              {t.stepsTitle}
            </h2>
          </Reveal>

          <StaggerGroup className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {t.steps.map((step, index) => (
              <StaggerItem key={step.title}>
                {/*
                  Нумерация здесь не украшение: шаги идут строго по порядку,
                  и номер — единственное, что показывает этот порядок, когда
                  карточки перестраиваются в столбец на телефоне.
                */}
                <div className="h-full border-t border-ink-200 pt-5">
                  <span className="text-sm font-semibold tabular-nums text-brand-600">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-3 text-lg font-medium text-ink-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{step.text}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* Предметы */}
      {/* Кремовая полоса, а не серая: после терракотовой она держит тепло
          страницы, тогда как серый рядом с ней читается как выцветший. */}
      <section className="border-b border-brand-100 bg-brand-50">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal>
            <h2 className="max-w-2xl text-3xl font-medium leading-tight text-balance text-ink-900 sm:text-4xl">
              {t.subjectsTitle}
            </h2>
          </Reveal>

          <StaggerGroup className="mt-12 grid gap-5 md:grid-cols-3">
            {SUBJECTS.map((subject) => {
              const tasks =
                subject.diagnostic.length +
                subject.topics.reduce((count, topic) => count + topic.tasks.length, 0);

              return (
                <StaggerItem key={subject.id}>
                  <Link href="/register" className="block h-full">
                    <LiftCard className="group h-full rounded-[var(--radius-card)] border border-ink-200/80 bg-white p-7 shadow-[var(--shadow-rest)]">
                      <span
                        className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-control)] text-white"
                        style={{ backgroundColor: subject.accent }}
                      >
                        <Icon name={subject.icon} size={22} />
                      </span>
                      <h3 className="mt-5 font-medium text-ink-900">{subject.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink-500">{subject.description}</p>
                      <p className="mt-4 text-xs font-semibold tabular-nums text-ink-400">
                        {t.counts(subject.topics.length, tasks)}
                      </p>
                    </LiftCard>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerGroup>
        </div>
      </section>

      {/* Учителю */}
      <section className="border-b border-ink-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal>
            <div
              className="relative overflow-hidden rounded-[var(--radius-card)] p-10 text-white sm:p-14"
              style={{ background: 'var(--surface-ink)' }}
            >
              {/* Размытое цветное пятно в углу убрано: тёмная карточка на
                  белой странице и так самый заметный объект экрана, а пятно
                  добавляло ей только сходство с типовым шаблоном. */}
              <div className="relative max-w-2xl">
                <h2 className="text-3xl font-medium leading-tight text-balance sm:text-4xl">{t.teacherTitle}</h2>
                <p className="mt-4 text-base leading-relaxed text-white/70">{t.teacherText}</p>
                <div className="mt-8">
                  <PressLink
                    href="/teacher"
                    className="inline-flex h-13 items-center gap-2 rounded-[var(--radius-pill)] bg-white px-7 py-3.5 text-sm font-medium text-ink-900 shadow-[var(--shadow-rest)]"
                  >
                    {t.teacherCta}
                    <Icon name="arrowRight" size={17} />
                  </PressLink>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/*
        Партнёрам: школам и учебным центрам.

        Отдельный блок, а не строчка в подвале: на этих двух аудиториях
        держится вся модель — школа платит за класс, центр за размещение,
        а ученик пользуется бесплатно. Карточки ведут на полноценные
        страницы, открытые без регистрации: директор не станет заводить
        аккаунт, чтобы прочитать предложение.
      */}
      {/* Серая полоса, а не белая: предыдущая секция тоже белая, и две
          белые подряд склеиваются в одну — ритм страницы теряется. */}
      <section className="border-b border-ink-200/70 bg-ink-50">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal>
            <h2 className="max-w-2xl text-3xl font-medium leading-tight text-balance text-ink-900 sm:text-4xl">
              {t.partnersTitle}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-500">{t.partnersText}</p>
          </Reveal>

          <StaggerGroup className="mt-12 grid gap-5 md:grid-cols-2">
            {t.partners.map((partner) => (
              <StaggerItem key={partner.href}>
                <Link href={partner.href} className="block h-full">
                  {/*
                    Карточка залита цветом целиком — единственный такой
                    блок на странице, и это её работа: раздел обращён не к
                    ученику, и пролистывающий мимо школьник должен увидеть
                    смену адресата раньше, чем прочтёт заголовок.

                    Что убрано и почему. Скруглённый значок над заголовком,
                    плашка с цветной точкой и стрелка — набор, который
                    встречается в любой типовой вёрстке и не сообщает
                    ничего: иконка «школа» рядом со словом «Для школ»
                    повторяет заголовок картинкой. Работу делает
                    типографика на плотном цвете.
                  */}
                  <LiftCard
                    className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] p-8 sm:p-10"
                    style={{ background: partner.bg }}
                  >
                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/55">
                      {partner.badge}
                    </span>

                    <h3 className="mt-6 text-2xl font-medium leading-tight text-white sm:text-3xl">
                      {partner.title}
                    </h3>
                    <p className="mt-3 max-w-[42ch] text-[15px] leading-relaxed text-white/75">
                      {partner.text}
                    </p>

                    {/*
                      Подпись прижата книзу: у карточек разной длины текста
                      она иначе встаёт на разной высоте, и пара читается
                      как две несвязанные плашки.
                    */}
                    <span className="mt-auto pt-8 text-sm font-medium text-white underline decoration-white/40 underline-offset-[6px] transition-colors group-hover:decoration-white">
                      {partner.cta}
                    </span>
                  </LiftCard>
                </Link>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* Финальный призыв */}
      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center sm:py-28">
          <Reveal>
            <h2 className="text-3xl font-medium leading-tight text-balance text-ink-900 sm:text-5xl">
              {t.finalTitle}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-500">{t.finalText}</p>
            <div className="mt-9 flex justify-center">
              <PressLink
                href="/register"
                className="inline-flex h-14 items-center gap-2 rounded-[var(--radius-pill)] bg-ink-900 px-9 text-base font-medium text-white transition-colors duration-200 hover:bg-ink-800"
              >
                {t.ctaStart}
                <Icon name="arrowRight" size={18} />
              </PressLink>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
