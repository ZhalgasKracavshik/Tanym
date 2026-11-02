-- Пилот: вьюхи и функции под правами создателя.
--
-- verified_progress и activity_feed были SECURITY DEFINER-вьюхами (линтер
-- Supabase: ERROR): они обходили RLS исходных таблиц целиком. Теперь
-- обе работают с правами того, кто читает:
--
-- * verified_progress видит только своё (task_attempts_select_own) и,
--   для учителя, свой класс — ровно то, что нужно кабинету и панели учителя.
-- * Общешкольному рейтингу нужны баллы всех, поэтому для него отдельная
--   функция leaderboard_progress(): отдаёт только агрегаты (баллы, серию,
--   число тем), без счётчиков попыток, и только вошедшим.
-- * activity_feed: обе исходные таблицы и так читаются вошедшими; путь к
--   скану грамоты (proof_path) из ленты убран — бакет теперь приватный, а
--   лента его и раньше не показывала.

create or replace view public.activity_feed as
  select achievement_posts.id,
         achievement_posts.student_id as actor_id,
         'achievement_post'::text as kind,
         achievement_posts.achievement_key as title,
         achievement_posts.caption as detail,
         achievement_posts.photo_path as media_path,
         achievement_posts.created_at,
         '/achievements'::text as link,
         achievement_posts.audio_path,
         achievement_posts.video_url
    from public.achievement_posts
  union all
  select portfolio_achievements.id,
         portfolio_achievements.student_id as actor_id,
         'achievement_approved'::text as kind,
         portfolio_achievements.title,
         portfolio_achievements.category as detail,
         null::text as media_path,
         coalesce(portfolio_achievements.reviewed_at, portfolio_achievements.created_at) as created_at,
         ('/achievements/'::text || portfolio_achievements.id::text) as link,
         null::text as audio_path,
         null::text as video_url
    from public.portfolio_achievements
   where portfolio_achievements.status = 'approved';

alter view public.activity_feed set (security_invoker = true);
alter view public.verified_progress set (security_invoker = true);
alter view public.student_skill_stats set (security_invoker = true);

revoke all on public.activity_feed, public.verified_progress, public.student_skill_stats from anon;

create or replace function public.leaderboard_progress()
returns table (student_id uuid, points integer, topics_touched integer, streak_current integer)
language sql
stable
security definer
set search_path = ''
as $$
  select v.student_id, v.points, v.topics_touched, v.streak_current::integer
    from public.verified_progress v
   where auth.uid() is not null;
$$;

revoke all on function public.leaderboard_progress() from public, anon;
grant execute on function public.leaderboard_progress() to authenticated;

-- Линтер: функция без фиксированного search_path.
alter function public.verified_streak set search_path = public;

-- Служебные функции не нужны гостю. Внутри каждой есть своя проверка, но
-- отзывать EXECUTE у anon всё равно правильно: меньше поверхности.
-- is_school_member оставлена — её вызывают политики, в том числе на
-- запросах гостя, где она просто возвращает false.
revoke execute on function public.admin_set_role(uuid, text) from public, anon;
revoke execute on function public.admin_list_users() from public, anon;
revoke execute on function public.create_own_class(text) from public, anon;
revoke execute on function public.join_class_by_code(text) from public, anon;
revoke execute on function public.rename_own_class(text) from public, anon;
revoke execute on function public.get_own_profile() from public, anon;
grant execute on function public.admin_set_role(uuid, text) to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.create_own_class(text) to authenticated;
grant execute on function public.join_class_by_code(text) to authenticated;
grant execute on function public.rename_own_class(text) to authenticated;
grant execute on function public.get_own_profile() to authenticated;

-- TRUNCATE, TRIGGER и REFERENCES обходят RLS или не нужны клиенту вовсе;
-- гостю запись не нужна ни в одну таблицу. Глубокая защита поверх RLS.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke truncate, trigger, references on public.%I from anon, authenticated', t.tablename);
    execute format('revoke insert, update, delete on public.%I from anon', t.tablename);
  end loop;
end $$;
