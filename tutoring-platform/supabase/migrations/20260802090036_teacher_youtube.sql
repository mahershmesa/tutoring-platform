-- =============================================================
-- 20260802090036_teacher_youtube.sql — رابط قناة يوتيوب للمدرّس
-- عمود youtube_url (يملؤه المدرّس في بروفايله)، ويُعرَض على صفحته العامة.
-- نضيفه إلى teacher_directory (رابط ترويجي عام، لا PII) دون لمس الدوال
-- (create or replace view يضيف العمود في النهاية فقط).
-- =============================================================

alter table public.teacher_profiles
  add column if not exists youtube_url text;

create or replace view public.teacher_directory as
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
  coalesce(array_agg(distinct st.name) filter (where st.name is not null), '{}') as stages,
  tp.youtube_url
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
