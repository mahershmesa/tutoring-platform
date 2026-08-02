-- =============================================================
-- 20260802090002_roles.sql
-- الأدوار (roles) ودوال فحص الصلاحيات
-- ملاحظة أمان: لوحة الإدارة محمية بدور 'admin' من أول يوم.
-- =============================================================

-- جدول أدوار المستخدمين. مستخدم واحد ممكن يكون له أكثر من دور.
create table public.user_roles (
  user_id  uuid not null references auth.users (id) on delete cascade,
  role     public.user_role not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

comment on table public.user_roles is
  'ربط المستخدمين بالأدوار (student / teacher / admin). أول admin يُضاف يدوياً عبر SQL Editor.';

-- -------------------------------------------------------------
-- دوال فحص الصلاحية (SECURITY DEFINER لتجاوز RLS وتفادي التكرار اللانهائي)
-- -------------------------------------------------------------

create or replace function public.has_role(check_role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = check_role
  );
$$;

comment on function public.has_role(public.user_role) is
  'ترجع true إذا كان المستخدم الحالي يملك الدور المطلوب.';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin');
$$;

comment on function public.is_admin() is
  'اختصار: هل المستخدم الحالي إداري (admin)؟';

-- -------------------------------------------------------------
-- RLS
-- -------------------------------------------------------------
alter table public.user_roles enable row level security;

-- المستخدم يقرأ أدواره فقط، والإدارة تقرأ الكل.
create policy "read own roles or admin reads all"
  on public.user_roles
  for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- إسناد/سحب الأدوار: للإدارة فقط.
create policy "only admin manages roles"
  on public.user_roles
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
