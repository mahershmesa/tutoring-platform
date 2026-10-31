-- =============================================================
-- 20260802090028_teacher_profile_enrich.sql
-- إثراء بروفايل المدرّس: نبذة + سنوات خبرة + الجنس (لفلتر البحث).
-- حقول عامة (يملكها المدرّس) — تُضاف للدليل العام والدوال.
-- =============================================================

alter table public.teacher_profiles
  add column if not exists bio              text,
  add column if not exists years_experience smallint,
  add column if not exists gender           text
    check (gender in ('male', 'female'));

-- إعادة بناء الدليل والدوال لتشمل الحقول الجديدة (أعمدة عامة فقط، بلا PII).
drop function if exists public.map_teachers(uuid, smallint);
drop function if exists public.search_teachers(uuid, smallint, smallint, smallint);
drop view if exists public.teacher_directory;

create view public.teacher_directory as
select
  tp.user_id,
  tp.full_name,
  tp.photo_url,
  tp.school,
  tp.institute,
  tp.bio,
  tp.years_experience,
  tp.gender,
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

comment on view public.teacher_directory is
  'المدرّسون المقبولون النشطون — أعمدة عامة فقط (نبذة/خبرة/جنس، بلا PII).';

-- قائمة البحث (تشمل المخفيين) + الحقول الجديدة.
create or replace function public.search_teachers(
  p_subject_id          uuid     default null,
  p_governorate_id      smallint default null,
  p_stage_id            smallint default null,
  p_near_governorate_id smallint default null
)
returns table (
  user_id          uuid,
  full_name        text,
  photo_url        text,
  bio              text,
  years_experience smallint,
  gender           text,
  governorate_id   smallint,
  governorate_name text,
  latitude         double precision,
  longitude        double precision,
  answered_count   integer,
  location_visible boolean,
  subjects         text[],
  stages           text[],
  distance_km      double precision
)
language sql
stable
set search_path = public
as $$
  select
    d.user_id, d.full_name, d.photo_url, d.bio, d.years_experience, d.gender,
    d.governorate_id, d.governorate_name,
    d.latitude, d.longitude, d.answered_count, d.location_visible,
    d.subjects, d.stages,
    case
      when ng.id is not null
      then public.haversine_km(ng.latitude, ng.longitude, d.latitude, d.longitude)
      else null
    end as distance_km
  from public.teacher_directory d
  left join public.governorates ng on ng.id = p_near_governorate_id
  where (p_governorate_id is null or d.governorate_id = p_governorate_id)
    and (p_subject_id is null or exists (
      select 1 from public.teacher_subjects ts
      where ts.teacher_id = d.user_id and ts.subject_id = p_subject_id))
    and (p_stage_id is null or exists (
      select 1 from public.teacher_stages tg
      where tg.teacher_id = d.user_id and tg.stage_id = p_stage_id))
  order by distance_km asc nulls last, d.answered_count desc;
$$;

-- نقاط الخريطة + الحقول الجديدة.
create or replace function public.map_teachers(
  p_subject_id     uuid     default null,
  p_governorate_id smallint default null
)
returns table (
  user_id          uuid,
  full_name        text,
  photo_url        text,
  bio              text,
  years_experience smallint,
  gender           text,
  governorate_id   smallint,
  governorate_name text,
  latitude         double precision,
  longitude        double precision,
  answered_count   integer,
  subjects         text[],
  stages           text[]
)
language sql
stable
set search_path = public
as $$
  select
    d.user_id, d.full_name, d.photo_url, d.bio, d.years_experience, d.gender,
    d.governorate_id, d.governorate_name,
    d.latitude, d.longitude, d.answered_count, d.subjects, d.stages
  from public.teacher_directory d
  where d.location_visible = true
    and (p_governorate_id is null or d.governorate_id = p_governorate_id)
    and (p_subject_id is null or exists (
      select 1 from public.teacher_subjects ts
      where ts.teacher_id = d.user_id and ts.subject_id = p_subject_id));
$$;

grant select on public.teacher_directory to anon, authenticated;
grant execute on function public.search_teachers(uuid, smallint, smallint, smallint) to anon, authenticated;
grant execute on function public.map_teachers(uuid, smallint) to anon, authenticated;
