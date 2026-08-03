-- =============================================================
-- 20260802090013_fix_protect_trigger.sql
-- إصلاح تريغر حماية حقول المدرّس الحسّاسة.
--
-- المشكلة: كان معرّفاً SECURITY DEFINER ويعتمد على is_admin() فقط، فكان
-- يمنع حتى التعديل المباشر من SQL Editor (يعمل بدور postgres بلا جلسة مستخدم،
-- فـ auth.uid() = NULL و is_admin() = false) → verification_status يرجع pending.
--
-- الحل: SECURITY INVOKER + فحص current_user (الدور الفعلي للمنفّذ):
--   * أدوار التطبيق (authenticated / anon) عبر API → يُمنع تعديل الحقول الحسّاسة
--     (إلا إذا كان المستخدم إدارياً is_admin()، أو عبر تريغر نظام موثوق).
--   * أي دور آخر (postgres عبر SQL Editor، service_role، الـ migrations) → مسموح.
--
-- ملاحظة: is_admin() يبقى SECURITY DEFINER (يقرأ user_roles متجاوزاً RLS)،
-- فصلاحية الإداري عبر التطبيق تبقى شغّالة.
-- =============================================================

create or replace function public.protect_teacher_privileged_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- سياقات موثوقة تتجاوز الحماية:
  --   (1) اتصال مباشر بالقاعدة: أي دور غير أدوار API (postgres / service_role / …)
  --   (2) مستخدم إداري عبر التطبيق
  --   (3) تريغر نظام داخلي رفع الإشارة app.privileged_write (مثل عدّاد الإجابات)
  if current_user not in ('authenticated', 'anon')
     or public.is_admin()
     or coalesce(current_setting('app.privileged_write', true), '') = 'on'
  then
    return new;
  end if;

  -- مستخدم تطبيق عادي: أعِد الحقول الحسّاسة لقيمها القديمة (منع التلاعب)
  new.verification_status := old.verification_status;
  new.answered_count      := old.answered_count;
  return new;
end;
$$;
