-- =============================================================
-- 20260802090035_teacher_views.sql — تتبّع مشاهدات ملف المدرّس (للإحصاءات)
-- المدرّس يرى عدّاد مشاهدات ملفه. التسجيل عبر دالة definer فقط (لا إدراج
-- مباشر من العميل)، مع استبعاد مشاهدة المدرّس لنفسه وحدّ تكرار بسيط.
-- =============================================================

create table if not exists public.teacher_views (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  viewer_id  uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_teacher_views_teacher
  on public.teacher_views (teacher_id, created_at desc);

alter table public.teacher_views enable row level security;

-- المدرّس يقرأ مشاهدات ملفه فقط (للإحصاء). لا إدراج/تعديل من أي عميل.
drop policy if exists "teacher reads own views" on public.teacher_views;
create policy "teacher reads own views"
  on public.teacher_views for select
  to authenticated
  using (auth.uid() = teacher_id);

grant select on public.teacher_views to authenticated;

-- تسجيل مشاهدة (SECURITY DEFINER — المصدر الوحيد للإدراج).
create or replace function public.record_teacher_view(p_teacher uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer uuid := auth.uid();
begin
  -- المدرّس لا يُحتسب على نفسه
  if v_viewer is not null and v_viewer = p_teacher then
    return;
  end if;
  -- لا نسجّل لمدرّس غير موجود
  if not exists (select 1 from public.teacher_profiles where user_id = p_teacher) then
    return;
  end if;
  -- حدّ تكرار للمشاهد المسجّل: مشاهدة واحدة لكل مدرّس خلال الساعة
  if v_viewer is not null and exists (
    select 1 from public.teacher_views
    where teacher_id = p_teacher and viewer_id = v_viewer
      and created_at > now() - interval '1 hour'
  ) then
    return;
  end if;
  insert into public.teacher_views (teacher_id, viewer_id)
  values (p_teacher, v_viewer);
end;
$$;
revoke all on function public.record_teacher_view(uuid) from public;
grant execute on function public.record_teacher_view(uuid) to anon, authenticated;
