-- Пилот: афиша открыта гостям.
--
-- Афиша — главный способ привести ученика: ссылку на олимпиаду пересылают
-- в чат класса, и требовать регистрацию, чтобы увидеть срок, значит
-- потерять человека на первом шаге. Гостю видно только одобренное;
-- заявки учителей на проверке, черновики и «Мои события» закрыты, как и
-- раньше. Писать гость не может ничего (права на запись у anon отозваны
-- в pilot_views_and_functions).

grant select on public.published_events to anon;

drop policy if exists "guests read approved events" on public.published_events;
create policy "guests read approved events"
  on public.published_events for select to anon
  using (status = 'approved');
