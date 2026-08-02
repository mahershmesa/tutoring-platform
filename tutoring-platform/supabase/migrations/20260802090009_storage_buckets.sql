-- =============================================================
-- 20260802090009_storage_buckets.sql
-- تخزين الملفات: avatars (عام)، id-documents (خاص)، ads (عام/كتابة إدارية)
-- اصطلاح المسار: <bucket>/<user_id>/<filename> لملفات المستخدمين.
-- =============================================================

-- -------------------------------------------------------------
-- إنشاء الـ buckets
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('avatars',      'avatars',      true),   -- صور شخصية — مقروءة للعموم
  ('id-documents', 'id-documents', false),  -- إثبات هوية — خاص جداً
  ('ads',          'ads',          true)    -- صور الإعلانات — مقروءة للعموم
on conflict (id) do nothing;

-- =============================================================
-- سياسات الوصول على storage.objects
-- (RLS مفعّل افتراضياً على هذا الجدول في Supabase)
-- =============================================================

-- -------------------------------------------------------------
-- avatars — قراءة عامة، وكتابة يملكها صاحب المجلد فقط
-- -------------------------------------------------------------
create policy "avatars are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'avatars');

create policy "users upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- -------------------------------------------------------------
-- id-documents — خاص: القراءة لصاحب الملف أو الإدارة فقط
-- (الإدارة تحتاجها لمراجعة توثيق المدرّس)
-- -------------------------------------------------------------
create policy "id docs readable by owner or admin"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'id-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

create policy "users upload own id doc"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'id-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users update own id doc"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'id-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'id-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- الحذف: صاحب الملف أو الإدارة (مثلاً عند رفض الطلب وتنظيف الوثائق)
create policy "owner or admin deletes id doc"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'id-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

-- -------------------------------------------------------------
-- ads — قراءة عامة، والكتابة للإدارة فقط
-- -------------------------------------------------------------
create policy "ad images are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'ads');

create policy "only admin uploads ad images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'ads' and public.is_admin());

create policy "only admin updates ad images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'ads' and public.is_admin())
  with check (bucket_id = 'ads' and public.is_admin());

create policy "only admin deletes ad images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'ads' and public.is_admin());
