-- Пилот: регистрация ученика открыта для любой почты.
--
-- Раньше профиль мог создать только владелец почты из allowed_school_domains
-- (binom.edu.kz и тестовый gmail.com). Пилот набирает аудиторию по всему
-- Казахстану, поэтому ученик регистрируется с любой почтой. Учитель —
-- по-прежнему только со школьного домена с allows_teacher (или его назначает
-- админ через admin_set_role): учитель публикует материалы и предлагает
-- события, это доверенная роль.
--
-- class_id при создании обязан быть пустым. Старая политика его не
-- проверяла, и прямым insert через API можно было вписаться в любой класс,
-- минуя код. Подключение к классу — только функцией join_class_by_code.

drop policy if exists "only school domain can create profile" on public.profiles;
drop policy if exists "students sign up with any email" on public.profiles;
drop policy if exists "teachers sign up from school domains" on public.profiles;

create policy "students sign up with any email"
  on public.profiles for insert to authenticated
  with check (
    auth.uid() = id
    and role = 'student'
    and class_id is null
  );

create policy "teachers sign up from school domains"
  on public.profiles for insert to authenticated
  with check (
    auth.uid() = id
    and role = 'teacher'
    and class_id is null
    and exists (
      select 1 from public.allowed_school_domains d
      where split_part(lower(auth.jwt() ->> 'email'), '@', 2) = lower(d.domain)
        and d.allows_teacher
    )
  );

-- Внешние центры на пилоте скрыты (src/lib/pilot.ts): самостоятельно
-- создать профиль центра больше нельзя. Вернуть — пересоздать политику
-- из миграции centers_can_create_own_profile.
drop policy if exists "external centers create own profile" on public.profiles;
