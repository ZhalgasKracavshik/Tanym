'use client';

/**
 * Общий каркас страниц для партнёров (школы и учебные центры).
 *
 * Две страницы отличаются только текстом и цифрами, поэтому вёрстка одна.
 * Тон отличается от ученического лендинга намеренно: здесь читает
 * директор или руководитель центра, и ему нужны условия и цифры,
 * а не обещание «учись в своём темпе».
 *
 * Цен на странице нет сознательно: тариф зависит от размера школы,
 * и выдуманная цифра на публичной странице обернулась бы разговором,
 * который начинается с опровержения собственного прайса.
 */

import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { LiftCard, PressLink, Reveal, StaggerGroup, StaggerItem } from './motion';
import { Logo } from './Logo';
import Link from 'next/link';

export interface PartnerPageProps {
  kicker: string;
  title: string;
  intro: string;
  /** Боли аудитории: почему это вообще их проблема. */
  problems: { icon: IconName; title: string; text: string }[];
  /** Что получает партнёр. */
  offers: { icon: IconName; title: string; text: string }[];
  /** Как начинается сотрудничество — шаги без обещаний по срокам. */
  steps: { title: string; text: string }[];
  ctaTitle: string;
  ctaText: string;
  contactEmail: string;
  children?: ReactNode;
}

export function PartnerPage({
  kicker,
  title,
  intro,
  problems,
  offers,
  steps,
  ctaTitle,
  ctaText,
  contactEmail,
}: PartnerPageProps) {
  return (
    <div className="overflow-x-hidden">
      {/* Своя шапка: партнёрская страница открывается без входа, а обычная
          шапка продукта увела бы читателя в ученические разделы. */}
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            <Logo size={26} />
          </Link>
          <div className="flex items-center gap-2">
            <PressLink
              href="/login"
              className="rounded-[var(--radius-control)] border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700"
            >
              Войти
            </PressLink>
          </div>
        </div>
      </header>

      {/* Первый экран */}
      <section className="relative isolate overflow-hidden border-b border-ink-200/70 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-24">
          <Reveal immediate>
            <span className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-brand-200 bg-brand-50/80 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
              {kicker}
            </span>
          </Reveal>
          <Reveal immediate delay={0.06}>
            <h1 className="mx-auto mt-6 max-w-3xl text-[2.4rem] font-semibold leading-[1.08] tracking-tight text-ink-900 sm:text-5xl">
              {title}
            </h1>
          </Reveal>
          <Reveal immediate delay={0.12}>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-500">{intro}</p>
          </Reveal>
          <Reveal immediate delay={0.18}>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <PressLink
                href={`mailto:${contactEmail}`}
                className="inline-flex h-14 items-center gap-2 rounded-[var(--radius-control)] px-8 text-base font-bold text-white shadow-[var(--shadow-glow)]"
                style={{ background: 'var(--gradient-brand)' }}
              >
                Обсудить сотрудничество
                <Icon name="arrowRight" size={18} />
              </PressLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Проблемы аудитории */}
      <section className="border-b border-ink-200/70 bg-ink-50/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <h2 className="text-center text-3xl font-semibold text-ink-900 sm:text-4xl">
              Знакомая ситуация
            </h2>
          </Reveal>
          <StaggerGroup className="mt-12 grid gap-5 md:grid-cols-3">
            {problems.map((item) => (
              <StaggerItem key={item.title}>
                <LiftCard className="h-full rounded-[var(--radius-card)] border border-ink-200/80 bg-white p-7 shadow-[var(--shadow-rest)]">
                  <span className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-control)] bg-ink-100 text-ink-600">
                    <Icon name={item.icon} size={22} />
                  </span>
                  <h3 className="mt-5 font-bold text-ink-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{item.text}</p>
                </LiftCard>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* Что получает партнёр */}
      <section className="border-b border-ink-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <h2 className="text-center text-3xl font-semibold text-ink-900 sm:text-4xl">
              Что вы получаете
            </h2>
          </Reveal>
          <StaggerGroup className="mt-12 grid gap-5 md:grid-cols-2">
            {offers.map((item) => (
              <StaggerItem key={item.title}>
                <LiftCard className="h-full rounded-[var(--radius-card)] border border-ink-200/80 bg-white p-7 shadow-[var(--shadow-rest)]">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-control)] text-white"
                    style={{ background: 'var(--gradient-brand)' }}
                  >
                    <Icon name={item.icon} size={22} />
                  </span>
                  <h3 className="mt-5 font-bold text-ink-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{item.text}</p>
                </LiftCard>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* Как начать */}
      <section className="border-b border-ink-200/70 bg-ink-50/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <h2 className="text-center text-3xl font-semibold text-ink-900 sm:text-4xl">Как начать</h2>
          </Reveal>
          <StaggerGroup className="mt-12 grid gap-5 sm:grid-cols-3">
            {steps.map((step, index) => (
              <StaggerItem key={step.title}>
                <LiftCard className="h-full rounded-[var(--radius-card)] border border-ink-200/80 bg-white p-6 shadow-[var(--shadow-rest)]">
                  <span className="text-4xl font-semibold tabular-nums text-brand-200">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-3 font-bold text-ink-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{step.text}</p>
                </LiftCard>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* Контакт */}
      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <Reveal>
            <div
              className="relative overflow-hidden rounded-[var(--radius-card)] p-10 text-white shadow-[var(--shadow-float)] sm:p-14"
              style={{ background: 'var(--color-ink-900)' }}
            >
              <div className="relative">
                <h2 className="text-3xl font-semibold sm:text-4xl">{ctaTitle}</h2>
                <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/70">{ctaText}</p>
                <div className="mt-8 flex justify-center">
                  <PressLink
                    href={`mailto:${contactEmail}`}
                    className="inline-flex h-14 items-center gap-2 rounded-[var(--radius-control)] bg-white px-8 text-base font-bold text-ink-900 shadow-[var(--shadow-lift)]"
                  >
                    {contactEmail}
                    <Icon name="mail" size={18} />
                  </PressLink>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
