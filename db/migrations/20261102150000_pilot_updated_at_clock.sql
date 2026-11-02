-- updated_at — реальное время изменения (clock_timestamp), а не начало
-- транзакции (now()): две правки в одной транзакции иначе получали одну и
-- ту же отметку, и проверка «событие не менялось с момента просмотра» в
-- модерации могла её не заметить.

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

revoke all on function public.touch_updated_at() from public, anon, authenticated;
