-- Приватность профилей учеников (находка аудита 2026-11-02).
--
-- Было: политика «profiles are publicly readable» пускала любого «члена
-- школы», а с открытой регистрацией им становится любой, кто завёл
-- аккаунт. Запрос GET /rest/v1/profiles?select=name,grade,class_id,
-- study_days,study_time,social_links,... отдавал список детей с их
-- расписанием и соцсетями. Переключатели приватности в профиле в базе не
-- проверялись вовсе.
--
-- Стало — чужой профиль видят только те, кому он нужен на пилоте:
-- - свой профиль — всегда (свой полный профиль приложение читает через
--   get_own_profile, SECURITY DEFINER, поэтому снятые ниже колонки ему не
--   мешают);
-- - профили учителей и админов — их имена подписаны под материалами архива;
-- - админ — все (имена в модерации; почты — только через admin_list_users с 2FA);
-- - учитель — учеников своего класса (список класса).
-- Плюс личные колонки (расписание, соцсети, цели, интересы, настройки
-- уведомлений и приватности) никому, кроме владельца через RPC, не отдаются.
--
-- Рейтинг и лента достижений на пилоте скрыты. Когда их вернут, им нужен
-- будет отдельный SECURITY DEFINER-источник с учётом leaderboard_anonymous и
-- progress_visible, а не прямое чтение profiles.

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

create or replace function public.my_class_as_teacher()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.class_id from public.profiles p where p.id = auth.uid() and p.role = 'teacher';
$$;

revoke all on function public.current_user_is_admin() from public, anon;
revoke all on function public.my_class_as_teacher() from public, anon;
grant execute on function public.current_user_is_admin() to authenticated;
grant execute on function public.my_class_as_teacher() to authenticated;

drop policy if exists "profiles are publicly readable" on public.profiles;
drop policy if exists "profiles readable by owner, staff and own teacher" on public.profiles;
create policy "profiles readable by owner, staff and own teacher"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or role in ('teacher', 'admin')
    or (select public.current_user_is_admin())
    or (class_id is not null and class_id = (select public.my_class_as_teacher()))
  );

revoke select (
  bio, social_links, availability, interests, goal, knowledge_level,
  notify_learning, notify_marketing, notify_org, reminder_lead_minutes,
  profile_visible, progress_visible, study_days, study_time, subject_ids,
  target_date, target_label
) on public.profiles from authenticated;

-- Маркетплейс: отметку «проверено» ставит только админ.
alter table public.published_listings alter column verified set default false;

drop policy if exists "only admins mark listings verified" on public.published_listings;
create policy "only admins mark listings verified"
  on public.published_listings as restrictive for insert to authenticated
  with check (verified = false or (select public.current_user_is_admin()));
