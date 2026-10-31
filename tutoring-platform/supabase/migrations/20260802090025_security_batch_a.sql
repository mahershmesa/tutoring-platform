-- =============================================================
-- 20260802090025_security_batch_a.sql — دفعة الأمان (أ)
-- (#1 CRITICAL) منع توثيق الذات: حارس إدراج على teacher_profiles.
-- (#2 HIGH) منع تسريب PII للعامة: إلغاء القراءة العامة المباشرة للجدول،
--           وإعادة بناء الدليل كـ definer بأعمدة عامة فقط.
-- (#4 HIGH) تحصين استرجاع كلمة المرور: حدّ معدّل لكل IP + إصلاح عدّاد القفل.
-- =============================================================


-- ======================================================================
-- (#1) حارس إدراج بروفايل المدرّس — لا توثيق ذاتي
-- ======================================================================
-- لا مسار تطبيقي شرعي يُدرج teacher_profiles من العميل (التسجيل يُنشئه عبر
-- تريغر SECURITY DEFINER، و saveTeacherProfile يستعمل UPDATE فقط). لذا نفرض
-- عند أي إدراج من أدوار التطبيق قيمَ البداية الآمنة.
create or replace function public.clamp_teacher_insert()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon')
     and not public.is_admin()
     and coalesce(current_setting('app.privileged_write', true), '') <> 'on'
  then
    new.verification_status := 'pending';
    new.answered_count := 0;
  end if;
  return new;
end;
$$;

create trigger trg_clamp_teacher_insert
  before insert on public.teacher_profiles
  for each row execute function public.clamp_teacher_insert();

-- دفاع بالعمق على مستوى السياسة: الإدراج المباشر لازم يكون pending/0.
drop policy if exists "teacher inserts own profile" on public.teacher_profiles;
create policy "teacher inserts own pending profile"
  on public.teacher_profiles for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and verification_status = 'pending'
    and answered_count = 0
  );


-- ======================================================================
-- (#2) منع تسريب بيانات المدرّسين الشخصية للزوّار
-- ======================================================================
-- إلغاء القراءة العامة المباشرة للجدول (كانت تكشف كل الأعمدة — هاتف/إيميل/
-- تلغرام/انستغرام/مسار وثيقة الهوية — لـ anon، وتتجاوز إخفاء الموقع والتعطيل).
drop policy if exists "approved teachers are public" on public.teacher_profiles;

-- إعادة بناء الدليل والدوال: الدليل الآن view بصلاحيات مالكه (definer) يقرأ
-- الجدول داخلياً، فيخدم الزوّار دون سياسة قراءة عامة، ويكشف أعمدة عامة فقط
-- (بلا هاتف/إيميل/تلغرام/انستغرام/وثيقة هوية)، ويستثني المعطّلين.
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
  'المدرّسون المقبولون النشطون — أعمدة عامة فقط (بلا PII). definer: يقرأ الجدول داخلياً.';

-- قائمة البحث (تشمل المخفيين) — نفس المنطق، أعمدة عامة فقط.
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

-- نقاط الخريطة (المقبولون الظاهرون فقط).
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

grant select on public.teacher_directory to anon, authenticated;
grant execute on function public.search_teachers(uuid, smallint, smallint, smallint) to anon, authenticated;
grant execute on function public.map_teachers(uuid, smallint) to anon, authenticated;


-- ======================================================================
-- (#4) تحصين استرجاع كلمة المرور — حدّ معدّل لكل IP
-- ======================================================================
create table public.reset_attempts (
  id         bigserial primary key,
  ip         text not null,
  created_at timestamptz not null default now()
);
create index idx_reset_attempts_ip_time on public.reset_attempts (ip, created_at);
alter table public.reset_attempts enable row level security;
-- بلا سياسات: لا وصول لأي دور تطبيقي. يُقرأ/يُكتب عبر الدالة (service_role) فقط.

-- يرجّع true إذا مسموح (ويُسجّل المحاولة)، false إذا تجاوز الحدّ.
create or replace function public.check_reset_rate_limit(
  p_ip     text,
  p_max    integer  default 10,
  p_window interval default interval '1 hour'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  c integer;
begin
  delete from public.reset_attempts where created_at < now() - interval '1 day';
  select count(*) into c
    from public.reset_attempts
    where ip = p_ip and created_at > now() - p_window;
  if c >= p_max then
    return false;
  end if;
  insert into public.reset_attempts (ip) values (p_ip);
  return true;
end;
$$;

revoke all on function public.check_reset_rate_limit(text, integer, interval) from public;
grant execute on function public.check_reset_rate_limit(text, integer, interval) to service_role;

-- إصلاح تجميلي: عند انتهاء مدة القفل، صفّر عدّاد المحاولات (نافذة جديدة).
create or replace function public.check_security_answer(p_user_id uuid, p_answer text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  rec public.security_credentials;
begin
  select * into rec from public.security_credentials where user_id = p_user_id;
  if not found then
    return 'notset';
  end if;
  if rec.locked_until is not null and rec.locked_until > now() then
    return 'locked';
  end if;
  -- انتهى القفل: ابدأ نافذة جديدة
  if rec.locked_until is not null and rec.locked_until <= now() then
    update public.security_credentials
      set failed_attempts = 0, locked_until = null where user_id = p_user_id;
    rec.failed_attempts := 0;
  end if;
  if rec.answer_hash = crypt(public.norm_answer(p_answer), rec.answer_hash) then
    update public.security_credentials
      set failed_attempts = 0, locked_until = null where user_id = p_user_id;
    return 'ok';
  else
    update public.security_credentials
      set failed_attempts = failed_attempts + 1,
          locked_until = case when failed_attempts + 1 >= 5
                              then now() + interval '15 minutes' else locked_until end
      where user_id = p_user_id;
    return 'wrong';
  end if;
end;
$$;

revoke all on function public.check_security_answer(uuid, text) from public;
grant execute on function public.check_security_answer(uuid, text) to service_role;
