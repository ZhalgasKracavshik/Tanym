-- Журнал постов дайджеста в Telegram-канал: одна запись на неделю.
--
-- Раньше повтор поста отсекался косвенно — «если в weekly_digests ещё
-- пусто». Пока писем нет (нет ключа Resend, нет подходящих учеников, все
-- пакеты упали), журнал пуст, и каждый перезапуск крона постил дайджест
-- в канал заново. Ключ — понедельник недели по Астане.

create table if not exists public.digest_posts (
  week_start date primary key,
  posted_at timestamptz not null default now()
);

alter table public.digest_posts enable row level security;
revoke all on public.digest_posts from anon, authenticated;
