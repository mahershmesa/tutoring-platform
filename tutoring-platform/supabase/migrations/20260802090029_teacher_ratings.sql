-- =============================================================
-- 20260802090029_teacher_ratings.sql — تقييم المدرّسين ⭐
-- تقييم واحد لكل (طالب، مدرّس)، مشروط بتفاعل حقيقي (المدرّس ردّ على الطالب).
-- المتوسّط والعدد يُعرضان عبر الدليل العام.
-- =============================================================

create table if not exists public.teacher_ratings (
  student_id uuid not null references auth.users(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (student_id, teacher_id)
);
create index if not exists idx_teacher_ratings_teacher on public.teacher_ratings (teacher_id);

alter table public.teacher_ratings enable row level security;

-- القراءة عامة (للمتوسّط/العدد/التعليقات)
drop policy if exists "ratings are public" on public.teacher_ratings;
create policy "ratings are public"
  on public.teacher_ratings for select
  to anon, authenticated
  using (true);

-- التقييم: الطالب فقط، وبشرط أن المدرّس ردّ عليه فعلاً (تفاعل حقيقي)
drop policy if exists "student rates an interacted teacher" on public.teacher_ratings;
create policy "student rates an interacted teacher"
  on public.teacher_ratings for insert
  to authenticated
  with check (
    auth.uid() = student_id
    and student_id <> teacher_id
    and exists (
      select 1 from public.messages m
      where m.sender_id = teacher_id and m.recipient_id = student_id
    )
  );

-- التحديث: صاحب التقييم، بنفس شرط التفاعل
drop policy if exists "student updates own rating" on public.teacher_ratings;
create policy "student updates own rating"
  on public.teacher_ratings for update
  to authenticated
  using (auth.uid() = student_id)
  with check (
    auth.uid() = student_id
    and student_id <> teacher_id
    and exists (
      select 1 from public.messages m
      where m.sender_id = teacher_id and m.recipient_id = student_id
    )
  );

-- الحذف: صاحب التقييم أو الإدارة (إشراف)
drop policy if exists "owner or admin deletes rating" on public.teacher_ratings;
create policy "owner or admin deletes rating"
  on public.teacher_ratings for delete
  to authenticated
  using (auth.uid() = student_id or public.is_admin());

-- صلاحيات الجدول (في حال لم تُطبَّق الصلاحيات الافتراضية على جدول أُنشئ يدوياً)
grant select on public.teacher_ratings to anon, authenticated;
grant insert, update, delete on public.teacher_ratings to authenticated;


-- ======================================================================
-- إعادة بناء الدليل والدوال لإضافة المتوسّط والعدد
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
group by tp.user_id, g.id, r.avg_rating, r.rating_count;

comment on view public.teacher_directory is
  'المدرّسون المقبولون النشطون — أعمدة عامة فقط + متوسّط التقييم والعدد.';

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
    d.location_visible, d.subjects, d.stages,
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
    d.subjects, d.stages
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
