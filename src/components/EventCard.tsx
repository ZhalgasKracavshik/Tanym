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

        {/*
          Все плашки — вид события, формат и статус — лежат в одном
          переносящемся ряду, а не двумя группами по углам.

          Почему не две группы с justify-between. Так было, и статус всё
          равно наезжал на вид события. Сжать левую группу через min-w-0
          недостаточно: плашка внутри неё упирается в собственную
          min-content ширину (самое длинное слово плюс поля) и дальше не
          сжимается, а просто вылезает за границу группы — под бейдж, у
          которого shrink-0. Замер на карточке 224px: «Курсы и вебинары»
          против «Скоро закрытие» давали перекрытие в 19px, против «Запись
          закрыта» — 16px, в английском «Sign-up open» — 2px. Не помещается
          не текст, а сумма: карточка в сетке нигде не шире ~330px, и
          130 + 8 + 118 в неё не влезает ни при каком сокращении подписей.

          Один flex-wrap решает это тем, что лишнему просто некуда наехать:
          не поместившийся бейдж переносится на вторую строку. ml-auto
          держит его прижатым вправо и на своей строке, поэтому в обычном
          случае (короткий вид события) ряд выглядит ровно как раньше —
          вид слева, статус справа, одна строка. whitespace-nowrap на
          плашках нужен затем, чтобы вместо переноса бейджа они не начали
          ломаться пополам внутри себя.
        */}
        <div className="absolute inset-x-3 top-3 flex flex-wrap items-start gap-2">
          <span className="flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-pill)] bg-white/85 px-2.5 py-1 text-xs font-bold text-ink-800 backdrop-blur-sm">
            {typeIcon && <Icon name={typeIcon} size={13} />}
            {typeTitle}
          </span>

          {event.online && (
            <span className="whitespace-nowrap rounded-[var(--radius-pill)] bg-white/85 px-2.5 py-1 text-xs font-bold text-ink-800 backdrop-blur-sm">
              {t.online}
            </span>
          )}

          <Badge tone={statusTone} className="ml-auto shrink-0 whitespace-nowrap">
            {statusLabel}
          </Badge>
        </div>

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
        <h2 className="text-lg font-bold leading-snug break-words text-ink-900">{event.title}</h2>

        <p className="mt-1.5 text-sm text-ink-400">
          {deadlineLabel} · {event.organizer}
        </p>

        {/*
          mb-4 у описания, а не mt у подвала: подвал прижат книзу через
          mt-auto, и у самой высокой карточки в ряду это «авто» равно нулю —
          линия подвала прилипла бы к последней строке текста.
        */}
        <p className="mt-3 mb-4 line-clamp-3 break-words text-sm leading-relaxed text-ink-600">{event.description}</p>

        {/* --- Низ: цена, срок и переход на страницу события --- */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 pt-4">
          <div>
            <p className="font-bold text-ink-900">{event.free ? t.free : t.paid}</p>
            {registrationRuns && (
              <p
                className={`text-xs font-semibold ${
                  status === 'closing-soon' ? 'text-danger-600' : 'text-ink-400'
                }`}
              >
                {daysLeft === 0 ? t.lastDay : t.daysLeft(daysLeft)}
              </p>
            )}
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
