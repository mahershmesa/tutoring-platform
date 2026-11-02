-- =============================================================
-- 20260802090037_views_base.sql — تعديل الإدارة لعدد مشاهدات المدرّس
-- حقل views_base يُضاف إلى عدد المشاهدات الحقيقي في لوحة الإحصاءات.
-- إداري فقط (محميّ بـ protect_teacher_privileged_fields مثل featured_until).
-- =============================================================

alter table public.teacher_profiles
  add column if not exists views_base integer not null default 0;

-- حماية التزوير: نضيف views_base إلى الحقول التي تُعاد لقيمها القديمة لأي
-- مستخدم تطبيق عادي (المدرّس لا يرفع عدّاد مشاهداته بنفسه).
create or replace function public.protect_teacher_privileged_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon')
     or public.is_admin()
     or coalesce(current_setting('app.privileged_write', true), '') = 'on'
  then
    return new;
  end if;

  -- مستخدم تطبيق عادي: أعِد الحقول الحسّاسة لقيمها القديمة (منع التلاعب)
  new.verification_status := old.verification_status;
  new.answered_count      := old.answered_count;
  new.featured_until      := old.featured_until;
  new.views_base          := old.views_base;
  return new;
end;
$$;
