'use client';

/**
 * Карточка события с оборотом.
 *
 * Раньше всё содержимое лежало на одной стороне, и карточка была компромиссом:
 * описание обрезалось на второй строке, а место, формат и награда стояли
 * одной серой строкой через точку. Прочесть событие целиком было нельзя
 * нигде — отдельной страницы у события нет.
 *
 * Оборот решает это, не заводя новых экранов: лицевая сторона отвечает на
 * вопрос «что это и когда закрывается», оборотная — «стоит ли идти».
 * Записаться можно с обеих: решение приходит и до, и после подробностей,
 * и заставлять переворачивать карточку обратно ради кнопки было бы глупо.
 *
 * Переворот по кнопке, а не по наведению. На телефоне наведения нет вовсе,
 * а на ноутбуке карточка, которая крутится от проезжающей мимо мыши, мешает
 * читать соседние. Кнопка работает одинаково и там, и там, и с клавиатуры.
 */

import { useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { EventStatus, EventType, SchoolEvent } from '@/lib/events';
import { Badge, Button } from './ui';
import { Icon } from './Icon';
import type { IconName } from './Icon';

export interface EventCardText {
  register: string;
  registered: string;
  cancel: string;
  confirmCancel: (title: string) => string;
  deadline: string;
  daysLeft: (n: number) => string;
  lastDay: string;
  online: string;
  free: string;
  paid: string;
  grades: (list: string) => string;
  prize: string;
  details: string;
  back: string;
}

export function EventCard({
  event,
  status,
  statusTone,
  statusLabel,
  bannerClass,
  typeIcon,
  typeTitle,
  registered,
  daysLeft,
  canRegister,
  deadlineLabel,
  onToggleRegistration,
  t,
}: {
  event: SchoolEvent;
  status: EventStatus;
  statusTone: 'success' | 'accent' | 'neutral';
  statusLabel: string;
  bannerClass: string;
  typeIcon?: IconName;
  typeTitle?: string;
  registered: boolean;
  daysLeft: number;
  canRegister: boolean;
  deadlineLabel: string;
  onToggleRegistration: () => void;
  t: EventCardText;
}) {
  const [flipped, setFlipped] = useState(false);
  const reduce = useReducedMotion();

  const registerButton = registered ? (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-sm font-semibold text-success-700">
        <Icon name="check" size={16} />
        {t.registered}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          if (window.confirm(t.confirmCancel(event.title))) onToggleRegistration();
        }}
      >
        {t.cancel}
      </Button>
    </div>
  ) : (
    canRegister && (
      <Button size="sm" onClick={onToggleRegistration}>
        {t.register}
      </Button>
    )
  );

  /*
    Высота задана и одинакова у всех карточек. Обе стороны выведены из
    потока (absolute), и сжаться по содержимому контейнеру не от чего —
    без явной высоты он схлопнулся бы в ноль.
  */
  return (
    <div className="h-[27rem] [perspective:2000px]">
      <div
        className="relative h-full w-full transition-transform duration-700 [transform-style:preserve-3d]"
        style={{
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transitionDuration: reduce ? '0ms' : undefined,
        }}
      >
        {/* Лицевая сторона */}
        <Face hidden={flipped} className={status === 'past' ? 'opacity-60' : ''}>
          <div className={`relative h-32 shrink-0 ${event.coverUrl ? 'bg-ink-200' : bannerClass}`}>
            {event.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- внешний бакет, домен для next/image не настроен
              <img src={event.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              typeIcon && (
                <div className="flex h-full items-center justify-center">
                  <Icon name={typeIcon} size={34} className="text-white/85" />
                </div>
              )
            )}
            <span className="absolute right-3 top-3">
              <Badge tone={statusTone}>{statusLabel}</Badge>
            </span>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden p-5">
            <Badge tone="brand" className="w-fit">
              {typeIcon && <Icon name={typeIcon} size={14} />}
              {typeTitle}
            </Badge>

            <h2 className="mt-3 line-clamp-2 text-lg font-bold text-ink-900">{event.title}</h2>
            <p className="mt-1 truncate text-sm text-ink-400">{event.organizer}</p>

            <div className="mt-auto border-t border-ink-200 pt-3">
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-400">
                <Icon name="calendar" size={14} />
                {t.deadline}
              </p>
              <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="font-semibold tabular-nums text-ink-900">{deadlineLabel}</p>
                {canRegister && (
                  <p
                    className={`text-sm font-semibold ${
                      status === 'closing-soon' ? 'text-danger-600' : 'text-ink-500'
                    }`}
                  >
                    {daysLeft === 0 ? t.lastDay : t.daysLeft(daysLeft)}
                  </p>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={() => setFlipped(true)}
                  className="group/more inline-flex items-center gap-1.5 rounded-[var(--radius-control)] px-2 py-1.5 -ml-2 text-sm font-semibold text-brand-600 transition-colors duration-150 hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  {t.details}
                  <Icon
                    name="compass"
                    size={15}
                    className="transition-transform duration-300 group-hover/more:translate-x-0.5"
                  />
                </button>
                {registerButton}
              </div>
            </div>
          </div>
        </Face>

        {/* Оборот */}
        <Face back hidden={!flipped}>
          <div className="flex h-full flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="line-clamp-2 text-lg font-bold text-ink-900">{event.title}</h2>
              <button
                onClick={() => setFlipped(false)}
                aria-label={t.back}
                className="shrink-0 rounded-full p-1.5 text-ink-400 transition-colors duration-150 hover:bg-ink-100 hover:text-ink-700 focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {/* Длинное описание прокручивается внутри карточки: высота
                общая для всей сетки, растягивать её под самый подробный
                текст значило бы оставить дыры под всеми остальными. */}
            <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-600">
                {event.description}
              </p>

              <dl className="mt-4 space-y-2 border-t border-ink-200 pt-3 text-sm">
                <Row icon="pin" value={event.online ? t.online : event.location} />
                <Row icon="gem" value={event.free ? t.free : t.paid} />
                <Row icon="users" value={t.grades(event.grades.join(', '))} />
                {event.prize && <Row icon="trophy" value={event.prize} />}
              </dl>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-ink-200 pt-3">
              <button
                onClick={() => setFlipped(false)}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] px-2 py-1.5 -ml-2 text-sm font-semibold text-ink-500 transition-colors duration-150 hover:bg-ink-100 focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                {t.back}
              </button>
              {registerButton}
            </div>
          </div>
        </Face>
      </div>
    </div>
  );
}

/**
 * Одна сторона карточки.
 *
 * backface-visibility скрывает изнанку не во всех браузерах одинаково,
 * поэтому невидимая сторона дополнительно гасится opacity и убирается из
 * дерева доступности: иначе скринридер и поиск по странице находили бы на
 * карточке два комплекта кнопок, включая невидимый.
 */
function Face({
  children,
  back = false,
  hidden,
  className = '',
}: {
  children: React.ReactNode;
  back?: boolean;
  hidden: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden={hidden}
      inert={hidden ? true : undefined}
      className={`absolute inset-0 flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-ink-200 bg-white shadow-[var(--shadow-rest)] transition-opacity duration-300 [backface-visibility:hidden] ${
        hidden ? 'opacity-0' : 'opacity-100'
      } ${className}`}
      style={{ transform: back ? 'rotateY(180deg)' : undefined }}
    >
      {children}
    </div>
  );
}

function Row({ icon, value }: { icon: IconName; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <dt className="mt-0.5 shrink-0 text-ink-400">
        <Icon name={icon} size={15} />
      </dt>
      <dd className="text-ink-700">{value}</dd>
    </div>
  );
}

export type { EventType };
