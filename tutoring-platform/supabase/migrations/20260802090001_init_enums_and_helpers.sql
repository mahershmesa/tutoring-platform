-- =============================================================
-- 20260802090001_init_enums_and_helpers.sql
-- الأساس: الإضافات (extensions)، الأنواع (enums)، ودوال مساعدة عامة
-- =============================================================

-- gen_random_uuid() لتوليد المعرفات الفريدة
create extension if not exists pgcrypto;

-- -------------------------------------------------------------
-- الأنواع (ENUMS)
-- -------------------------------------------------------------

-- دور المستخدم داخل المنصة
create type public.user_role as enum ('student', 'teacher', 'admin');

-- حالة توثيق المدرّس (يبدأ pending ولا تقبله الإدارة يدوياً)
create type public.verification_status as enum ('pending', 'approved', 'rejected');

-- حالة السؤال ضمن الجلسة
create type public.question_status as enum ('open', 'closed');

-- حالة الإشعار الموجّه للمدرّس
--   sent     : أُرسل للمدرّس
--   read     : فتحه المدرّس
--   answered : أكّد الطالب استلام رد فعلي (يزيد عدّاد answered_count)
create type public.notification_status as enum ('sent', 'read', 'answered');

-- -------------------------------------------------------------
-- دالة مساعدة: تحديث عمود updated_at تلقائياً
-- -------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger يحدّث عمود updated_at إلى الوقت الحالي عند أي تعديل على الصف.';
