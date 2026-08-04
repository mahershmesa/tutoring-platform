-- =============================================================
-- 20260802090021_account_deactivation.sql
-- تعطيل الحساب (soft): المستخدم يعطّل/يعيد تفعيل حسابه بنفسه.
-- المدرّس المعطّل يختفي من الخريطة والبحث.
-- =============================================================

create table public.account_status (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  deactivated boolean not null default false,
  updated_at  timestamptz not null default now()
);

alter table public.account_status enable row level security;

create policy "owner manages own status"
  on public.account_status for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "admin reads all status"
  on public.account_status for select
  to authenticated
  using (public.is_admin());

-- دالة تحقّق (SECURITY DEFINER) حتى يعمل الاستثناء حتى للزوّار (anon)
-- الذين لا يقرؤون account_status مباشرةً.
create or replace function public.is_account_deactivated(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select deactivated from public.account_status where user_id = uid),
    false
  );
$$;

-- إعادة تعريف دليل المدرّسين لاستثناء المعطّلين
create or replace view public.teacher_directory
with (security_invoker = on) as
select
  tp.user_id,
  tp.full_name,
  tp.photo_url,
  tp.school,
  tp.institute,
  tp.phone,
  tp.telegram_url,
  tp.instagram_url,
  tp.contact_email,
  tp.answered_count,
  tp.location_visible,
  tp.governorate_id,
  g.name      as governorate_name,
  g.latitude,
  g.longitude,
  coalesce(array_agg(distinct s.name)  filter (where s.name  is not null), '{}') as subjects,
  coalesce(array_agg(distinct st.name) filter (where st.name is not null), '{}') as stages
from public.teacher_profiles tp
join public.governorates g          on g.id = tp.governorate_id
left join public.teacher_subjects tsub on tsub.teacher_id = tp.user_id
left join public.subjects s          on s.id = tsub.subject_id
left join public.teacher_stages tst  on tst.teacher_id = tp.user_id
left join public.stages st           on st.id = tst.stage_id
where tp.verification_status = 'approved'
  and not public.is_account_deactivated(tp.user_id)
group by tp.user_id, g.id;
