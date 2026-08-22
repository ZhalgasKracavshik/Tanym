'use client';

/**
 * Ссылка на фотографию аватара по пути в бакете.
 *
 * Отдельной функцией, потому что мест, где рисуется аватар, шесть — лента,
 * рейтинг, профиль, настройки, боковое меню, админка. Пять копий одной
 * строки с `getPublicUrl` разъехались бы при первой же смене бакета, а
 * заметили бы это по пропавшим лицам в проде.
 */

import { createClient } from './client';

export function avatarPhotoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return createClient().storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
