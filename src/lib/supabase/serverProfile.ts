import 'server-only';

/**
 * Профиль школьного аккаунта, прочитанный на сервере.
 *
 * Существует ради одной конкретной проблемы: во время серверного рендера
 * нет ни localStorage, ни fetch к собственному /api/profile, а роль знать
 * уже надо — иначе сервер отдаёт разметку с полным меню, браузер её рисует,
 * и через секунду гидратация подменяет меню на отфильтрованное. Именно это
 * мигание пользователь и видел при каждой перезагрузке.
 *
 * Куки сессии Supabase (sb-*) серверу доступны, поэтому роль читается
 * напрямую из базы тем же клиентом, что и в API-роуте.
 */

import { createClient } from './server';

export interface ServerProfile {
  id: string;
  role: 'student' | 'teacher' | 'admin';
  name: string;
  grade: number | null;
  class_id: string | null;
  avatar_color: string | null;
  avatar_photo_path: string | null;
  phone: string | null;
  knowledge_level: string | null;
  interests: string[];
  bio: string | null;
  availability: string | null;
  leaderboard_anonymous: boolean;
  profile_visible: boolean;
  progress_visible: boolean;
  notify_learning: boolean;
  notify_org: boolean;
  notify_marketing: boolean;
  study_days: number[];
  study_time: string | null;
  reminder_lead_minutes: number | null;

  social_links: unknown;
  subject_ids: string[] | null;
  goal: string | null;
  target_date: string | null;
  target_label: string | null;
}

export interface ServerSchoolClass {
  name: string;
  code: string;
}

export interface ServerProfileResult {
  profile: ServerProfile | null;
  email: string | null;
  /** Подтверждена ли почта — показывается в настройках. */
  emailConfirmed: boolean;
  schoolClass: ServerSchoolClass | null;
}

/**
 * Единственное место, где профиль резолвится из серверной сессии.
 *
 * Используется и в layout (чтобы первый кадр знал роль), и в GET /api/profile
 * (чтобы клиент мог перечитать профиль после смены роли или входа). Если бы
 * логика жила в двух местах, они бы разошлись при первом же изменении схемы.
 */
export async function getServerProfile(): Promise<ServerProfileResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { profile: null, email: null, emailConfirmed: false, schoolClass: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  let schoolClass: ServerSchoolClass | null = null;
  if (profile?.class_id) {
    const { data: cls } = await supabase
      .from('classes')
      .select('name, code')
      .eq('id', profile.class_id)
      .maybeSingle();
    schoolClass = cls ?? null;
  }

  return {
    profile: (profile as ServerProfile | null) ?? null,
    email: user.email ?? null,
    emailConfirmed: user.email_confirmed_at !== null && user.email_confirmed_at !== undefined,
    schoolClass,
  };
}
