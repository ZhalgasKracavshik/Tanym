'use client';

/**
 * Карточка достижения: снимок во весь размер, подпись поверх него.
 *
 * Устройство взято из образца, присланного заказчиком: фотография занимает
 * всю карточку, снизу слева крупно идёт название события, под ним мелким
 * кеглем — вид или категория, а в правом верхнем углу вместо надписи LIVE
 * стоит дата, когда это было.
 *
 * Почему фото, а не белая карточка с текстом: достижение — это событие, и
 * снимок с него сообщает о нём больше, чем любая плашка. Текст лежит прямо
 * на снимке, поэтому низ кадра притемнён градиентом: без него белые буквы
 * пропадают на светлой фотографии, а поднимать контраст самой картинки —
 * значит портить её.
 *
 * Если фотографии нет, карточка не подменяет её ни заглушкой, ни выдуманным
 * изображением: та же вёрстка ложится на плотную заливку из токенов проекта.
 * Пустая рамка с иконкой «нет фото» читалась бы как поломка, тогда как
 * достижение без снимка — совершенно нормальный случай.
 *
 * Компонент ничего не знает ни про базу, ни про портфолио: он получает
 * готовые строки и готовый URL. Правила «чей это скан» и «можно ли его
 * показывать» решает вызывающая сторона — см. Portfolio.tsx.
 */

import { useReducedMotion } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import type { Language } from '@/lib/types';
import { Icon, type IconName } from './Icon';
import { LiftCard } from './motion';

export type AchievementCardTone = 'brand' | 'ink' | 'accent' | 'success';
export type AchievementCardStatus = 'pending' | 'approved' | 'rejected';

export interface AchievementCardProps {
  /** Крупная строка снизу: что за событие. «Городская олимпиада по физике». */
  title: string;
  /** Мелкая строка под заголовком: вид, категория, место. «2 место · Физика». */
  subtitle?: string;
  /**
   * Третья строка — рассказ самого ученика о событии.
   *
   * Заказчик просил показывать её именно там, где достижение публикует
   * пользователь: в ленте под фотографией всегда есть подпись, и без неё
   * пост теряет половину смысла. В портфолио строка необязательна.
   */
  description?: string;
  /** Когда это было: 'ГГГГ-ММ-ДД' или полная отметка времени из базы. */
  date: string;
  language: Language;
  /** Готовый публичный URL снимка. `null` — фото нет, будет заливка. */
  photoUrl?: string | null;
  /** Статус проверки. Не передан — карточка вне модерации (лента школы). */
  status?: AchievementCardStatus;
  /** Начисленные баллы. */
  points?: number;
  /** Цвет заливки, когда фотографии нет. */
  tone?: AchievementCardTone;
  /** Значок в левом верхнем углу — вид достижения. */
  icon?: IconName;
  /** Ссылки и кнопки в подвале карточки. Стиль — `ACHIEVEMENT_ACTION_CLASS`. */
  actions?: ReactNode;
}

/**
 * Заливки на случай «фото нет».
 *
 * Не однотонные: плоский цвет на большой площади выглядит как невыгруженная
 * картинка, а трёхточечный градиент — как освещённая поверхность.
 */
const TONE_FILL: Record<AchievementCardTone, string> = {
  brand: 'var(--gradient-brand)',
  ink: 'var(--gradient-ink)',
  accent:
    'linear-gradient(135deg, var(--color-accent-400) 0%, var(--color-accent-600) 55%, var(--color-brand-700) 100%)',
  success:
    'linear-gradient(135deg, var(--color-success-500) 0%, var(--color-success-700) 60%, var(--color-ink-800) 100%)',
};

/*
  Тёмный чернильный цвет проекта (--color-ink-900) с разной прозрачностью.
  На фотографии подпись держится плотной шторкой, на цветной заливке она
  слабее: там фон и так тёмный, и сильное затемнение только съело бы цвет.
*/
const PHOTO_SCRIM =
  'linear-gradient(to top, rgb(13 27 38 / 0.95) 0%, rgb(13 27 38 / 0.82) 26%, rgb(13 27 38 / 0.5) 48%, rgb(13 27 38 / 0.24) 72%, rgb(13 27 38 / 0.12) 100%)';

