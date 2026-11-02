-- =============================================================
-- 20260802090034_featured_teachers.sql — ميزة «المدرّس المميّز»
-- حقل featured_until على المدرّس (إداري فقط)؛ يُحسب featured = until > now().
-- يُحمى من التزوير (المدرّس لا يميّز نفسه) عبر protect_teacher_privileged_fields.
-- يُعرَض عبر الدليل والدوال ليتسنّى للواجهة تمييزه وترتيبه أولاً.
-- =============================================================

alter table public.teacher_profiles
  add column if not exists featured_until timestamptz;

-- حماية التزوير: نضيف featured_until إلى الحقول التي تُعاد لقيمها القديمة
-- لأي مستخدم تطبيق عادي (غير أدمن/غير سياق نظام موثوق).
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
  new.featured_until      := old.featured_until;  -- لا يميّز المدرّس نفسه
  return new;
end;
$$;


-- ======================================================================
-- إعادة بناء الدليل والدوال لإضافة عمود featured
-- ======================================================================
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
  coalesce(r.avg_rating, 0)    as avg_rating,
  coalesce(r.rating_count, 0)  as rating_count,
  (tp.featured_until is not null and tp.featured_until > now()) as featured,
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
left join (
  select teacher_id,
         round(avg(rating)::numeric, 1) as avg_rating,
         count(*)::int                  as rating_count
  from public.teacher_ratings
  group by teacher_id
) r on r.teacher_id = tp.user_id
where tp.verification_status = 'approved'
  and not public.is_account_deactivated(tp.user_id)
  and not public.is_banned(tp.user_id)
group by tp.user_id, g.id, r.avg_rating, r.rating_count;

comment on view public.teacher_directory is
  'المدرّسون المقبولون النشطون — أعمدة عامة + متوسّط التقييم + علم التمييز.';

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
  avg_rating       numeric,
  rating_count     integer,
  featured         boolean,
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
    d.latitude, d.longitude, d.answered_count, d.avg_rating, d.rating_count,
    d.featured, d.location_visible, d.subjects, d.stages,
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
  order by d.featured desc, distance_km asc nulls last, d.answered_count desc;
$$;

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
  avg_rating       numeric,
  rating_count     integer,
  featured         boolean,
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
    d.latitude, d.longitude, d.answered_count, d.avg_rating, d.rating_count,
    d.featured, d.subjects, d.stages
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
