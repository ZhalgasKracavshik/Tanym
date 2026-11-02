'use client';

/**
 * Карточка события в афише.
 *
 * Наверху — то, что прислал организатор: афиша, фото с прошлого года, схема
 * площадки. Их листают, потому что решение «идти или нет» по одной картинке
 * не принимают. Придуманных иллюстраций здесь нет намеренно: нарисованная
 * заставка вместо настоящего снимка — это украшение пустоты, и на десяти
 * карточках подряд она сразу читается как заглушка. Если организатор ничего
 * не прислал, шапка остаётся типографской: крупный вид события на плотной
 * заливке — честно и не притворяется фотографией.
 *
 * Карточка больше не принимает решений. Раньше на ней стояла «Записаться»:
 * человек соглашался участвовать, прочитав три строки описания и не увидев
 * ни места, ни классов, ни того, что событие даёт. Теперь единственное
 * действие — «Подробнее», а запись живёт на странице события, где есть всё,
 * на чём это решение можно основывать. Заодно исчез и оборот с подробностями:
 * он дублировал ту же страницу, только в щели высотой в четыре строки.
 */

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { EventStatus, SchoolEvent } from '@/lib/events';
import { Badge, ButtonLink } from './ui';
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
  /** «Регистрация до» — подпись к главному факту карточки. */
  deadline: string;
  daysLeft: (n: number) => string;
  lastDay: string;
  online: string;
  free: string;
  paid: string;
  details: string;
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
  daysLeft,
  deadlineLabel,
  t,
}: {
  event: SchoolEvent;
  status: EventStatus;
  statusTone: 'success' | 'accent' | 'neutral';
  statusLabel: string;
  bannerClass: string;
  typeIcon?: IconName;
  typeTitle?: string;
  daysLeft: number;
  deadlineLabel: string;
  t: EventCardText;
}) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const images = event.coverUrls ?? [];
  const hasImages = images.length > 0;

  /*
    Считается здесь, а не приходит пропсом: значение полностью выводится из
    статуса, который уже пришёл. Лишний проп — это ещё одно место, где
    вызывающий может передать одно, а показать другое.
  */
  const registrationRuns = status === 'open' || status === 'closing-soon';

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
      {/* --- Шапка: только если организатор прислал изображения --- */}
      {hasImages ? (
        <div className="relative h-40 shrink-0 overflow-hidden bg-ink-900">
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
      ) : (
        /*
          Без изображений — тонкая полоса цвета вида события, а не плашка
          в 192px с его названием: на телефоне та занимала полэкрана и
          отодвигала главное — срок — за сгиб. Цвет всё равно различает
          олимпиаду и курс при беглом просмотре ленты.
        */
        <div aria-hidden className={`h-1.5 shrink-0 ${bannerClass}`} />
      )}

      {/* --- Содержание --- */}
      <div className="flex flex-1 flex-col p-5">
        {/* Вид, формат и статус — одной переносящейся строкой (см. историю в git: две группы по углам наезжали друг на друга). */}
        <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="flex items-center gap-1.5 whitespace-nowrap text-xs font-bold uppercase tracking-[0.06em] text-ink-500">
            {typeIcon && <Icon name={typeIcon} size={13} />}
            {typeTitle}
          </span>
          {event.online && (
            <span className="whitespace-nowrap text-xs font-semibold text-ink-400">· {t.online}</span>
          )}
          {/* Пока запись идёт, статус уже сказан строкой срока ниже — бейдж
              нужен только там, где записаться уже нельзя. */}
          {!registrationRuns && (
            <Badge tone={statusTone} className="ml-auto shrink-0 whitespace-nowrap">
              {statusLabel}
            </Badge>
          )}
        </div>

        <h2 className="line-clamp-3 break-words text-lg font-semibold leading-snug tracking-[-0.01em] text-ink-900">
          {event.title}
        </h2>
        {event.organizer && <p className="mt-1 truncate text-sm text-ink-500">{event.organizer}</p>}

        {/*
          Срок — главный факт карточки, как на olimpiada.ru: «до какого
          числа» читается раньше описания, а цвет сразу говорит, горит ли.
          Красный — 3 дня и меньше, янтарный — до двух недель.
        */}
        <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p
            className={`text-[15px] font-semibold tabular-nums ${
              !registrationRuns
                ? 'text-ink-400'
                : daysLeft <= 3
                  ? 'text-danger-600'
                  : daysLeft <= 14
                    ? 'text-accent-700'
                    : 'text-ink-800'
            }`}
          >
            {t.deadline} {deadlineLabel}
          </p>
          {registrationRuns && (
            <span
              className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${
                daysLeft <= 3 ? 'bg-danger-50 text-danger-700' : 'bg-ink-100 text-ink-600'
              }`}
            >
              {daysLeft === 0 ? t.lastDay : t.daysLeft(daysLeft)}
            </span>
          )}
        </div>

        {/*
          mb-4 у описания, а не mt у подвала: подвал прижат книзу через
          mt-auto, и у самой высокой карточки в ряду это «авто» равно нулю —
          линия подвала прилипла бы к последней строке текста.
        */}
        <p className="mt-3 mb-4 line-clamp-2 break-words text-sm leading-relaxed text-ink-600">{event.description}</p>

        {/* --- Низ: факты и переход на страницу события --- */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-ink-600">
            {gradesLabel(event.grades) && (
              <span className="rounded-md border border-ink-200 px-1.5 py-0.5">{gradesLabel(event.grades)}</span>
            )}
            <span
              className={`rounded-md border px-1.5 py-0.5 ${
                event.free ? 'border-success-200 bg-success-50 text-success-700' : 'border-ink-200'
              }`}
            >
              {event.free ? t.free : t.paid}
            </span>
          </div>

          <ButtonLink href={`/events/${event.id}`} size="sm" className="group/cta">
            {t.details}
            <Icon
              name="arrow-right"
              size={15}
              className="transition-transform duration-300 group-hover/cta:translate-x-1"
            />
          </ButtonLink>
        </div>
      </div>
    </motion.article>
  );
}

/** «5–9 кл», «11 кл» или пусто, если классы не указаны (значит — для всех). */
function gradesLabel(grades: number[]): string {
  const list = [...new Set(grades)].sort((a, b) => a - b);
  if (list.length === 0) return '';
  const contiguous = list.every((grade, i) => i === 0 || grade === list[i - 1] + 1);
  if (list.length === 1) return `${list[0]} кл`;
  return contiguous ? `${list[0]}–${list[list.length - 1]} кл` : `${list.join(', ')} кл`;
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
