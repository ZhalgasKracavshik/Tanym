-- Пилот: доверие к афише, статус заявки и напоминания о дедлайнах.
--
-- 1. Источник и дата проверки события. Просроченная или выдуманная афиша
--    убивает доверие сильнее пустой (вердикт совета 2026-10-06), поэтому у
--    события есть ссылка на первоисточник (сайт организатора) и дата,
--    когда админ последний раз сверил сроки. Дату ставит только админ:
--    при публикации, одобрении и кнопкой «Сверено сегодня».
--
-- 2. Статус в «Моих событиях»: сохранил → подал заявку → участвовал.
--    Это первый шаг новой логики достижений (docs/achievements-and-progress.md)
--    и главная метрика пилота: сколько заявок подано благодаря афише.
--
-- 3. Журнал напоминаний. Крон раз в день пишет ученикам, у которых событие
--    сохранено, но заявка ещё не подана, — за 7 дней и за 1 день до
--    дедлайна. Журнал не даёт отправить одно напоминание дважды, если
--    крон сработает повторно. Пишет в него только сервер (service role).

alter table public.published_events
  add column if not exists source_url text,
  add column if not exists verified_at date;

alter table public.published_events
  drop constraint if exists published_events_source_url_scheme;
alter table public.published_events
  add constraint published_events_source_url_scheme
    check (
      source_url is null
      or (source_url ~* '^https?://[^[:space:]]+$' and char_length(source_url) <= 2000)
    );

-- Дату проверки не-админ поставить не может: автор-учитель правит своё
-- событие на проверке, но «сверено» — слово администратора.
create or replace function public.guard_event_verified_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.verified_at is distinct from (case when tg_op = 'UPDATE' then old.verified_at else null end)
     and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
     and auth.uid() is not null then
    raise exception 'verified_at can be set by admins only';
  end if;
  return new;
end;
$$;

drop trigger if exists published_events_guard_verified_at on public.published_events;
create trigger published_events_guard_verified_at
  before insert or update on public.published_events
  for each row execute function public.guard_event_verified_at();

-- Статус заявки в «Моих событиях».
alter table public.event_saves
  add column if not exists status text not null default 'saved',
  add column if not exists status_changed_at timestamptz;

alter table public.event_saves drop constraint if exists event_saves_status_check;
alter table public.event_saves
  add constraint event_saves_status_check check (status in ('saved', 'applied', 'participated'));

-- Менять можно только статус и только у своей строки.
grant update (status, status_changed_at) on public.event_saves to authenticated;

drop policy if exists "users update own saves" on public.event_saves;
create policy "users update own saves"
  on public.event_saves for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Журнал отправленных напоминаний: только для сервера.
create table if not exists public.deadline_reminders (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.published_events(id) on delete cascade,
  kind text not null check (kind in ('d7', 'd1')),
  sent_at timestamptz not null default now(),
  primary key (user_id, event_id, kind)
);

alter table public.deadline_reminders enable row level security;
revoke all on public.deadline_reminders from anon, authenticated;
