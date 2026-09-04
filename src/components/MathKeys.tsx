'use client';

/**
 * Клавиатура математических знаков для составителя заданий.
 *
 * Зачем. Условие задачи по математике почти никогда не набирается одними
 * буквами: нужны корень, степень, дробь, знаки неравенства, градус, пи.
 * На школьном ноутбуке их нет на клавишах, и учитель либо ищет символ в
 * таблице символов, либо пишет «корень из 2» словами — и тогда ученик
 * видит условие, не похожее на учебник.
 *
 * Почему знаки вставляются как обычный текст, а не как формула. Весь
 * продукт показывает условия простым текстом (см. lib/mathText.ts —
 * степени и корни там разбираются из обычной записи). Отдельный редактор
 * формул означал бы второй формат хранения задач и второй способ их
 * отрисовки — ради нескольких символов это несоразмерно.
 */

import { useStore } from './StoreProvider';
import type { Language } from '@/lib/types';

interface KeyDef {
  /** Что показать на клавише. */
  label: string;
  /** Что вставить в текст. */
  insert: string;
  /** Куда поставить курсор относительно конца вставки. */
  back?: number;
  title: Record<Language, string>;
}

const KEYS: KeyDef[] = [
  { label: '√', insert: '√', title: { ru: 'Корень', kk: 'Түбір', en: 'Square root' } },
  { label: 'x²', insert: '^2', title: { ru: 'Квадрат', kk: 'Квадрат', en: 'Square' } },
  { label: 'x³', insert: '^3', title: { ru: 'Куб', kk: 'Куб', en: 'Cube' } },
  { label: 'xⁿ', insert: '^', title: { ru: 'Степень', kk: 'Дәреже', en: 'Power' } },
  { label: '·', insert: ' · ', title: { ru: 'Умножение', kk: 'Көбейту', en: 'Multiply' } },
  { label: '÷', insert: ' / ', title: { ru: 'Деление', kk: 'Бөлу', en: 'Divide' } },
  { label: '½', insert: '1/2', title: { ru: 'Дробь', kk: 'Бөлшек', en: 'Fraction' } },
  { label: '≤', insert: ' ≤ ', title: { ru: 'Меньше или равно', kk: 'Кіші не тең', en: 'Less or equal' } },
  { label: '≥', insert: ' ≥ ', title: { ru: 'Больше или равно', kk: 'Үлкен не тең', en: 'Greater or equal' } },
  { label: '≠', insert: ' ≠ ', title: { ru: 'Не равно', kk: 'Тең емес', en: 'Not equal' } },
  { label: 'π', insert: 'π', title: { ru: 'Пи', kk: 'Пи', en: 'Pi' } },
  { label: '°', insert: '°', title: { ru: 'Градус', kk: 'Градус', en: 'Degree' } },
  { label: '∠', insert: '∠', title: { ru: 'Угол', kk: 'Бұрыш', en: 'Angle' } },
  { label: '±', insert: '±', title: { ru: 'Плюс-минус', kk: 'Плюс-минус', en: 'Plus-minus' } },
  { label: '∞', insert: '∞', title: { ru: 'Бесконечность', kk: 'Шексіздік', en: 'Infinity' } },
  { label: '( )', insert: '()', back: 1, title: { ru: 'Скобки', kk: 'Жақшалар', en: 'Brackets' } },
];

/**
 * Вставляет знак в поле по месту курсора.
 *
 * Именно по курсору, а не в конец: учитель дописывает знак посреди уже
 * набранного условия чаще, чем в самом конце, и вставка в хвост
 * заставляла бы каждый раз переносить символ вручную.
 */
export function MathKeys({
  target,
  onInsert,
}: {
  target: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  onInsert: (value: string) => void;
}) {
  const { state } = useStore();

  function press(key: KeyDef) {
    const field = target.current;
    if (!field) return;

    const start = field.selectionStart ?? field.value.length;
    const end = field.selectionEnd ?? start;
    const next = field.value.slice(0, start) + key.insert + field.value.slice(end);

    onInsert(next);

    /*
      Курсор возвращаем в следующем кадре: до перерисовки поле ещё хранит
      прежний текст, и выставленная сейчас позиция сбросится.
    */
    const caret = start + key.insert.length - (key.back ?? 0);
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(caret, caret);
    });
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {KEYS.map((key) => (
        <button
          key={key.label}
          type="button"
          title={key.title[state.language]}
          aria-label={key.title[state.language]}
          onClick={() => press(key)}
          /*
            Клавиши нарочито маленькие: это вспомогательный ряд под полем,
            и кнопки размером с основное действие спорили бы с ним за
            внимание. На сенсорном экране высота поднимается до пальца.
          */
          className="min-h-8 min-w-9 rounded-[var(--radius-control)] border border-ink-200 bg-white px-2 font-[var(--font-math)] text-sm text-ink-800 transition-colors hover:border-ink-400 hover:bg-ink-50 [@media(pointer:coarse)]:min-h-11"
        >
          {key.label}
        </button>
      ))}
    </div>
  );
}
