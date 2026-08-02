-- =============================================================
-- 20260802090010_auto_profile_trigger.sql
-- إنشاء بروفايل مبدئي (stub) + إسناد الدور تلقائياً عند تسجيل مستخدم جديد.
-- الدور المقصود يُقرأ من بيانات التسجيل: raw_user_meta_data->>'role'.
-- =============================================================

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
begin
  meta_role := coalesce(new.raw_user_meta_data->>'role', 'student');

  -- حاجز أمان: لا يُسمح بتعيين admin عبر التسجيل الذاتي إطلاقاً.
  -- أي قيمة غير 'teacher' (بما فيها 'admin' أو قيمة مجهولة) تصبح 'student'.
  if meta_role = 'teacher' then
    intended_role := 'teacher';
  else
    intended_role := 'student';
  end if;

  -- اسم مبدئي معقول: من البيانات، وإلا الجزء الأول من الإيميل، وإلا نص افتراضي.
  display_name := coalesce(
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'مستخدم جديد'
  );

  -- إسناد الدور
  insert into public.user_roles (user_id, role)
  values (new.id, intended_role)
  on conflict (user_id, role) do nothing;

  -- إنشاء صف البروفايل المبدئي المطابق للدور
  if intended_role = 'teacher' then
    insert into public.teacher_profiles (user_id, full_name)
    values (new.id, display_name)
    on conflict (user_id) do nothing;
  else
    insert into public.student_profiles (user_id, full_name)
    values (new.id, display_name)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'ينشئ بروفايل مبدئي ويسند الدور عند تسجيل مستخدم جديد. يمنع تعيين admin ذاتياً.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
