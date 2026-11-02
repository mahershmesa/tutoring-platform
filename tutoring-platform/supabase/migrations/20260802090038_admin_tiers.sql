-- =============================================================
-- 20260802090038_admin_tiers.sql — تدرّج صلاحيات المدراء
-- مدير أساسي (super) يدير المدراء؛ مدير مستوى ثاني يقوم بالمهام العادية فقط.
-- الأساسي يقدر «يوقف» (active=false) أو «يفصل» (حذف الصفّ) المدير الثاني.
-- =============================================================

alter table public.user_roles
  add column if not exists active boolean not null default true,
  add column if not exists super  boolean not null default false;

-- ترقية أقدم أدمن إلى «أساسي» إن لم يوجد أساسي بعد (ليملك المالك إدارة المدراء).
update public.user_roles
set super = true
where role = 'admin'
  and user_id = (
    select user_id from public.user_roles
    where role = 'admin' order by granted_at asc limit 1
  )
  and not exists (
    select 1 from public.user_roles where role = 'admin' and super
  );

-- is_admin الآن يشترط أن يكون الدور نشطاً (المُوقَف يفقد كل صلاحياته).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin' and active
  );
$$;

-- مدير أساسي؟ (يدير المدراء)
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin' and super and active
  );
$$;
grant execute on function public.is_super_admin() to authenticated;

-- إدارة الأدوار (منح/سحب/إيقاف): للمدير الأساسي فقط.
drop policy if exists "only admin manages roles" on public.user_roles;
drop policy if exists "only super admin manages roles" on public.user_roles;
create policy "only super admin manages roles"
  on public.user_roles
  for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());
