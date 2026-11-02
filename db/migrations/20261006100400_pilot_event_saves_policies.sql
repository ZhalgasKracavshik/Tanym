-- Доводка pilot_event_moderation_and_saves: в SQL Editor хвост файла не
-- применился — таблица event_saves создана и RLS на ней включён, но прав
-- и политик нет (сохранение событий отвечало отказом всем). Идемпотентно.

alter table public.event_saves enable row level security;
revoke all on public.event_saves from anon;
revoke truncate, trigger, references, update on public.event_saves from authenticated;
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
