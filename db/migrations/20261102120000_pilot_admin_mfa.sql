-- Пилот: админ действует только со вторым фактором (TOTP).
--
-- Пароль админа — единственное, что отделяет постороннего от афиши для
-- всех учеников, от дайджеста в Telegram и от смены ролей. Утёкший пароль
-- (фишинг, повтор с другого сайта) не должен давать этих прав.
--
-- Как устроено:
-- - Supabase кладёт в JWT уровень входа: aal1 — только пароль, aal2 —
--   пароль и код из приложения-аутентификатора.
-- - public.admin_without_mfa() — «это админ, и он без второго фактора».
-- - RESTRICTIVE-политики на запись в таблицы, где у админа особые права:
--   они складываются через AND со всеми разрешающими, поэтому админ без
--   aal2 не может ни одобрить, ни удалить, ни опубликовать. На учеников и
--   учителей не влияют: для них функция всегда false.
-- - admin_set_role и admin_list_users (почты учеников) требуют aal2.
-- Страница /mfa и проверка в src/proxy.ts — удобство поверх этого: настоящая
-- граница здесь, потому что админка пишет в базу прямо из браузера.
--
-- Потерян телефон: SQL Editor → delete from auth.mfa_factors where user_id = '<id админа>';
-- затем войти и подключить приложение заново.

create or replace function public.admin_without_mfa()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'
     and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

revoke all on function public.admin_without_mfa() from public, anon;
grant execute on function public.admin_without_mfa() to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'published_events', 'published_listings', 'published_announcements',
    'portfolio_achievements', 'archive_materials', 'achievement_posts', 'custom_topics'
  ] loop
    execute format('drop policy if exists "admin writes need mfa (insert)" on public.%I', t);
    execute format('drop policy if exists "admin writes need mfa (update)" on public.%I', t);
    execute format('drop policy if exists "admin writes need mfa (delete)" on public.%I', t);
    execute format(
      'create policy "admin writes need mfa (insert)" on public.%I as restrictive for insert to authenticated
         with check (not (select public.admin_without_mfa()))', t);
    execute format(
      'create policy "admin writes need mfa (update)" on public.%I as restrictive for update to authenticated
         using (not (select public.admin_without_mfa())) with check (not (select public.admin_without_mfa()))', t);
    execute format(
      'create policy "admin writes need mfa (delete)" on public.%I as restrictive for delete to authenticated
         using (not (select public.admin_without_mfa()))', t);
  end loop;
end $$;

-- Сканы грамот: чужие админ видит только со вторым фактором, свои — как всегда.
drop policy if exists "admin proof reads need mfa" on storage.objects;
create policy "admin proof reads need mfa"
  on storage.objects as restrictive for select to authenticated
  using (
    bucket_id <> 'achievement-proofs'
    or (storage.foldername(name))[1] = (select auth.uid())::text
    or not (select public.admin_without_mfa())
  );

-- Смена ролей: только со вторым фактором.
create or replace function public.admin_set_role(target_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Только администратор может менять роли';
  end if;

  if coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' then
    raise exception 'mfa_required';
  end if;

  if new_role not in ('student', 'teacher', 'admin') then
    raise exception 'Недопустимая роль: %', new_role;
  end if;

  if new_role <> 'admin' and exists (
    select 1 from public.profiles where id = target_id and role = 'admin'
  ) and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'Нельзя снять роль с последнего администратора';
  end if;

  update public.profiles
     set role = new_role,
         teacher_requested_at = null
   where id = target_id;
end;
$$;

-- Список пользователей с почтами: без второго фактора — пусто.
create or replace function public.admin_list_users()
returns table (
  id uuid, email text, name text, role text, grade smallint, avatar_color text,
  avatar_photo_path text, class_name text, created_at timestamptz, teacher_requested_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, u.email::text, p.name, p.role, p.grade, p.avatar_color, p.avatar_photo_path,
         c.name as class_name, u.created_at, p.teacher_requested_at
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.classes c on c.id = p.class_id
   where exists (select 1 from public.profiles me where me.id = auth.uid() and me.role = 'admin')
     and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
   order by p.teacher_requested_at desc nulls last, u.created_at;
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
revoke execute on function public.admin_set_role(uuid, text) from public, anon;
grant execute on function public.admin_set_role(uuid, text) to authenticated;
