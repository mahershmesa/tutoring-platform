-- =============================================================
-- 20260802090015_ad_contact_and_phone.sql
--   1) حقل معلومات تواصل للإعلان (يظهر في نافذة عند الضغط).
--   2) تحديث تريغر إنشاء البروفايل ليحفظ رقم الهاتف من بيانات التسجيل
--      (المصادقة صارت برقم الهاتف).
-- =============================================================

-- (1) معلومات تواصل الإعلان
alter table public.ads add column if not exists contact_info text;

-- (2) نسخة محدّثة من handle_new_user تحفظ phone أيضاً
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role     text;
  intended_role public.user_role;
  display_name  text;
  phone_val     text;
begin
  meta_role := coalesce(new.raw_user_meta_data->>'role', 'student');
  if meta_role = 'teacher' then
    intended_role := 'teacher';
  else
    intended_role := 'student';
  end if;

  display_name := coalesce(
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'مستخدم جديد'
  );
  phone_val := nullif(new.raw_user_meta_data->>'phone', '');

  insert into public.user_roles (user_id, role)
  values (new.id, intended_role)
  on conflict (user_id, role) do nothing;

  if intended_role = 'teacher' then
    insert into public.teacher_profiles (user_id, full_name, phone)
    values (new.id, display_name, phone_val)
    on conflict (user_id) do nothing;
  else
    insert into public.student_profiles (user_id, full_name, phone)
    values (new.id, display_name, phone_val)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;
