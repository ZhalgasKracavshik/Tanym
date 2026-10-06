'use client';

/**
 * Лендинг пилота.
 *
 * Пилот собран вокруг одной проблемы: ученик из области узнаёт об
 * олимпиаде после того, как регистрация закрылась. Поэтому первый экран
 * обещает ровно это — не пропустить срок — и сразу показывает живые
 * события из афиши, а не макет продукта. Афиша открыта без входа:
 * регистрация нужна, только чтобы сохранить событие.
 *
 * Прежний лендинг про AI-диагностику и персональный план остался в
 * истории git — учебный модуль на пилоте выключен (lib/pilot.ts).
 */

import Link from 'next/link';
import { Icon, type IconName } from '@/components/Icon';
import { useLang, type Dict } from '@/lib/i18n';
import { Reveal, StaggerGroup, StaggerItem, PressLink } from '@/components/motion';
import { usePublishedEvents } from '@/lib/supabase/events';
import { EVENT_TYPES, daysLeftUntil, eventStatus, formatEventDate } from '@/lib/events';

const TEXT: Dict<{
  kicker: string;
  heroTitle: string;
  heroText: string;
  ctaEvents: string;
  ctaSignup: string;
  liveTitle: string;
  liveEmpty: string;
  registerBy: (date: string) => string;
  daysLeft: (n: number) => string;
  lastDay: string;
  allEvents: string;
  stepsTitle: string;
  steps: { icon: IconName; title: string; text: string }[];
  archiveTitle: string;
  archiveText: string;
  archiveCta: string;
  suggestTitle: string;
  suggestText: string;
  suggestCta: string;
  schoolsTitle: string;
  schoolsText: string;
  schoolsCta: string;
  finalTitle: string;
  finalText: string;
  finalCta: string;
}> = {
  ru: {
    kicker: 'Олимпиады · конкурсы · курсы',
    heroTitle: 'Не пропусти олимпиаду, на которую мог пройти',
    heroText:
      'Все олимпиады, конкурсы и курсы для школьников Казахстана в одной афише — с датой, до которой нужно успеть подать заявку.',
    ctaEvents: 'Смотреть афишу',
    ctaSignup: 'Создать аккаунт',
    liveTitle: 'Скоро закрывается регистрация',
    liveEmpty: 'Афиша обновляется — загляните чуть позже.',
    registerBy: (date) => `регистрация до ${date}`,
    daysLeft: (n) => `${n} дн.`,
    lastDay: 'сегодня',
    allEvents: 'Вся афиша',
    stepsTitle: 'Как это работает',
    steps: [
      { icon: 'calendar', title: 'Найди', text: 'Олимпиады и конкурсы по классу и интересам, с понятным сроком регистрации.' },
      { icon: 'star', title: 'Сохрани', text: 'Одно нажатие — и событие в «Моих событиях», с отсчётом дней до дедлайна.' },
      { icon: 'check', title: 'Успей', text: 'Ближайший срок всегда наверху: видно, куда подать заявку первым.' },
    ],
    archiveTitle: 'Готовься на заданиях прошлых лет',
    archiveText: 'ЕНТ, олимпиады, SAT, IELTS и СОР/СОЧ — с проверкой ответа и разбором.',
    archiveCta: 'Открыть архив',
    suggestTitle: 'Знаешь олимпиаду, которой нет в афише?',
    suggestText: 'Расскажи — после проверки её увидят все, кто иначе узнал бы слишком поздно.',
    suggestCta: 'Предложить событие',
    schoolsTitle: 'Учителям и школам',
    schoolsText: 'Предлагайте события и материалы — после проверки их увидят ученики по всей стране.',
    schoolsCta: 'Подробнее для школ',
    finalTitle: 'Следующая олимпиада уже открыла регистрацию',
    finalText: 'Аккаунт бесплатный и нужен только для того, чтобы сохранять события.',
    finalCta: 'Начать',
  },
  kk: {
    kicker: 'Олимпиадалар · байқаулар · курстар',
    heroTitle: 'Өтуге болатын олимпиаданы жіберіп алма',
    heroText:
      'Қазақстан оқушыларына арналған олимпиадалар, байқаулар мен курстар бір афишада — өтінім беру мерзімімен.',
    ctaEvents: 'Афишаны қарау',
    ctaSignup: 'Аккаунт ашу',
    liveTitle: 'Тіркеу жақында жабылады',
    liveEmpty: 'Афиша жаңартылуда — сәлден соң кіріңіз.',
    registerBy: (date) => `тіркелу ${date} дейін`,
    daysLeft: (n) => `${n} күн`,
    lastDay: 'бүгін',
    allEvents: 'Бүкіл афиша',
    stepsTitle: 'Қалай жұмыс істейді',
    steps: [
      { icon: 'calendar', title: 'Тап', text: 'Сыныбың мен қызығушылығыңа сай олимпиадалар мен байқаулар, тіркелу мерзімімен.' },
      { icon: 'star', title: 'Сақта', text: 'Бір басу — іс-шара «Менің іс-шараларымда», мерзімге дейінгі күндер санағымен.' },
      { icon: 'check', title: 'Үлгер', text: 'Ең жақын мерзім әрдайым жоғарыда: алдымен қайда өтінім беру керегі көрінеді.' },
    ],
    archiveTitle: 'Өткен жылдардың тапсырмаларымен дайындал',
    archiveText: 'ҰБТ, олимпиадалар, SAT, IELTS және БЖБ/ТЖБ — жауапты тексерумен және талдаумен.',
    archiveCta: 'Мұрағатты ашу',
    suggestTitle: 'Афишада жоқ олимпиаданы білесің бе?',
    suggestText: 'Айт — тексерілген соң оны кеш білетін еді деген бәрі көреді.',
    suggestCta: 'Іс-шара ұсыну',
    schoolsTitle: 'Мұғалімдер мен мектептерге',
    schoolsText: 'Іс-шаралар мен материалдарды ұсыныңыз — тексерілген соң оларды бүкіл елдегі оқушылар көреді.',
    schoolsCta: 'Мектептерге толығырақ',
    finalTitle: 'Келесі олимпиаданың тіркеуі ашылды',
    finalText: 'Аккаунт тегін және тек іс-шараларды сақтау үшін керек.',
    finalCta: 'Бастау',
  },
  en: {
    kicker: 'Olympiads · contests · courses',
    heroTitle: "Don't miss an olympiad you could have made it to",
    heroText:
      'Olympiads, contests and courses for school students in Kazakhstan, in one place — with the date you need to apply by.',
    ctaEvents: 'Browse events',
    ctaSignup: 'Create an account',
    liveTitle: 'Registration closing soon',
    liveEmpty: 'The events list is being updated — check back soon.',
    registerBy: (date) => `register by ${date}`,
    daysLeft: (n) => `${n} d`,
    lastDay: 'today',
    allEvents: 'All events',
    stepsTitle: 'How it works',
    steps: [
      { icon: 'calendar', title: 'Find', text: 'Olympiads and contests for your grade and interests, with a clear registration deadline.' },
      { icon: 'star', title: 'Save', text: 'One tap and it is in “My events”, counting down the days to the deadline.' },
      { icon: 'check', title: 'Make it', text: 'The nearest deadline is always on top, so you know where to apply first.' },
    ],
    archiveTitle: 'Practise on past tasks',
    archiveText: 'UNT, olympiads, SAT, IELTS and term assessments — with answer checks and solutions.',
    archiveCta: 'Open the archive',
    suggestTitle: 'Know an olympiad that is not listed?',
    suggestText: 'Tell us — once checked, everyone who would have found out too late will see it.',
    suggestCta: 'Suggest an event',
    schoolsTitle: 'For teachers and schools',
    schoolsText: 'Suggest events and materials — once checked, students across the country will see them.',
    schoolsCta: 'More for schools',
    finalTitle: 'The next olympiad has already opened registration',
    finalText: 'The account is free and only needed to save events.',
    finalCta: 'Get started',
  },
};

