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
  avatar_emoji: string | null;
  social_links: unknown;
  subject_ids: string[] | null;
  goal: string | null;
  target_date: string | null;
}

export interface ServerSchoolClass {
  name: string;
  code: string;
}

export interface ServerProfileResult {
  profile: ServerProfile | null;
  email: string | null;
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

  if (!user) return { profile: null, email: null, schoolClass: null };

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
    schoolClass,
  };
}
