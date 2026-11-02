-- Пилот: хранилище файлов.
--
-- 1. achievement-proofs становится приватным. В нём сканы грамот и
--    дипломов, а на них имя ребёнка, школа и класс. Публичный бакет отдавал
--    их любому, кто знает путь, — а путь лежал в activity_feed. Теперь файл
--    читают только сам ученик (папка <uid>/) и админ, по подписанной ссылке.
-- 2. Загрузка во все бакеты — только в собственную папку <uid>/. Раньше
--    archive-materials, achievement-photos и achievement-proofs принимали
--    файл от любого вошедшего в любой путь, то есть можно было подменить
--    чужой файл по известному пути (upsert) или засорить бакет.
-- 3. archive-materials: загружают только teacher/admin — как и публикуют.
-- 4. card-covers: центр убран (скрыт на пилоте), ученик добавлен — он
--    подаёт объявления в «Возможности» с обложкой, и форма это предлагает.

update storage.buckets set public = false where id = 'achievement-proofs';

drop policy if exists "proofs are publicly viewable" on storage.objects;
drop policy if exists "authenticated users upload proofs" on storage.objects;
drop policy if exists "owners and admins read proofs" on storage.objects;
drop policy if exists "students upload own proofs" on storage.objects;

create policy "owners and admins read proofs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'achievement-proofs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    )
  );

create policy "students upload own proofs"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'achievement-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "authenticated teachers upload archive materials" on storage.objects;
drop policy if exists "teachers upload own archive materials" on storage.objects;
create policy "teachers upload own archive materials"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'archive-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('teacher', 'admin'))
  );

drop policy if exists "authenticated students upload achievement photos" on storage.objects;
drop policy if exists "users upload own achievement photos" on storage.objects;
create policy "users upload own achievement photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'achievement-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "staff upload card covers" on storage.objects;
drop policy if exists "members upload own card covers" on storage.objects;
create policy "members upload own card covers"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'card-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('student', 'teacher', 'admin')
    )
  );
