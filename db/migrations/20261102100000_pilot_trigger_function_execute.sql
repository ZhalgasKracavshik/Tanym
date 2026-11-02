-- Триггерная функция не должна торчать в /rest/v1/rpc: вызвать её вне
-- триггера Postgres и так не даст, но линтер Supabase справедливо ругается
-- (anon/authenticated_security_definer_function_executable). Триггер
-- продолжает работать: право EXECUTE проверяется только при CREATE TRIGGER.

revoke all on function public.guard_event_verified_at() from public, anon, authenticated;
