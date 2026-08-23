import { redirect } from 'next/navigation';

/**
 * Страница настроек перенаправляет в единый центр профиля и настроек.
 * Все параметры безопасности, языка, приватности и учебного плана
 * теперь объединены во вкладках `/profile`.
 */
export default function SettingsPage() {
  redirect('/profile?tab=settings');
}
