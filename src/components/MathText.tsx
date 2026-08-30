/**
 * Вывод текста с формулами.
 *
 * Компонент без состояния и без хуков — намеренно: он одинаково работает
 * и в серверных, и в клиентских частях, а вставлять его нужно почти в
 * каждое место, где показывается условие, подсказка или разбор.
 *
 * Строка-формула целиком (вариант ответа `a^2+b^2=c^2`) набирается
 * математическим шрифтом. В прозе шрифт не меняется: разбор решения —
 * это в первую очередь текст, и засечки посреди абзаца выглядели бы
 * вставкой из другого документа. Общее у обоих случаев — правильные
 * степени, индексы и знаки: они нужны везде.
 */

import { Fragment } from 'react';
import { formatMath, isFormula } from '@/lib/mathText';

interface MathTextProps {
  children: string;
  className?: string;
  /**
   * Не менять шрифт, поправить только знаки.
   *
   * Нужно там, где начертание уже несёт смысл и задано снаружи, — например
   * в моноширинной врезке ответа модели. Степени и знак умножения там всё
   * равно нужны, а вот подмена шрифта сломала бы вид врезки.
   */
  plain?: boolean;
}

export function MathText({ children, className, plain = false }: MathTextProps) {
  const parts = formatMath(children);
  const formula = isFormula(children);

  const classes = [
    'math-text',
    formula && !plain ? 'font-[family-name:var(--font-math)]' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes}>
      {parts.map((part, index) => {
        if (part.kind === 'sup') return <sup key={index}>{part.text}</sup>;
        if (part.kind === 'sub') return <sub key={index}>{part.text}</sub>;
        return <Fragment key={index}>{part.text}</Fragment>;
      })}
    </span>
  );
}
