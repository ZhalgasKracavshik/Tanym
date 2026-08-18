'use client';

/**
 * Метка происхождения текста: сгенерирован живой моделью или собран запасным
 * алгоритмом.
 *
 * Это осознанное продуктовое решение, а не отладочный элемент. Ученик должен
 * понимать, разговаривает он с моделью или читает заранее подготовленный разбор:
 * подмена одного другим без предупреждения — это обман пользователя.
 */

import { COMMON, useLang } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { Badge } from './ui';

export function AiBadge({ live, reason }: { live: boolean; reason?: string }) {
  const t = COMMON[useLang()];

  if (live) {
    return (
      <Badge tone="brand">
        <Icon name="sparkles" size={14} />
        <span>{t.aiAnswer}</span>
      </Badge>
    );
  }

  return (
    <Badge tone="neutral" className={reason ? 'cursor-help' : ''}>
      <Icon name="book" size={14} />
      <span title={reason ? `AI: ${reason}` : undefined}>{t.aiFallback}</span>
    </Badge>
  );
}
