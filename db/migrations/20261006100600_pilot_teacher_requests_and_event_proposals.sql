-- Пилот: роль без вопроса на регистрации.
--
-- Все регистрируются учениками. Учителем становятся заявкой из профиля:
-- request_teacher_role() ставит отметку времени, админ видит заявку в
-- /admin/users и одним кликом назначает роль (admin_set_role, которая
-- заодно снимает заявку). Ни домены почты, ни выбор роли на входе больше
-- не нужны.
--
-- Плюс: предложить событие в афишу может любой вошедший — ученик тоже.
-- Это и есть форма «Сообщить о событии»: заявка всегда уходит в
-- модерацию (status = 'pending'), опубликовать сразу может только админ.

alter table public.profiles add column if not exists teacher_requested_at timestamptz;

-- Колонку пользователь сам не пишет: только через функцию ниже.
create or replace function public.request_teacher_role()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  update public.profiles
     set teacher_requested_at = coalesce(teacher_requested_at, now())
   where id = auth.uid() and role = 'student';
end;
$$;

revoke all on function public.request_teacher_role() from public, anon;
grant execute on function public.request_teacher_role() to authenticated;

-- Назначение роли снимает заявку: после решения админа она больше не висит.
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

-- Список пользователей для админки: добавлена отметка заявки.
drop function if exists public.admin_list_users();
create function public.admin_list_users()
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
   order by p.teacher_requested_at desc nulls last, u.created_at;
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
revoke execute on function public.admin_set_role(uuid, text) from public, anon;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

-- Предложить событие может любой вошедший участник (не центр): на проверку.
drop policy if exists "admins publish, teachers propose events" on public.published_events;
drop policy if exists "admins publish, members propose events" on public.published_events;
create policy "admins publish, members propose events"
  on public.published_events for insert to authenticated
  with check (
    auth.uid() = admin_id
    and reviewed_by is null
    and (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      or (
        status = 'pending'
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('student', 'teacher'))
      )
    )
  );