export default function HomePage() {
  const language = useLang();
  const t = TEXT[language];
  const events = usePublishedEvents();

  // Только то, куда ещё можно успеть, — ближайшие сроки первыми.
  const upcoming = (events ?? [])
    .filter((event) => ['open', 'closing-soon'].includes(eventStatus(event)))
    .sort((a, b) => a.registrationDeadline.localeCompare(b.registrationDeadline))
    .slice(0, 4);

  return (
    <div className="overflow-x-hidden">
      {/* Первый экран: обещание слева, живые сроки справа (Z-раскладка). */}
      <section className="border-b border-ink-200/70 bg-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <Reveal immediate>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">{t.kicker}</p>
              <h1 className="mt-4 text-[2.4rem] font-medium leading-[1.05] tracking-tight text-balance text-ink-900 sm:text-6xl">
                {t.heroTitle}
              </h1>
            </Reveal>
            <Reveal immediate delay={0.08}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-500">{t.heroText}</p>
            </Reveal>
            <Reveal immediate delay={0.16}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <PressLink
                  href="/events"
                  className="inline-flex h-14 items-center gap-2 rounded-[var(--radius-pill)] bg-ink-900 px-8 text-base font-medium text-white transition-colors duration-200 hover:bg-ink-800"
                >
                  {t.ctaEvents}
                  <Icon name="arrow-right" size={18} />
                </PressLink>
                <PressLink
                  href="/register"
                  className="inline-flex h-14 items-center gap-2 rounded-[var(--radius-pill)] border border-ink-300 bg-white px-8 text-base font-medium text-ink-900 transition-colors duration-200 hover:border-ink-500"
                >
                  {t.ctaSignup}
                </PressLink>
              </div>
            </Reveal>
          </div>

          <Reveal immediate delay={0.2}>
            <div className="rounded-[var(--radius-card)] border border-ink-200 bg-ink-50/60 p-4 sm:p-5">
              <div className="flex items-baseline justify-between gap-3 px-1">
                <p className="text-sm font-semibold text-ink-900">{t.liveTitle}</p>
                <Link href="/events" className="text-sm font-semibold text-brand-600 hover:underline">
                  {t.allEvents}
                </Link>
              </div>
              {events !== null && upcoming.length === 0 ? (
                <p className="mt-4 px-1 pb-2 text-sm text-ink-500">{t.liveEmpty}</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {(events === null ? [null, null, null] : upcoming).map((event, index) =>
                    event === null ? (
                      <li key={index} className="h-[68px] animate-pulse rounded-[var(--radius-control)] bg-white" />
                    ) : (
                      <li key={event.id}>
                        <Link
                          href={`/events/${event.id}`}
                          className="flex items-center gap-3 rounded-[var(--radius-control)] bg-white px-4 py-3 shadow-[var(--shadow-rest)] outline-none transition-shadow hover:shadow-[var(--shadow-lift)] focus-visible:ring-2 focus-visible:ring-brand-500"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                            <Icon
                              name={EVENT_TYPES.find((type) => type.id === event.type)?.icon ?? 'calendar'}
                              size={18}
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-ink-900">{event.title}</span>
                            <span className="block truncate text-xs text-ink-500">
                              {t.registerBy(formatEventDate(event.registrationDeadline, language))}
                            </span>
                          </span>
                          <span
                            className={`shrink-0 text-sm font-semibold tabular-nums ${
                              eventStatus(event) === 'closing-soon' ? 'text-danger-600' : 'text-ink-500'
                            }`}
                          >
                            {daysLeftUntil(event.registrationDeadline) === 0
                              ? t.lastDay
                              : t.daysLeft(daysLeftUntil(event.registrationDeadline))}
                          </span>
                        </Link>
                      </li>
                    ),
                  )}
                </ul>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Три шага */}
      <section className="border-b border-ink-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <h2 className="text-3xl font-medium text-ink-900 sm:text-4xl">{t.stepsTitle}</h2>
          </Reveal>
          <StaggerGroup className="mt-10 grid gap-5 md:grid-cols-3">
            {t.steps.map((step, index) => (
              <StaggerItem key={step.title}>
                <div className="h-full rounded-[var(--radius-card)] border border-ink-200 bg-white p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <Icon name={step.icon} size={18} />
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-ink-400">0{index + 1}</span>
                  </div>
                  <p className="mt-4 text-lg font-medium text-ink-900">{step.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{step.text}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* Архив и «предложить событие» */}
      <section className="border-b border-ink-200/70 bg-ink-50">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 py-20 sm:px-6 md:grid-cols-2">
          <PromoCard icon="folder" title={t.archiveTitle} text={t.archiveText} cta={t.archiveCta} href="/archive" />
          <PromoCard icon="plus" title={t.suggestTitle} text={t.suggestText} cta={t.suggestCta} href="/events/new" />
        </div>
      </section>

      {/* Школам — одной строкой: на пилоте продукт обращён к ученику. */}
      <section className="border-b border-ink-200/70 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-14 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-xl font-medium text-ink-900">{t.schoolsTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">{t.schoolsText}</p>
          </div>
          <Link
            href="/for-schools"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline"
          >
            {t.schoolsCta}
            <Icon name="arrow-right" size={14} />
          </Link>
        </div>
      </section>

      {/* Финальный призыв */}
      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
          <Reveal>
            <h2 className="text-3xl font-medium leading-tight text-balance text-ink-900 sm:text-4xl">{t.finalTitle}</h2>
            <p className="mt-4 text-ink-500">{t.finalText}</p>
            <div className="mt-9 flex justify-center">
              <PressLink
                href="/register"
                className="inline-flex h-14 items-center gap-2 rounded-[var(--radius-pill)] bg-ink-900 px-9 text-base font-medium text-white transition-colors duration-200 hover:bg-ink-800"
              >
                {t.finalCta}
                <Icon name="arrow-right" size={18} />
              </PressLink>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

function PromoCard({
  icon,
  title,
  text,
  cta,
  href,
}: {
  icon: IconName;
  title: string;
  text: string;
  cta: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-[var(--radius-card)] border border-ink-200 bg-white p-7 outline-none transition-shadow hover:shadow-[var(--shadow-lift)] focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Icon name={icon} size={20} />
      </span>
      <p className="mt-5 text-xl font-medium text-ink-900">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">{text}</p>
      <p className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-brand-600">
        {cta}
        <Icon name="arrow-right" size={14} className="transition-transform group-hover:translate-x-1" />
      </p>
    </Link>
  );
}
