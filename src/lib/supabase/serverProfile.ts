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
  role: 'student' | 'teacher' | 'admin' | 'center';
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
  goal_custom: string | null;
  /** Данные организации. У ученика и учителя пустые. */
  org_name: string | null;
  org_site: string | null;
  org_contact: string | null;
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

  /*
    Свой профиль читается функцией с правами владельца, а не обычным
    select. Телефон закрыт правом на колонку — иначе его читал бы любой
    одноклассник, ведь RLS работает построчно и строку показывает целиком.
    Грант выдаётся роли, а не строке, поэтому без этой функции владелец не
    увидел бы и собственный номер.
  */
  const { data: rawProfile } = await supabase.rpc('get_own_profile').maybeSingle();
  // rpc не знает формы возвращаемой строки, поэтому тип задаём здесь —
  // ровно тот же, что и раньше отдавал select('*').
  /*
    Строка без идентификатора — это отсутствие профиля, а не профиль.

    Функция объявлена как RETURNS profiles, то есть возвращает составной
    тип таблицы. Когда строки нет, слой PostgREST способен отдать не
    пустоту, а объект, у которого ВСЕ поля равны null. Такой объект
    проходит проверку «профиль есть», после чего роль оказывается пустой,
    и код, который ищет её в таблице настроек, получает undefined.

    Это состояние не выдумано: в него попадает каждый, кто зарегистрировал
    учётную запись, но профиль которому создать не удалось, — например
    центр до того, как для него завели право на вставку.
  */
  const raw = rawProfile as (ServerProfile & { id?: string | null }) | null;
  const profile = raw && raw.id ? (raw as ServerProfile) : null;

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
    profile,
    email: user.email ?? null,
    emailConfirmed: user.email_confirmed_at !== null && user.email_confirmed_at !== undefined,
    schoolClass,
  };
}
