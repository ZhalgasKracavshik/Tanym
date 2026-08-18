/**
 * Метка происхождения текста: сгенерирован живой моделью или собран запасным
 * алгоритмом.
 *
 * Это осознанное продуктовое решение, а не отладочный элемент. Ученик должен
 * понимать, разговаривает он с моделью или читает заранее подготовленный разбор:
 * подмена одного другим без предупреждения — это обман пользователя.
 */

import { Badge } from './ui';

export function AiBadge({ live, reason }: { live: boolean; reason?: string }) {
  if (live) {
    return (
      <Badge tone="brand">
        <span aria-hidden>✨</span> Ответ AI
      </Badge>
    );
  }

  return (
    <Badge tone="neutral" className={reason ? 'cursor-help' : ''}>
      <span aria-hidden>📚</span>
      <span title={reason ? `AI недоступен: ${reason}` : undefined}>Разбор без AI</span>
    </Badge>
  );
}