const FILL_SCRIM =
  'linear-gradient(to top, rgb(13 27 38 / 0.7) 0%, rgb(13 27 38 / 0.4) 35%, rgb(13 27 38 / 0.08) 70%, transparent 100%)';

const STATUS_META: Record<
  AchievementCardStatus,
  { icon: IconName; className: string; label: Record<Language, string> }
> = {
  pending: {
    icon: 'clock',
    className: 'border-accent-200/60 bg-accent-500/90 text-white',
    label: { ru: 'На проверке', kk: 'Тексеруде', en: 'Under review' },
  },
  approved: {
    icon: 'check',
    className: 'border-white/25 bg-success-500/90 text-white',
    label: { ru: 'Подтверждено', kk: 'Расталды', en: 'Verified' },
  },
  rejected: {
    icon: 'close',
    className: 'border-white/20 bg-ink-900/70 text-white/75',
    label: { ru: 'Отклонено', kk: 'Қабылданбады', en: 'Rejected' },
  },
};

const POINTS_HINT: Record<Language, string> = {
  ru: 'начислено баллов',
  kk: 'ұпай есептелді',
  en: 'points earned',
};

/** Единый стиль ссылок в подвале: они лежат на снимке, а не на белом фоне. */
export const ACHIEVEMENT_ACTION_CLASS =
  'text-xs font-semibold text-white/85 underline-offset-4 transition-colors hover:text-white hover:underline';

/**
 * Сокращения месяцев заданы вручную, а не взяты из Intl.
 *
 * Две причины. Первая: сервер и браузер держат разные версии данных ICU,
 * и `month: 'short'` для казахского выдавал на сервере одну строку, а в
 * браузере другую — React ловил это как расхождение при гидратации. Вторая:
 * русская локаль дописывает к году « г.», казахская — « ж.», и в короткой
 * строке верхнего угла этот хвост только мешает.
 *
 * Из Intl остаются только числа: их значение от версии ICU не зависит.
 */
