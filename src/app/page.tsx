/**
 * Главная страница (лендинг).
 *
 * Это серверный компонент: здесь нет 'use client', потому что странице не нужны
 * ни состояние, ни обработчики кликов — только текст и ссылки. Такие страницы
 * Next.js целиком собирает на сервере, и браузер получает готовый HTML.
 */

import Link from 'next/link';
import { SUBJECTS } from '@/data';
import { ButtonLink, Card } from '@/components/ui';

/** Проблемы из кейса хакатона — то, ради чего продукт существует. */
const PROBLEMS = [
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
];

const STEPS = [
  { title: 'Профиль и цель', text: 'Класс, предметы и зачем ты учишься: ЕНТ, олимпиада или закрыть пробелы.' },
  { title: 'Диагностика', text: '8 заданий, которые показывают твой уровень по каждому навыку отдельно.' },
  { title: 'Персональный план', text: 'Система отбирает темы и объясняет, почему именно они и в таком порядке.' },
  { title: 'Задания и разбор', text: 'Решаешь — получаешь объяснение своей ошибки, а не просто «неверно».' },
];

export default function HomePage() {
  return (
    <div>
      {/* Первый экран: за 15 секунд должно стать понятно, что это и кому */}
      <section className="bg-gradient-to-b from-brand-50 to-ink-50">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <p className="mb-4 text-sm font-bold uppercase tracking-widest text-brand-600">
            AI-наставник для школьников Казахстана
          </p>
          <h1 className="text-3xl font-black leading-tight text-ink-900 sm:text-5xl">
            Качественное образование не должно зависеть от того, где ты живёшь
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-ink-500 sm:text-lg">
            Tanym измеряет твой уровень по каждой теме, строит персональный план и разбирает
            каждую ошибку. Как репетитор, только бесплатно и в любое время.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/onboarding" size="lg">
              Начать обучение
            </ButtonLink>
            <ButtonLink href="/onboarding" size="lg" variant="secondary">
              Пройти диагностику
            </ButtonLink>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-16 sm:px-6">
        {/* Проблема */}
        <section>
          <h2 className="text-center text-2xl font-bold text-ink-900">Почему это важно</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {/* map превращает массив данных в массив карточек.
                key нужен React, чтобы отличать элементы списка друг от друга. */}
            {PROBLEMS.map((problem) => (
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
          <h2 className="text-center text-2xl font-bold text-ink-900">Как это работает</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
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
          <h2 className="text-center text-2xl font-bold text-ink-900">Что можно изучать</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {SUBJECTS.map((subject) => (
              <Card key={subject.id}>
                <span className="text-3xl" aria-hidden>
                  {subject.icon}
                </span>
                <h3 className="mt-3 font-bold text-ink-900">{subject.title}</h3>
                <p className="mt-2 text-sm text-ink-500">{subject.description}</p>
                <p className="mt-3 text-xs font-semibold text-brand-600">
                  {subject.topics.length} тем · {subject.topics.reduce((sum, t) => sum + t.tasks.length, 0)} заданий
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* Блок для учителя */}
        <section className="rounded-2xl bg-ink-900 px-6 py-10 text-center sm:px-12">
          <h2 className="text-2xl font-bold text-white">Учителю — карта пробелов всего класса</h2>
          <p className="mx-auto mt-3 max-w-2xl text-ink-300">
            Видно, кто отстал и по какой теме, без проверки тридцати тетрадей. Свои темы и
            задания добавляются прямо в панели.
          </p>
          <Link
            href="/teacher"
            className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-ink-900 transition-colors hover:bg-ink-100"
          >
            Открыть панель учителя
          </Link>
        </section>

        {/* Финальный призыв */}
        <section className="text-center">
          <h2 className="text-2xl font-bold text-ink-900">Начни с диагностики — это 7 минут</h2>
          <p className="mt-3 text-ink-500">План появится сразу после неё.</p>
          <ButtonLink href="/onboarding" size="lg" className="mt-6">
            Начать обучение
          </ButtonLink>
        </section>
      </div>
    </div>
  );
}
