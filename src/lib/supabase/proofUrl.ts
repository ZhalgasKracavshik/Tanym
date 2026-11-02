'use client';

/**
 * Ссылка на скан подтверждения достижения (грамота, диплом).
 *
 * Бакет achievement-proofs приватный: на скане имя ребёнка, школа и класс,
 * и публичная ссылка отдавала бы их любому, кто знает путь. Читать файл
 * могут только автор и админ (политика в миграции pilot_storage_hardening),
 * поэтому вместо getPublicUrl — подписанная ссылка на десять минут. Всем
 * остальным хранилище откажет, и хук вернёт null: блок с подтверждением
 * просто не покажется.
 */

import { useEffect, useState } from 'react';
import { createClient } from './client';

const SIGNED_URL_TTL_SECONDS = 600;

export function useProofUrl(path: string | null | undefined): string | null {
  const [signed, setSigned] = useState<{ path: string; url: string | null } | null>(null);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    createClient()
      .storage.from('achievement-proofs')
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
      .then(({ data }) => {
        if (!cancelled) setSigned({ path, url: data?.signedUrl ?? null });
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  // Ссылка от прошлого пути не должна мелькнуть под новым достижением.
  return path && signed?.path === path ? signed.url : null;
}
