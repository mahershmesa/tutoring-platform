-- =============================================================
-- 20260802090012_map_queries.sql
-- استعلامات الخريطة والبحث:
--   * teacher_directory : عرض المدرّسين المقبولين (يحترم RLS)
--   * search_teachers   : قائمة نتائج البحث مرتّبة بالأقرب (تشمل المخفيين)
--   * map_teachers      : نقاط الخريطة (المقبولون + location_visible فقط)
-- =============================================================

-- -------------------------------------------------------------
-- دالة مسافة Haversine (كم) بين نقطتين
-- -------------------------------------------------------------
create or replace function public.haversine_km(
  lat1 double precision, lon1 double precision,
  lat2 double precision, lon2 double precision
)
returns double precision
language sql
immutable
as $$
  select 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2))
      * power(sin(radians(lon2 - lon1) / 2), 2)
  ));
$$;

comment on function public.haversine_km(double precision, double precision, double precision, double precision)
  is 'المسافة التقريبية بالكيلومتر بين إحداثيتين (لترتيب الأقرب).';

-- -------------------------------------------------------------
-- عرض الدليل: مدرّس مقبول واحد لكل صف، مع مواده ومراحله كمصفوفات.
-- security_invoker=on حتى تُطبَّق سياسات RLS بحسب المستخدم الطالب للعرض.
-- -------------------------------------------------------------
create view public.teacher_directory
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
group by tp.user_id, g.id;

comment on view public.teacher_directory is
  'المدرّسون المقبولون مع المواد/المراحل كمصفوفات + إحداثيات المحافظة.';

-- -------------------------------------------------------------
-- البحث (قائمة النتائج): يشمل المخفيين (location_visible=false)،
-- مرتّب بالأقرب لمحافظة الطالب. كل الفلاتر اختيارية (null = تجاهل).
-- -------------------------------------------------------------
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
    d.user_id, d.full_name, d.photo_url, d.governorate_id, d.governorate_name,
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

comment on function public.search_teachers(uuid, smallint, smallint, smallint) is
  'قائمة المدرّسين المقبولين المطابقين، مرتّبة بالأقرب لمحافظة الطالب. تشمل المخفيين.';

-- -------------------------------------------------------------
-- الخريطة (النقاط): المقبولون الذين وافقوا على إظهار الموقع فقط.
-- بيانات خفيفة + إحداثيات النقطة (مركز المحافظة، موقع تقريبي).
-- -------------------------------------------------------------
create or replace function public.map_teachers(
  p_subject_id     uuid     default null,
  p_governorate_id smallint default null
)
returns table (
  user_id          uuid,
  full_name        text,
  photo_url        text,
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
    d.user_id, d.full_name, d.photo_url, d.governorate_id, d.governorate_name,
    d.latitude, d.longitude, d.answered_count, d.subjects, d.stages
  from public.teacher_directory d
  where d.location_visible = true
    and (p_governorate_id is null or d.governorate_id = p_governorate_id)
    and (p_subject_id is null or exists (
      select 1 from public.teacher_subjects ts
      where ts.teacher_id = d.user_id and ts.subject_id = p_subject_id));
$$;

comment on function public.map_teachers(uuid, smallint) is
  'نقاط الخريطة: المدرّسون المقبولون الظاهرون (location_visible=true) مع إحداثياتهم.';

-- -------------------------------------------------------------
-- الصلاحيات: قراءة العرض وتنفيذ الدوال متاحة للعموم (حتى بدون حساب)
-- -------------------------------------------------------------
grant select on public.teacher_directory to anon, authenticated;
grant execute on function public.haversine_km(double precision, double precision, double precision, double precision) to anon, authenticated;
grant execute on function public.search_teachers(uuid, smallint, smallint, smallint) to anon, authenticated;
grant execute on function public.map_teachers(uuid, smallint) to anon, authenticated;
