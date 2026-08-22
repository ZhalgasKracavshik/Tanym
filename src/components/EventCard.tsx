'use client';

/**
 * Карточка события.
 *
 * Наверху — то, что прислал организатор: афиша, фото с прошлого года, схема
 * площадки. Их листают, потому что решение «идти или нет» по одной картинке
 * не принимают. Придуманных иллюстраций здесь нет намеренно: нарисованная
 * заставка вместо настоящего снимка — это украшение пустоты, и на десяти
 * карточках подряд она сразу читается как заглушка. Если организатор ничего
 * не прислал, шапка остаётся типографской: крупный вид события на плотной
 * заливке — честно и не притворяется фотографией.
 *
 * Оборота у карточки больше нет. Он прятал описание за лишним действием,
 * хотя описание — главное, ради чего в карточку смотрят. Теперь текст на
 * месте сразу, а по кнопке разворачиваются подробности: место, формат,
 * классы, награда.
 */

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { EventStatus, SchoolEvent } from '@/lib/events';
import { Badge, Button } from './ui';
import { Icon } from './Icon';
import type { IconName } from './Icon';

/*
  Направление приходит в variants через `custom`: кадр должен уезжать в ту
  сторону, откуда пришёл следующий, иначе листание назад выглядит как
  листание вперёд.
*/
const SLIDE = {
  enter: (direction: number) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction < 0 ? '100%' : '-100%', opacity: 0 }),
};

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
  prevImage: string;
  nextImage: string;
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
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const images = event.coverUrls ?? [];
  const hasImages = images.length > 0;

  function move(step: number) {
    setDirection(step);
    setIndex((current) => (current + step + images.length) % images.length);
  }

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      /*
        Подъём на пружине, а не на линейном переходе: карточка должна
        отзываться как предмет, который приподняли, а не как слайд.
      */
      whileHover={reduce ? undefined : { y: -4, transition: { type: 'spring', stiffness: 300, damping: 22 } }}
      className={`group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-ink-200 bg-white shadow-[var(--shadow-rest)] transition-shadow duration-300 hover:shadow-[var(--shadow-float)] ${
        status === 'past' ? 'opacity-60' : ''
      }`}
    >
      {/* --- Шапка --- */}
      <div className={`relative h-48 shrink-0 overflow-hidden ${hasImages ? 'bg-ink-900' : bannerClass}`}>
        {hasImages ? (
          <AnimatePresence initial={false} custom={direction}>
            <motion.img
              key={index}
              src={images[index]}
              alt=""
              loading="lazy"
              custom={direction}
              variants={SLIDE}
              initial={reduce ? false : 'enter'}
              animate="center"
              exit={reduce ? { opacity: 0 } : 'exit'}
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </AnimatePresence>
        ) : (
          /*
            Без фотографий — не иконка на цветной плашке, а название вида
            события крупно. Иконка в пустом прямоугольнике сообщает «здесь
            должна была быть картинка»; слово ничего не обещает и читается
            как оформление.
          */
          <div className="flex h-full items-end p-5">
            <span className="text-2xl font-semibold leading-tight text-white/90">{typeTitle}</span>
          </div>
        )}

        {/* Затемнение снизу — иначе белые бейджи теряются на светлом снимке */}
        {hasImages && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-900/45 via-transparent to-ink-900/25"
          />
        )}

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-white/85 px-2.5 py-1 text-xs font-bold text-ink-800 backdrop-blur-sm">
            {typeIcon && <Icon name={typeIcon} size={13} />}
            {typeTitle}
          </span>
          {event.online && (
            <span className="rounded-[var(--radius-pill)] bg-white/85 px-2.5 py-1 text-xs font-bold text-ink-800 backdrop-blur-sm">
              {t.online}
            </span>
          )}
        </div>

        <span className="absolute right-3 top-3">
          <Badge tone={statusTone}>{statusLabel}</Badge>
        </span>

        {/* Стрелки появляются при наведении и только когда листать есть что */}
        {images.length > 1 && (
          <>
            <CarouselButton side="left" label={t.prevImage} onClick={() => move(-1)} />
            <CarouselButton side="right" label={t.nextImage} onClick={() => move(1)} />

            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {images.map((image, dot) => (
                <button
                  key={image}
                  onClick={() => {
                    setDirection(dot > index ? 1 : -1);
                    setIndex(dot);
                  }}
                  aria-label={`${dot + 1}`}
                  aria-current={dot === index}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    dot === index ? 'w-4 bg-white' : 'w-1.5 bg-white/55 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* --- Содержание --- */}
      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-lg font-bold leading-snug text-ink-900">{event.title}</h2>

        <p className="mt-1.5 text-sm text-ink-400">
          {deadlineLabel} · {event.organizer}
        </p>

        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-600">{event.description}</p>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <dl className="mt-4 space-y-2 border-t border-ink-100 pt-3 text-sm">
                <Row icon="pin" value={event.online ? t.online : event.location} />
                <Row icon="users" value={t.grades(event.grades.join(', '))} />
                {event.prize && <Row icon="trophy" value={event.prize} />}
              </dl>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-3 w-fit text-sm font-semibold text-brand-600 underline-offset-4 transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {expanded ? t.back : t.details}
        </button>

        {/* --- Низ: цена и действие --- */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 pt-4">
          <div>
            <p className="font-bold text-ink-900">{event.free ? t.free : t.paid}</p>
            {canRegister && (
              <p
                className={`text-xs font-semibold ${
                  status === 'closing-soon' ? 'text-danger-600' : 'text-ink-400'
                }`}
              >
                {daysLeft === 0 ? t.lastDay : t.daysLeft(daysLeft)}
              </p>
            )}
          </div>

          {registered ? (
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
              <Button size="sm" onClick={onToggleRegistration} className="group/cta">
                {t.register}
                <Icon
                  name="arrow-right"
                  size={15}
                  className="transition-transform duration-300 group-hover/cta:translate-x-1"
                />
              </Button>
            )
          )}
        </div>
      </div>
    </motion.article>
  );
}

function CarouselButton({
  side,
  label,
  onClick,
}: {
  side: 'left' | 'right';
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      /*
        opacity-0 только там, где наведение вообще есть. На телефоне
        (hover:none) кнопки видны всегда — иначе листать было бы нечем:
        карусель без стрелок и без свайпа осталась бы на первом кадре.
      */
      className={`absolute top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-ink-900/45 text-white backdrop-blur-sm transition-all duration-200 hover:bg-ink-900/70 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 ${
        side === 'left' ? 'left-2' : 'right-2'
      }`}
    >
      <Icon name={side === 'left' ? 'chevron-left' : 'chevron-right'} size={16} />
    </button>
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