const MONTHS: Record<Language, readonly string[]> = {
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  kk: ['қаң', 'ақп', 'нау', 'сәу', 'мам', 'мау', 'шіл', 'там', 'қыр', 'қаз', 'қар', 'жел'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

/**
 * Дата в подписи: «12 окт 2024».
 *
 * Полное `toLocaleDateString` даёт «12.10.2024» — набор цифр, который на
 * карточке читается как артикул. Месяц словом опознаётся мгновенно.
 */
export function formatAchievementDate(value: string, language: Language): string {
  // Чистая дата без времени: полдень по Алматы, иначе UTC-полночь уезжает
  // на сутки назад в западных часовых поясах.
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00+05:00` : value;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return value;

  const parts = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Almaty',
  }).formatToParts(date);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  const day = Number(pick('day'));
  const month = MONTHS[language][Number(pick('month')) - 1];
  const year = pick('year');

  if (!day || !month || !year) return value;
  return `${day} ${month} ${year}`;
}

export function AchievementCard({
  title,
  subtitle,
  description,
  date,
  language,
  photoUrl = null,
  status,
  points,
  tone = 'ink',
  icon,
  actions,
}: AchievementCardProps) {
  const reduced = useReducedMotion();
  const statusMeta = status ? STATUS_META[status] : null;

  /*
    Не всякий файл из бакета браузер покажет картинкой: с телефона прилетает
    HEIC, со сканера — TIFF, а «диплом» вполне может оказаться переименованным
    документом. Расширению в имени тут верить нельзя, поэтому ответ даёт сам
    браузер: не сумел отрисовать — карточка уходит на заливку, а не показывает
    во весь размер значок битого изображения.

    Храним адрес, а не флаг «сломалось»: список карточек переиспользует узлы по
    ключу, и после обновления строки флаг остался бы висеть на новом снимке.
  */
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const photo = photoUrl && photoUrl !== failedUrl ? photoUrl : null;

  /*
    Баллы показываем только у подтверждённого достижения (или там, где
    проверки нет вовсе). У заявки на проверке баллов ещё не существует, и
    ноль читался бы как «твоё достижение ничего не стоит», хотя его просто
    не успели посмотреть.
  */
  const showPoints =
    typeof points === 'number' && points > 0 && (status === undefined || status === 'approved');

  return (
    <LiftCard
      className={`group relative flex aspect-[4/5] flex-col overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-rest)] ${
        status === 'rejected' ? 'opacity-60' : ''
      }`}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- файл из бакета Storage, домена для next/image нет
        <img
          src={photo}
          alt=""
          loading="lazy"
          onError={() => setFailedUrl(photo)}
          className={`absolute inset-0 h-full w-full object-cover ${
            reduced ? '' : 'transition-transform duration-700 ease-out group-hover:scale-[1.04]'
          }`}
        />
      ) : (
        <div aria-hidden className="absolute inset-0" style={{ background: TONE_FILL[tone] }}>
          {/* Два размытых пятна: свет сверху, тень снизу — заливка перестаёт
              выглядеть как невыгруженная картинка. */}
          <span className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
          <span className="absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-black/25 blur-3xl" />
        </div>
      )}

      {/*
        Притемнение снизу: без него белый текст пропадает на светлом снимке.
        Градиент задан вручную, а не утилитой from-…/via-…/to-…: у той всего
        три остановки, и на высокой карточке переход от подписи к фотографии
        превращается в заметную полосу. Пять остановок держат текст на плотном
        фоне и при этом отпускают верх кадра почти чистым.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: photo ? PHOTO_SCRIM : FILL_SCRIM }}
      />

      <div className="relative flex items-start justify-between gap-2 p-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {/* Подложка значка тёмная, а не белая: верх кадра почти не притемнён,
              и светлый значок на светлой фотографии пропадал. */}
          {icon && (
            <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-pill)] border border-white/25 bg-ink-900/50 text-white backdrop-blur-sm">
              <Icon name={icon} size={16} />
            </span>
          )}

          {statusMeta && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm ${statusMeta.className}`}
            >
              <Icon name={statusMeta.icon} size={12} />
              {statusMeta.label[language]}
            </span>
          )}
        </div>

        {/* Место надписи LIVE из образца — здесь стоит дата события. */}
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-pill)] border border-white/25 bg-ink-900/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent-400" />
          {formatAchievementDate(date, language)}
        </span>
      </div>

      <div className="relative mt-auto p-5">
        {/*
          Баллы стоят в одной строке с заголовком, а не под описанием: у
          нижнего края они цеплялись за последнюю строку текста и читались
          как её продолжение.
        */}
        <div className="flex items-start justify-between gap-3">
          {/* Три строки, а не две: длинное название олимпиады — это не
              украшение, а сама суть записи в портфолио, и обрывать его на
              середине без нужды нельзя. */}
          <h3 className="line-clamp-3 min-w-0 flex-1 text-lg font-semibold leading-snug text-white sm:text-xl">
            {title}
          </h3>

          {showPoints && (
            <span
              className={`shrink-0 text-2xl font-semibold leading-tight tabular-nums ${
                /* На жёлто-оранжевой заливке светлый акцент сливается с фоном,
                   поэтому там число белое. */
                !photo && tone === 'accent' ? 'text-white' : 'text-accent-300'
              }`}
            >
              <span className="sr-only">{POINTS_HINT[language]}: </span>+{points}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="mt-1.5 line-clamp-1 text-[13px] font-medium text-white/75">{subtitle}</p>
        )}

        {description && (
          <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-white/65">
            {description}
          </p>
        )}

        {actions && (
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-white/15 pt-3">
            {actions}
          </div>
        )}
      </div>
    </LiftCard>
  );
}
