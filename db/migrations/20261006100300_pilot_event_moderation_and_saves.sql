-- Пилот: афиша с модерацией и «Мои события».
--
-- 1. Учитель может предложить событие — оно ждёт одобрения админа
--    (status = 'pending'), как объявления в «Возможностях». Админ публикует
--    сразу. Остальные видят только одобренное.
-- 2. Ограничения на уровне базы: длины полей, дедлайн не позже начала,
--    ссылка только http(s). Форма проверяет то же, но API можно вызвать
--    в обход формы.
-- 3. event_saves — «Мои события». Раньше отметка жила в localStorage и
--    терялась при смене устройства; ближайший дедлайн считался по ней.

alter table public.published_events
  add column if not exists status text not null default 'approved',
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

alter table public.published_events
  drop constraint if exists published_events_status_check,
  drop constraint if exists published_events_title_length,
  drop constraint if exists published_events_text_lengths,
  drop constraint if exists published_events_dates_order,
  drop constraint if exists published_events_registration_url_scheme,
  drop constraint if exists published_events_covers_count;

alter table public.published_events
  add constraint published_events_status_check
    check (status in ('pending', 'approved', 'rejected')),
  add constraint published_events_title_length
    check (char_length(btrim(title)) between 3 and 200),
  add constraint published_events_text_lengths
    check (
      char_length(organizer) <= 200
      and char_length(description) <= 5000
      and char_length(location) <= 200
      and (prize is null or char_length(prize) <= 300)
    ),
  add constraint published_events_dates_order
    check (registration_deadline <= starts_at),
  add constraint published_events_registration_url_scheme
    check (
      registration_url is null
      or (registration_url ~* '^https?://[^[:space:]]+$' and char_length(registration_url) <= 2000)
    ),
  add constraint published_events_covers_count
    check (cardinality(coalesce(cover_paths, '{}')) <= 8);

create index if not exists published_events_status_deadline_idx
  on public.published_events (status, registration_deadline);

-- Чтение: одобренное — всем вошедшим; своё — автору в любом статусе
-- (чтобы учитель видел, что предложение ждёт проверки); всё — админу.
drop policy if exists "events are publicly readable" on public.published_events;
drop policy if exists "approved events, own and admin see all" on public.published_events;
create policy "approved events, own and admin see all"
  on public.published_events for select to authenticated
  using (
    status = 'approved'
    or auth.uid() = admin_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Вставка: админ — в любом статусе, учитель — только на проверку.
drop policy if exists "only admins publish events" on public.published_events;
drop policy if exists "admins publish, teachers propose events" on public.published_events;
create policy "admins publish, teachers propose events"
  on public.published_events for insert to authenticated
  with check (
    auth.uid() = admin_id
    and reviewed_by is null
    and (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      or (
        status = 'pending'
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teacher')
      )
    )
  );

-- Правка: админ — любое событие и статус; автор-учитель — только своё
-- и только пока оно на проверке, и одобрить сам себя не может.
drop policy if exists "authors and admins edit events" on public.published_events;
drop policy if exists "admins edit any event" on public.published_events;
drop policy if exists "authors edit own pending events" on public.published_events;
create policy "admins edit any event"
  on public.published_events for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "authors edit own pending events"
  on public.published_events for update to authenticated
  using (auth.uid() = admin_id and status = 'pending')
  with check (auth.uid() = admin_id and status = 'pending' and reviewed_by is null);

-- «Мои события».
create table if not exists public.event_saves (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_id uuid not null references public.published_events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

alter table public.event_saves enable row level security;
revoke all on public.event_saves from anon;
grant select, insert, delete on public.event_saves to authenticated;

drop policy if exists "users read own saves" on public.event_saves;
drop policy if exists "users save approved events" on public.event_saves;
drop policy if exists "users remove own saves" on public.event_saves;

create policy "users read own saves"
  on public.event_saves for select to authenticated
  using (auth.uid() = user_id);

create policy "users save approved events"
  on public.event_saves for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.published_events e where e.id = event_id and e.status = 'approved')
  );

create policy "users remove own saves"
  on public.event_saves for delete to authenticated
  using (auth.uid() = user_id);
