-- Пилот: журнал еженедельного дайджеста.
--
-- Крон по понедельникам (src/app/api/cron/weekly-digest) пишет сюда, кому
-- дайджест уже ушёл на этой неделе, — повторный запуск не отправит второе
-- письмо. Пишет только сервер (service role), клиенту таблица закрыта.

create table if not exists public.weekly_digests (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

alter table public.weekly_digests enable row level security;
revoke all on public.weekly_digests from anon, authenticated;
