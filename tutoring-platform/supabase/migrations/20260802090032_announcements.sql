-- =============================================================
-- 20260802090032_announcements.sql — نظام الإعلانات والتبليغات
-- جدول موحّد يخدم:
--  • إشعار توثيق المدرّس (audience='user', kind='approval') → push شخصي.
--  • تبليغ شامل للطلاب/الأساتذة/الجميع + نصيحة اليوم → بانر داخل التطبيق + push.
-- يعيد استخدام تريغر الدفع الموجود notify_push_on_insert().
-- =============================================================

-- دوال تحديد الدور (SECURITY DEFINER حتى تقرأ الجداول رغم RLS)
create or replace function public.is_student(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.student_profiles where user_id = uid);
$$;
revoke all on function public.is_student(uuid) from public;
grant execute on function public.is_student(uuid) to authenticated;

create or replace function public.is_teacher(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.teacher_profiles where user_id = uid);
$$;
revoke all on function public.is_teacher(uuid) from public;
grant execute on function public.is_teacher(uuid) to authenticated;


create table if not exists public.announcements (
  id             uuid primary key default gen_random_uuid(),
  audience       text not null check (audience in ('students', 'teachers', 'all', 'user')),
  target_user_id uuid references auth.users(id) on delete cascade,
  kind           text not null default 'announcement'
    check (kind in ('announcement', 'tip', 'approval')),
  title          text,
  body           text not null,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);
create index if not exists idx_announcements_active
  on public.announcements (active, created_at desc);

alter table public.announcements enable row level security;

-- القراءة: كلٌّ حسب دوره (أو الشخصية الموجّهة له)
drop policy if exists "read my announcements" on public.announcements;
create policy "read my announcements"
  on public.announcements for select
  to authenticated
  using (
    public.is_admin()  -- الأدمن يقرأ الكل (لوحة الإدارة: عرض/تعديل/حذف حتى المعطّلة)
    or (
      active and (
        audience = 'all'
        or (audience = 'students' and public.is_student(auth.uid()))
        or (audience = 'teachers' and public.is_teacher(auth.uid()))
        or (audience = 'user' and target_user_id = auth.uid())
      )
    )
  );

-- الإنشاء/التعديل/الحذف: الإدارة فقط
drop policy if exists "admin inserts announcements" on public.announcements;
create policy "admin inserts announcements"
  on public.announcements for insert to authenticated
  with check (public.is_admin());
drop policy if exists "admin updates announcements" on public.announcements;
create policy "admin updates announcements"
  on public.announcements for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin deletes announcements" on public.announcements;
create policy "admin deletes announcements"
  on public.announcements for delete to authenticated
  using (public.is_admin());

grant select, insert, update, delete on public.announcements to authenticated;

-- دفع فوري عند الإدراج (يعيد استخدام الدالة والـ webhook الموجودين)
drop trigger if exists trg_push_announcements on public.announcements;
create trigger trg_push_announcements
  after insert on public.announcements
  for each row execute function public.notify_push_on_insert();
