-- Модерация событий: что одобряет админ и что делать автору после отказа.
--
-- 1. updated_at + триггер. Автор может править событие, пока оно на
--    проверке. Без версии админ одобрял то, что видел минуту назад, а
--    автор успевал подменить ссылку на регистрацию — и фишинговая ссылка
--    уходила в афишу, дайджест и Telegram. Теперь «Одобрить» отправляет
--    updated_at, который видел админ, и при подмене обновление не проходит.
-- 2. Отклонённое событие автор может исправить и отправить снова: правка
--    возвращает его в очередь (status = 'pending', отметки проверки сняты).
-- 3. Не больше 10 предложений в сутки от одного человека (кроме админа):
--    запись идёт из браузера прямо в базу, мимо ограничителя в proxy.

alter table public.published_events
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.touch_updated_at() from public, anon, authenticated;

drop trigger if exists published_events_touch_updated_at on public.published_events;
create trigger published_events_touch_updated_at
  before update on public.published_events
  for each row execute function public.touch_updated_at();

drop policy if exists "authors edit own pending events" on public.published_events;
drop policy if exists "authors edit own pending or rejected events" on public.published_events;
create policy "authors edit own pending or rejected events"
  on public.published_events for update to authenticated
  using (auth.uid() = admin_id and status in ('pending', 'rejected'))
  with check (auth.uid() = admin_id and status = 'pending' and reviewed_by is null);

create or replace function public.limit_event_proposals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'pending'
     and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
     and (
       select count(*) from public.published_events e
        where e.admin_id = new.admin_id and e.created_at > now() - interval '1 day'
     ) >= 10 then
    raise exception 'too_many_proposals';
  end if;
  return new;
end;
$$;

revoke all on function public.limit_event_proposals() from public, anon, authenticated;

drop trigger if exists published_events_limit_proposals on public.published_events;
create trigger published_events_limit_proposals
  before insert on public.published_events
  for each row execute function public.limit_event_proposals();
