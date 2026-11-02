-- Причина отказа для предложенного события (перенесено из Ulagat:
-- db/moderation_and_points.sql, rejection_reason).
--
-- Предлагать события теперь могут ученики и учителя. Без причины отказ
-- выглядит как «не понравилось», и человек больше ничего не предложит;
-- с причиной («нет ссылки на организатора», «уже есть в афише») — исправит
-- и пришлёт снова. Пишет админ (политика «admins edit any event»), автор
-- видит её на странице своего события.

alter table public.published_events add column if not exists rejection_reason text;

alter table public.published_events drop constraint if exists published_events_rejection_reason_length;
alter table public.published_events
  add constraint published_events_rejection_reason_length
    check (rejection_reason is null or char_length(rejection_reason) <= 500);
