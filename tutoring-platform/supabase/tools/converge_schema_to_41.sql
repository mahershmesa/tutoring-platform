-- =============================================================
-- دليلي — ملف «المطابقة»: يعيد فرض المخطط الأمني الكامل كما في الريبو
-- (كل الدوال + التريغرات + السياسات + العروض + حدود التخزين).
-- السبب: قاعدة الإنتاج تفتقد دفعات أمنية قديمة (16 و25) لم تُطبَّق.
-- * لا يحذف ولا يعدّل أي بيانات. * آمن للتكرار.
-- * كل قسم مستقل: فشل قسم لا يُلغي الباقي.
-- * النتيجة جدول قصير: الأقسام الفاشلة (إن وُجدت) + أي فرق متبقٍّ + ملخّص.
-- =============================================================

drop table if exists dalili_report, dalili_exp_fn, dalili_exp_trg, dalili_exp_pol, dalili_exp_col, dalili_exp_idx;
create temp table dalili_report (ord serial, kind text, item text, detail text);

create or replace function pg_temp.dalili_run(p_name text, p_sql text) returns void
language plpgsql as $run$
begin
  begin
    execute p_sql;
    insert into dalili_report(kind, item, detail) values ('section', p_name, 'OK');
  exception when others then
    insert into dalili_report(kind, item, detail)
    values ('section', p_name, 'FAILED: ' || sqlstate || ' ' || sqlerrm);
  end;
end;
$run$;

select pg_temp.dalili_run('columns: account_status', $dalili$
alter table public.account_status add column if not exists "user_id" uuid;
alter table public.account_status add column if not exists "deactivated" boolean default false not null;
alter table public.account_status add column if not exists "updated_at" timestamp with time zone default now() not null;
alter table public.account_status add column if not exists "banned" boolean default false not null;
$dalili$);

select pg_temp.dalili_run('columns: ads', $dalili$
alter table public.ads add column if not exists "id" uuid default gen_random_uuid() not null;
alter table public.ads add column if not exists "image_url" text;
alter table public.ads add column if not exists "caption" text;
alter table public.ads add column if not exists "sort_order" integer default 0 not null;
alter table public.ads add column if not exists "active" boolean default true not null;
alter table public.ads add column if not exists "created_at" timestamp with time zone default now() not null;
alter table public.ads add column if not exists "contact_info" text;
$dalili$);

select pg_temp.dalili_run('columns: announcements', $dalili$
alter table public.announcements add column if not exists "id" uuid default gen_random_uuid() not null;
alter table public.announcements add column if not exists "audience" text;
alter table public.announcements add column if not exists "target_user_id" uuid;
alter table public.announcements add column if not exists "kind" text default 'announcement'::text not null;
alter table public.announcements add column if not exists "title" text;
alter table public.announcements add column if not exists "body" text;
alter table public.announcements add column if not exists "active" boolean default true not null;
alter table public.announcements add column if not exists "created_at" timestamp with time zone default now() not null;
$dalili$);

select pg_temp.dalili_run('columns: app_config', $dalili$
alter table public.app_config add column if not exists "key" text;
alter table public.app_config add column if not exists "value" text;
$dalili$);

select pg_temp.dalili_run('columns: exam_papers', $dalili$
alter table public.exam_papers add column if not exists "id" uuid default gen_random_uuid() not null;
alter table public.exam_papers add column if not exists "teacher_id" uuid;
alter table public.exam_papers add column if not exists "subject_id" uuid;
alter table public.exam_papers add column if not exists "stage_id" smallint;
alter table public.exam_papers add column if not exists "year" smallint;
alter table public.exam_papers add column if not exists "title" text;
alter table public.exam_papers add column if not exists "file_path" text;
alter table public.exam_papers add column if not exists "file_mime" text;
alter table public.exam_papers add column if not exists "file_name" text;
alter table public.exam_papers add column if not exists "created_at" timestamp with time zone default now() not null;
$dalili$);

select pg_temp.dalili_run('columns: governorates', $dalili$
alter table public.governorates add column if not exists "id" smallint;
alter table public.governorates add column if not exists "name" text;
alter table public.governorates add column if not exists "latitude" double precision;
alter table public.governorates add column if not exists "longitude" double precision;
$dalili$);

select pg_temp.dalili_run('columns: messages', $dalili$
alter table public.messages add column if not exists "id" uuid default gen_random_uuid() not null;
alter table public.messages add column if not exists "question_id" uuid;
alter table public.messages add column if not exists "sender_id" uuid;
alter table public.messages add column if not exists "body" text;
alter table public.messages add column if not exists "sent_at" timestamp with time zone default now() not null;
alter table public.messages add column if not exists "recipient_id" uuid;
alter table public.messages add column if not exists "attachment_path" text;
alter table public.messages add column if not exists "attachment_mime" text;
alter table public.messages add column if not exists "attachment_name" text;
$dalili$);

select pg_temp.dalili_run('columns: news', $dalili$
alter table public.news add column if not exists "id" uuid default gen_random_uuid() not null;
alter table public.news add column if not exists "image_url" text;
alter table public.news add column if not exists "caption" text;
alter table public.news add column if not exists "created_at" timestamp with time zone default now() not null;
$dalili$);

select pg_temp.dalili_run('columns: notifications', $dalili$
alter table public.notifications add column if not exists "id" uuid default gen_random_uuid() not null;
alter table public.notifications add column if not exists "question_id" uuid;
alter table public.notifications add column if not exists "teacher_id" uuid;
alter table public.notifications add column if not exists "status" notification_status default 'sent'::notification_status not null;
alter table public.notifications add column if not exists "sent_at" timestamp with time zone default now() not null;
$dalili$);

select pg_temp.dalili_run('columns: push_subscriptions', $dalili$
alter table public.push_subscriptions add column if not exists "endpoint" text;
alter table public.push_subscriptions add column if not exists "user_id" uuid;
alter table public.push_subscriptions add column if not exists "p256dh" text;
alter table public.push_subscriptions add column if not exists "auth" text;
alter table public.push_subscriptions add column if not exists "created_at" timestamp with time zone default now() not null;
$dalili$);

select pg_temp.dalili_run('columns: questions', $dalili$
alter table public.questions add column if not exists "id" uuid default gen_random_uuid() not null;
alter table public.questions add column if not exists "student_id" uuid;
alter table public.questions add column if not exists "subject_id" uuid;
alter table public.questions add column if not exists "stage_id" smallint;
alter table public.questions add column if not exists "governorate_id" smallint;
alter table public.questions add column if not exists "question_text" text;
alter table public.questions add column if not exists "status" question_status default 'open'::question_status not null;
alter table public.questions add column if not exists "created_at" timestamp with time zone default now() not null;
alter table public.questions add column if not exists "attachment_path" text;
alter table public.questions add column if not exists "attachment_mime" text;
alter table public.questions add column if not exists "attachment_name" text;
$dalili$);

select pg_temp.dalili_run('columns: quiz_attempts', $dalili$
alter table public.quiz_attempts add column if not exists "id" uuid default gen_random_uuid() not null;
alter table public.quiz_attempts add column if not exists "quiz_id" uuid;
alter table public.quiz_attempts add column if not exists "student_id" uuid;
alter table public.quiz_attempts add column if not exists "score" smallint;
alter table public.quiz_attempts add column if not exists "total" smallint;
alter table public.quiz_attempts add column if not exists "created_at" timestamp with time zone default now() not null;
$dalili$);

select pg_temp.dalili_run('columns: quiz_questions', $dalili$
alter table public.quiz_questions add column if not exists "id" uuid default gen_random_uuid() not null;
alter table public.quiz_questions add column if not exists "quiz_id" uuid;
alter table public.quiz_questions add column if not exists "prompt" text;
alter table public.quiz_questions add column if not exists "options" jsonb;
alter table public.quiz_questions add column if not exists "correct_index" smallint;
alter table public.quiz_questions add column if not exists "sort_order" integer default 0 not null;
$dalili$);

select pg_temp.dalili_run('columns: quizzes', $dalili$
alter table public.quizzes add column if not exists "id" uuid default gen_random_uuid() not null;
alter table public.quizzes add column if not exists "teacher_id" uuid;
alter table public.quizzes add column if not exists "subject_id" uuid;
alter table public.quizzes add column if not exists "stage_id" smallint;
alter table public.quizzes add column if not exists "chapter" text;
alter table public.quizzes add column if not exists "title" text;
alter table public.quizzes add column if not exists "created_at" timestamp with time zone default now() not null;
$dalili$);

select pg_temp.dalili_run('columns: referral_codes', $dalili$
alter table public.referral_codes add column if not exists "user_id" uuid;
alter table public.referral_codes add column if not exists "code" text;
alter table public.referral_codes add column if not exists "created_at" timestamp with time zone default now() not null;
$dalili$);

select pg_temp.dalili_run('columns: referrals', $dalili$
alter table public.referrals add column if not exists "id" uuid default gen_random_uuid() not null;
alter table public.referrals add column if not exists "referrer_id" uuid;
alter table public.referrals add column if not exists "referred_id" uuid;
alter table public.referrals add column if not exists "code" text;
alter table public.referrals add column if not exists "created_at" timestamp with time zone default now() not null;
$dalili$);

select pg_temp.dalili_run('columns: reports', $dalili$
alter table public.reports add column if not exists "id" uuid default gen_random_uuid() not null;
alter table public.reports add column if not exists "reporter_id" uuid;
alter table public.reports add column if not exists "reported_id" uuid;
alter table public.reports add column if not exists "context_type" text;
alter table public.reports add column if not exists "context_id" uuid;
alter table public.reports add column if not exists "reason" text;
alter table public.reports add column if not exists "status" text default 'open'::text not null;
alter table public.reports add column if not exists "created_at" timestamp with time zone default now() not null;
$dalili$);

select pg_temp.dalili_run('columns: reset_attempts', $dalili$
alter table public.reset_attempts add column if not exists "ip" text;
alter table public.reset_attempts add column if not exists "created_at" timestamp with time zone default now() not null;
$dalili$);

select pg_temp.dalili_run('columns: security_credentials', $dalili$
alter table public.security_credentials add column if not exists "user_id" uuid;
alter table public.security_credentials add column if not exists "question" text;
alter table public.security_credentials add column if not exists "answer_hash" text;
alter table public.security_credentials add column if not exists "failed_attempts" integer default 0 not null;
alter table public.security_credentials add column if not exists "locked_until" timestamp with time zone;
alter table public.security_credentials add column if not exists "updated_at" timestamp with time zone default now() not null;
$dalili$);

select pg_temp.dalili_run('columns: stages', $dalili$
alter table public.stages add column if not exists "id" smallint;
alter table public.stages add column if not exists "name" text;
alter table public.stages add column if not exists "sort_order" smallint;
$dalili$);

select pg_temp.dalili_run('columns: student_profiles', $dalili$
alter table public.student_profiles add column if not exists "user_id" uuid;
alter table public.student_profiles add column if not exists "full_name" text;
alter table public.student_profiles add column if not exists "phone" text;
alter table public.student_profiles add column if not exists "governorate_id" smallint;
alter table public.student_profiles add column if not exists "stage_id" smallint;
alter table public.student_profiles add column if not exists "id_document_url" text;
alter table public.student_profiles add column if not exists "created_at" timestamp with time zone default now() not null;
alter table public.student_profiles add column if not exists "updated_at" timestamp with time zone default now() not null;
$dalili$);

select pg_temp.dalili_run('columns: subjects', $dalili$
alter table public.subjects add column if not exists "id" uuid default gen_random_uuid() not null;
alter table public.subjects add column if not exists "name" text;
alter table public.subjects add column if not exists "active" boolean default true not null;
alter table public.subjects add column if not exists "created_by" uuid;
alter table public.subjects add column if not exists "created_at" timestamp with time zone default now() not null;
$dalili$);

select pg_temp.dalili_run('columns: teacher_profiles', $dalili$
alter table public.teacher_profiles add column if not exists "user_id" uuid;
alter table public.teacher_profiles add column if not exists "full_name" text;
alter table public.teacher_profiles add column if not exists "phone" text;
alter table public.teacher_profiles add column if not exists "school" text;
alter table public.teacher_profiles add column if not exists "institute" text;
alter table public.teacher_profiles add column if not exists "governorate_id" smallint;
alter table public.teacher_profiles add column if not exists "telegram_url" text;
alter table public.teacher_profiles add column if not exists "instagram_url" text;
alter table public.teacher_profiles add column if not exists "contact_email" text;
alter table public.teacher_profiles add column if not exists "photo_url" text;
alter table public.teacher_profiles add column if not exists "id_document_url" text;
alter table public.teacher_profiles add column if not exists "location_visible" boolean default false not null;
alter table public.teacher_profiles add column if not exists "verification_status" verification_status default 'pending'::verification_status not null;
alter table public.teacher_profiles add column if not exists "answered_count" integer default 0 not null;
alter table public.teacher_profiles add column if not exists "created_at" timestamp with time zone default now() not null;
alter table public.teacher_profiles add column if not exists "updated_at" timestamp with time zone default now() not null;
alter table public.teacher_profiles add column if not exists "bio" text;
alter table public.teacher_profiles add column if not exists "years_experience" smallint;
alter table public.teacher_profiles add column if not exists "gender" text;
alter table public.teacher_profiles add column if not exists "featured_until" timestamp with time zone;
alter table public.teacher_profiles add column if not exists "youtube_url" text;
alter table public.teacher_profiles add column if not exists "views_base" integer default 0 not null;
$dalili$);

select pg_temp.dalili_run('columns: teacher_ratings', $dalili$
alter table public.teacher_ratings add column if not exists "student_id" uuid;
alter table public.teacher_ratings add column if not exists "teacher_id" uuid;
alter table public.teacher_ratings add column if not exists "rating" smallint;
alter table public.teacher_ratings add column if not exists "comment" text;
alter table public.teacher_ratings add column if not exists "created_at" timestamp with time zone default now() not null;
alter table public.teacher_ratings add column if not exists "updated_at" timestamp with time zone default now() not null;
$dalili$);

select pg_temp.dalili_run('columns: teacher_stages', $dalili$
alter table public.teacher_stages add column if not exists "teacher_id" uuid;
alter table public.teacher_stages add column if not exists "stage_id" smallint;
$dalili$);

select pg_temp.dalili_run('columns: teacher_subjects', $dalili$
alter table public.teacher_subjects add column if not exists "teacher_id" uuid;
alter table public.teacher_subjects add column if not exists "subject_id" uuid;
$dalili$);

select pg_temp.dalili_run('columns: teacher_views', $dalili$
alter table public.teacher_views add column if not exists "id" uuid default gen_random_uuid() not null;
alter table public.teacher_views add column if not exists "teacher_id" uuid;
alter table public.teacher_views add column if not exists "viewer_id" uuid;
alter table public.teacher_views add column if not exists "created_at" timestamp with time zone default now() not null;
$dalili$);

select pg_temp.dalili_run('columns: user_roles', $dalili$
alter table public.user_roles add column if not exists "user_id" uuid;
alter table public.user_roles add column if not exists "role" user_role;
alter table public.user_roles add column if not exists "granted_at" timestamp with time zone default now() not null;
alter table public.user_roles add column if not exists "active" boolean default true not null;
alter table public.user_roles add column if not exists "super" boolean default false not null;
$dalili$);

select pg_temp.dalili_run('rls: enable on all tables', $dalili$
alter table public.account_status enable row level security;
alter table public.ads enable row level security;
alter table public.announcements enable row level security;
alter table public.app_config enable row level security;
alter table public.exam_papers enable row level security;
alter table public.governorates enable row level security;
alter table public.messages enable row level security;
alter table public.news enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quizzes enable row level security;
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
alter table public.reports enable row level security;
alter table public.reset_attempts enable row level security;
alter table public.security_credentials enable row level security;
alter table public.stages enable row level security;
alter table public.student_profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.teacher_ratings enable row level security;
alter table public.teacher_stages enable row level security;
alter table public.teacher_subjects enable row level security;
alter table public.teacher_views enable row level security;
alter table public.user_roles enable row level security;
$dalili$);

select pg_temp.dalili_run('function: can_access_message_attachment(text)', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.can_access_message_attachment(object_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  parts text[];
  qid uuid;
  tid text;
begin
  parts := storage.foldername(object_name);
  if parts is null or array_length(parts, 1) < 1 then
    return false;
  end if;
  begin
    qid := parts[1]::uuid;
  exception when others then
    return false;
  end;
  tid := parts[2];

  if public.is_admin() then
    return true;
  end if;
  if public.owns_question(qid) then
    return true;
  end if;
  if tid is not null and tid = auth.uid()::text
     and public.is_notified_teacher(qid) then
    return true;
  end if;
  return false;
end;
$function$;
revoke all on function public.can_access_message_attachment(text) from public, anon, authenticated, service_role;
grant execute on function public.can_access_message_attachment(text) to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: can_access_question_attachment(text)', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.can_access_question_attachment(object_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  parts text[];
  qid uuid;
begin
  parts := storage.foldername(object_name);
  if parts is null or array_length(parts, 1) < 1 then
    return false;
  end if;
  begin
    qid := parts[1]::uuid;
  exception when others then
    return false;
  end;
  return public.is_admin()
      or public.owns_question(qid)
      or public.is_notified_teacher(qid);
end;
$function$;
revoke all on function public.can_access_question_attachment(text) from public, anon, authenticated, service_role;
grant execute on function public.can_access_question_attachment(text) to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: check_reset_rate_limit(text,integer,interval)', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.check_reset_rate_limit(p_ip text, p_max integer DEFAULT 10, p_window interval DEFAULT '01:00:00'::interval)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
revoke all on function public.check_reset_rate_limit(text,integer,interval) from public, anon, authenticated, service_role;
grant execute on function public.check_reset_rate_limit(text,integer,interval) to service_role;
$dalili$);

select pg_temp.dalili_run('function: check_security_answer(uuid,text)', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.check_security_answer(p_user_id uuid, p_answer text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$;
revoke all on function public.check_security_answer(uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.check_security_answer(uuid,text) to service_role;
$dalili$);

select pg_temp.dalili_run('function: clamp_teacher_insert()', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.clamp_teacher_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;
revoke all on function public.clamp_teacher_insert() from public, anon, authenticated, service_role;
grant execute on function public.clamp_teacher_insert() to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: enforce_message_integrity()', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.enforce_message_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  recent integer;
begin
  new.sent_at := now(); -- لا ثقة بزمن العميل
  select count(*) into recent
  from public.messages
  where sender_id = new.sender_id
    and sent_at > now() - interval '1 hour';
  if recent >= 100 then
    raise exception 'تجاوزت حدّ الرسائل المسموح. حاول لاحقاً.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$function$;
revoke all on function public.enforce_message_integrity() from public, anon, authenticated, service_role;
grant execute on function public.enforce_message_integrity() to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: enforce_question_integrity()', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.enforce_question_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  sp record;
begin
  -- #8 لا ثقة بزمن العميل (يمنع تجاوز حدّ المعدّل بتواريخ قديمة)
  new.created_at := now();

  -- #9 المرحلة والمحافظة تُشتقّان من بروفايل الطالب (لا من حمولة العميل)
  select governorate_id, stage_id into sp
  from public.student_profiles
  where user_id = new.student_id;

  if sp.governorate_id is null or sp.stage_id is null then
    raise exception 'أكمل محافظتك ومرحلتك في البروفايل أولاً.'
      using errcode = 'check_violation';
  end if;

  new.governorate_id := sp.governorate_id;
  new.stage_id := sp.stage_id;
  return new;
end;
$function$;
revoke all on function public.enforce_question_integrity() from public, anon, authenticated, service_role;
grant execute on function public.enforce_question_integrity() to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: enforce_question_rate_limit()', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.enforce_question_rate_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  recent_count integer;
begin
  select count(*) into recent_count
  from public.questions
  where student_id = new.student_id
    and created_at > now() - interval '1 hour';

  if recent_count >= 20 then
    raise exception 'تجاوزت الحد المسموح من الأسئلة. حاول لاحقاً.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$function$;
revoke all on function public.enforce_question_rate_limit() from public, anon, authenticated, service_role;
grant execute on function public.enforce_question_rate_limit() to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: fanout_question_notifications()', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.fanout_question_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.notifications (question_id, teacher_id)
  select new.id, tp.user_id
  from public.teacher_profiles tp
  join public.teacher_subjects ts
    on ts.teacher_id = tp.user_id and ts.subject_id = new.subject_id
  join public.teacher_stages tg
    on tg.teacher_id = tp.user_id and tg.stage_id = new.stage_id
  where tp.verification_status = 'approved'
    and tp.governorate_id = new.governorate_id
    and not public.is_account_deactivated(tp.user_id)
  on conflict (question_id, teacher_id) do nothing;
  return new;
end;
$function$;
revoke all on function public.fanout_question_notifications() from public, anon, authenticated, service_role;
grant execute on function public.fanout_question_notifications() to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: grade_quiz(uuid,jsonb)', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.grade_quiz(p_quiz_id uuid, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid     uuid := auth.uid();
  v_total   int := 0;
  v_score   int := 0;
  v_results jsonb := '[]'::jsonb;
  r         record;
  v_ans     int;
begin
  if v_uid is null then raise exception 'unauthorized'; end if;
  if (
    select count(*) from public.quiz_attempts
    where student_id = v_uid and created_at > now() - interval '1 hour'
  ) >= 60 then
    raise exception 'محاولات كثيرة. خذ استراحة ثم حاول مجدداً.'
      using errcode = 'check_violation';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    p_answers := '{}'::jsonb;
  end if;

  for r in
    select id, correct_index from public.quiz_questions
    where quiz_id = p_quiz_id order by sort_order
  loop
    v_total := v_total + 1;
    begin
      v_ans := nullif(p_answers ->> r.id::text, '')::int;
    exception when others then
      v_ans := null;
    end;
    if v_ans is not null and v_ans = r.correct_index then
      v_score := v_score + 1;
    end if;
    v_results := v_results || jsonb_build_object(
      'question_id', r.id,
      'correct_index', r.correct_index,
      'chosen', v_ans
    );
  end loop;

  if v_total = 0 then
    return jsonb_build_object('error', 'no_questions');
  end if;

  insert into public.quiz_attempts (quiz_id, student_id, score, total)
  values (p_quiz_id, v_uid, v_score, v_total);

  return jsonb_build_object('score', v_score, 'total', v_total, 'results', v_results);
end;
$function$;
revoke all on function public.grade_quiz(uuid,jsonb) from public, anon, authenticated, service_role;
grant execute on function public.grade_quiz(uuid,jsonb) to authenticated, service_role;
$dalili$);

select pg_temp.dalili_run('function: guard_notification_answer()', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.guard_notification_answer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.status = 'answered' and old.status is distinct from 'answered' then
    -- auth.uid() = null → سياق خادم/خدمة (service_role) نثق به.
    -- الإدارة مسموحة. غير ذلك: يجب أن يكون المُحدِّث صاحب السؤال.
    if auth.uid() is not null and not public.is_admin() then
      if not exists (
        select 1 from public.questions q
        where q.id = new.question_id
          and q.student_id = auth.uid()
      ) then
        raise exception 'only the question owner may confirm an answer'
          using errcode = 'insufficient_privilege';
      end if;
    end if;
  end if;
  return new;
end;
$function$;
revoke all on function public.guard_notification_answer() from public, anon, authenticated, service_role;
grant execute on function public.guard_notification_answer() to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: guard_notification_keys()', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.guard_notification_keys()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if current_user in ('authenticated', 'anon') then
    -- لا إعادة توجيه الإشعار لسؤال/مدرّس آخر
    new.teacher_id  := old.teacher_id;
    new.question_id := old.question_id;
    new.sent_at     := old.sent_at;
    -- التأكيد يُحتسب مرّة واحدة: بعد answered لا تتغيّر الحالة
    if old.status = 'answered' then
      new.status := 'answered';
    end if;
  end if;
  return new;
end;
$function$;
revoke all on function public.guard_notification_keys() from public, anon, authenticated, service_role;
grant execute on function public.guard_notification_keys() to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: guard_push_endpoint()', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.guard_push_endpoint()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_allowed_push_endpoint(new.endpoint) then
    raise exception 'نقطة دفع غير مسموحة.'
      using errcode = 'check_violation';
  end if;
  if tg_op = 'INSERT' and current_user in ('authenticated', 'anon') then
    if (
      select count(*) from public.push_subscriptions where user_id = new.user_id
    ) >= 10 then
      raise exception 'وصلت الحدّ الأقصى للأجهزة المشتركة بالإشعارات.'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$function$;
revoke all on function public.guard_push_endpoint() from public, anon, authenticated, service_role;
grant execute on function public.guard_push_endpoint() to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: guard_question_keys()', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.guard_question_keys()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if current_user in ('authenticated', 'anon') then
    new.student_id     := old.student_id;
    new.subject_id     := old.subject_id;
    new.stage_id       := old.stage_id;
    new.governorate_id := old.governorate_id;
    new.created_at     := old.created_at;
  end if;
  return new;
end;
$function$;
revoke all on function public.guard_question_keys() from public, anon, authenticated, service_role;
grant execute on function public.guard_question_keys() to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: guard_report_insert()', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.guard_report_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if current_user in ('authenticated', 'anon') then
    new.status := 'open';
    new.created_at := now();
    if (
      select count(*) from public.reports
      where reporter_id = new.reporter_id
        and created_at > now() - interval '1 day'
    ) >= 20 then
      raise exception 'وصلت الحدّ اليومي للبلاغات.' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$function$;
revoke all on function public.guard_report_insert() from public, anon, authenticated, service_role;
grant execute on function public.guard_report_insert() to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: handle_new_user()', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  meta_role     text;
  intended_role public.user_role;
  display_name  text;
  phone_val     text;
begin
  meta_role := coalesce(new.raw_user_meta_data->>'role', 'student');
  if meta_role = 'teacher' then
    intended_role := 'teacher';
  else
    intended_role := 'student';
  end if;

  display_name := coalesce(
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'مستخدم جديد'
  );
  phone_val := nullif(new.raw_user_meta_data->>'phone', '');

  insert into public.user_roles (user_id, role)
  values (new.id, intended_role)
  on conflict (user_id, role) do nothing;

  if intended_role = 'teacher' then
    insert into public.teacher_profiles (user_id, full_name, phone)
    values (new.id, display_name, phone_val)
    on conflict (user_id) do nothing;
  else
    insert into public.student_profiles (user_id, full_name, phone)
    values (new.id, display_name, phone_val)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$function$;
revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;
grant execute on function public.handle_new_user() to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: handle_notification_answered()', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.handle_notification_answered()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.status = 'answered' and old.status is distinct from 'answered' then
    -- شرط النزاهة: يجب أن يكون المدرّس قد أرسل رسالة على هذا السؤال فعلاً
    if exists (
      select 1 from public.messages m
      where m.question_id = new.question_id
        and m.sender_id = new.teacher_id
    ) then
      perform set_config('app.privileged_write', 'on', true);
      update public.teacher_profiles
        set answered_count = answered_count + 1
        where user_id = new.teacher_id;
      perform set_config('app.privileged_write', 'off', true);
    end if;
  end if;
  return new;
end;
$function$;
revoke all on function public.handle_notification_answered() from public, anon, authenticated, service_role;
grant execute on function public.handle_notification_answered() to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: handle_student_stage_change()', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.handle_student_stage_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.stage_id is distinct from old.stage_id then
    delete from public.questions where student_id = new.user_id;
  end if;
  return new;
end;
$function$;
revoke all on function public.handle_student_stage_change() from public, anon, authenticated, service_role;
grant execute on function public.handle_student_stage_change() to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: has_role(user_role)', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.has_role(check_role user_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = check_role
  );
$function$;
revoke all on function public.has_role(user_role) from public, anon, authenticated, service_role;
grant execute on function public.has_role(user_role) to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: has_security_credential()', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.has_security_credential()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.security_credentials where user_id = auth.uid());
$function$;
revoke all on function public.has_security_credential() from public, anon, authenticated, service_role;
grant execute on function public.has_security_credential() to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: haversine_km(double precision,double precision,double precision,double precision)', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.haversine_km(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
 RETURNS double precision
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2))
      * power(sin(radians(lon2 - lon1) / 2), 2)
  ));
$function$;
revoke all on function public.haversine_km(double precision,double precision,double precision,double precision) from public, anon, authenticated, service_role;
grant execute on function public.haversine_km(double precision,double precision,double precision,double precision) to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: is_account_deactivated(uuid)', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.is_account_deactivated(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(
    (select deactivated from public.account_status where user_id = uid),
    false
  );
$function$;
revoke all on function public.is_account_deactivated(uuid) from public, anon, authenticated, service_role;
grant execute on function public.is_account_deactivated(uuid) to authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: is_admin()', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin' and active
  );
$function$;
revoke all on function public.is_admin() from public, anon, authenticated, service_role;
grant execute on function public.is_admin() to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: is_allowed_push_endpoint(text)', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.is_allowed_push_endpoint(ep text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
declare
  host text;
begin
  if ep is null then
    return false;
  end if;
  -- يجب أن يكون https، ونستخرج المضيف (قبل أول '/').
  if ep !~* '^https://' then
    return false;
  end if;
  host := lower(substring(ep from '^https://([^/]+)'));
  if host is null or host = '' then
    return false;
  end if;
  -- خدمات الدفع المعروفة فقط (مطابقة لمنطق التطبيق).
  return
       host = 'fcm.googleapis.com'
    or host = 'web.push.apple.com'
    or host like '%.push.apple.com'
    or host like '%.push.services.mozilla.com'
    or host like '%.notify.windows.com';
end;
$function$;
revoke all on function public.is_allowed_push_endpoint(text) from public, anon, authenticated, service_role;
grant execute on function public.is_allowed_push_endpoint(text) to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: is_approved_teacher()', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.is_approved_teacher()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.teacher_profiles tp
    where tp.user_id = auth.uid() and tp.verification_status = 'approved'
  ) and not public.is_banned(auth.uid())
    and not public.is_account_deactivated(auth.uid());
$function$;
revoke all on function public.is_approved_teacher() from public, anon, authenticated, service_role;
grant execute on function public.is_approved_teacher() to authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: is_approved_teacher_of(uuid)', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.is_approved_teacher_of(p_subject uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.teacher_profiles tp
    where tp.user_id = auth.uid() and tp.verification_status = 'approved'
  ) and exists (
    select 1 from public.teacher_subjects ts
    where ts.teacher_id = auth.uid() and ts.subject_id = p_subject
  ) and not public.is_banned(auth.uid())
    and not public.is_account_deactivated(auth.uid());
$function$;
revoke all on function public.is_approved_teacher_of(uuid) from public, anon, authenticated, service_role;
grant execute on function public.is_approved_teacher_of(uuid) to authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: is_banned(uuid)', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.is_banned(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select banned from public.account_status where user_id = uid), false);
$function$;
revoke all on function public.is_banned(uuid) from public, anon, authenticated, service_role;
grant execute on function public.is_banned(uuid) to authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: is_dangerous_url(text)', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.is_dangerous_url(v text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select v is not null
     and regexp_replace(v, '[\s\x01-\x20]+', '', 'g')
         ~* '^(javascript|data|vbscript|file|blob):';
$function$;
revoke all on function public.is_dangerous_url(text) from public, anon, authenticated, service_role;
grant execute on function public.is_dangerous_url(text) to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: is_notified_teacher(uuid)', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.is_notified_teacher(qid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.notifications
    where question_id = qid and teacher_id = auth.uid()
  );
$function$;
revoke all on function public.is_notified_teacher(uuid) from public, anon, authenticated, service_role;
grant execute on function public.is_notified_teacher(uuid) to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: is_student(uuid)', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.is_student(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists(select 1 from public.student_profiles where user_id = uid);
$function$;
revoke all on function public.is_student(uuid) from public, anon, authenticated, service_role;
grant execute on function public.is_student(uuid) to authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: is_super_admin()', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin' and super and active
  );
$function$;
revoke all on function public.is_super_admin() from public, anon, authenticated, service_role;
grant execute on function public.is_super_admin() to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: is_teacher(uuid)', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.is_teacher(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists(select 1 from public.teacher_profiles where user_id = uid);
$function$;
revoke all on function public.is_teacher(uuid) from public, anon, authenticated, service_role;
grant execute on function public.is_teacher(uuid) to authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: is_valid_youtube_url(text)', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.is_valid_youtube_url(v text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select v is not null
     and length(v) <= 500
     and v ~* '^https://(www\.|m\.)?(youtube\.com|youtu\.be)(/[^\s<>"'']*)?$';
$function$;
revoke all on function public.is_valid_youtube_url(text) from public, anon, authenticated, service_role;
grant execute on function public.is_valid_youtube_url(text) to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: limit_teacher_content()', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.limit_teacher_content()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  recent integer;
begin
  if current_user in ('authenticated', 'anon') then
    new.created_at := now();
    execute format(
      'select count(*) from public.%I where teacher_id = $1 and created_at > now() - interval ''1 day''',
      tg_table_name
    ) into recent using new.teacher_id;
    if recent >= 50 then
      raise exception 'وصلت الحدّ اليومي للرفع. حاول غداً.'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$function$;
revoke all on function public.limit_teacher_content() from public, anon, authenticated, service_role;
grant execute on function public.limit_teacher_content() to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: my_referral_code()', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.my_referral_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid  uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then return null; end if;
  select code into v_code from public.referral_codes where user_id = v_uid;
  if v_code is not null then return v_code; end if;
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 7));
    begin
      insert into public.referral_codes (user_id, code) values (v_uid, v_code);
      return v_code;
    exception when unique_violation then
      select code into v_code from public.referral_codes where user_id = v_uid;
      if v_code is not null then return v_code; end if;
      -- تصادم رمز نادر: أعد المحاولة
    end;
  end loop;
end;
$function$;
revoke all on function public.my_referral_code() from public, anon, authenticated, service_role;
grant execute on function public.my_referral_code() to authenticated, service_role;
$dalili$);

select pg_temp.dalili_run('function: norm_answer(text)', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.norm_answer(a text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$ select lower(btrim(regexp_replace(coalesce(a, ''), '\s+', ' ', 'g'))); $function$;
revoke all on function public.norm_answer(text) from public, anon, authenticated, service_role;
grant execute on function public.norm_answer(text) to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: notify_push_on_insert()', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.notify_push_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_url    text;
  v_secret text;
begin
  select value into v_url from public.app_config where key = 'push_webhook_url';
  if v_url is null or v_url = '' then
    return new; -- الويبهوك غير مضبوط بعد: تجاهل بهدوء
  end if;
  select value into v_secret from public.app_config where key = 'push_webhook_secret';

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', tg_table_name,
      'record', to_jsonb(new)
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', coalesce(v_secret, '')
    )
  );
  return new;
end;
$function$;
revoke all on function public.notify_push_on_insert() from public, anon, authenticated, service_role;
grant execute on function public.notify_push_on_insert() to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: owns_question(uuid)', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.owns_question(qid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.questions
    where id = qid and student_id = auth.uid()
  );
$function$;
revoke all on function public.owns_question(uuid) from public, anon, authenticated, service_role;
grant execute on function public.owns_question(uuid) to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: protect_account_ban()', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.protect_account_ban()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if current_user in ('authenticated', 'anon') then
    if not public.is_admin() then
      -- المستخدم العادي لا يغيّر حقل الحظر إطلاقاً
      if tg_op = 'INSERT' then
        new.banned := false;
      else
        new.banned := old.banned;
      end if;
    elsif new.banned
          and (tg_op = 'INSERT' or not old.banned)
          and not public.is_super_admin()
          and exists (
            select 1 from public.user_roles
            where user_id = new.user_id and role = 'admin' and super
          )
    then
      -- مدير المستوى الثاني لا يحظر المدير الأساسي
      raise exception 'لا يمكن حظر المدير الأساسي.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$function$;
revoke all on function public.protect_account_ban() from public, anon, authenticated, service_role;
grant execute on function public.protect_account_ban() to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: protect_teacher_privileged_fields()', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.protect_teacher_privileged_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
  new.featured_until      := old.featured_until;
  new.views_base          := old.views_base;
  return new;
end;
$function$;
revoke all on function public.protect_teacher_privileged_fields() from public, anon, authenticated, service_role;
grant execute on function public.protect_teacher_privileged_fields() to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: record_referral(text)', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.record_referral(p_code text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid      uuid := auth.uid();
  v_referrer uuid;
  v_created  timestamptz;
begin
  if v_uid is null or coalesce(p_code, '') = '' then return; end if;
  select created_at into v_created from auth.users where id = v_uid;
  if v_created is null or v_created < now() - interval '2 days' then
    return;  -- حساب قديم: لا إحالة بأثر رجعي
  end if;
  select user_id into v_referrer from public.referral_codes where code = upper(p_code);
  if v_referrer is null or v_referrer = v_uid then return; end if;
  insert into public.referrals (referrer_id, referred_id, code)
  values (v_referrer, v_uid, upper(p_code))
  on conflict (referred_id) do nothing;
end;
$function$;
revoke all on function public.record_referral(text) from public, anon, authenticated, service_role;
grant execute on function public.record_referral(text) to authenticated, service_role;
$dalili$);

select pg_temp.dalili_run('function: record_teacher_view(uuid)', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.record_teacher_view(p_teacher uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_viewer uuid := auth.uid();
begin
  if v_viewer is not null and v_viewer = p_teacher then
    return;
  end if;
  if not exists (select 1 from public.teacher_profiles where user_id = p_teacher) then
    return;
  end if;
  if v_viewer is not null then
    -- مسجّل: مشاهدة واحدة لكل مدرّس خلال الساعة
    if exists (
      select 1 from public.teacher_views
      where teacher_id = p_teacher and viewer_id = v_viewer
        and created_at > now() - interval '1 hour'
    ) then
      return;
    end if;
  else
    -- زائر مجهول: سقف ٣٠ مشاهدة/ساعة لكل مدرّس (يمنع التضخيم وإغراق الجدول)
    if (
      select count(*) from public.teacher_views
      where teacher_id = p_teacher and viewer_id is null
        and created_at > now() - interval '1 hour'
    ) >= 30 then
      return;
    end if;
  end if;
  insert into public.teacher_views (teacher_id, viewer_id)
  values (p_teacher, v_viewer);
end;
$function$;
revoke all on function public.record_teacher_view(uuid) from public, anon, authenticated, service_role;
grant execute on function public.record_teacher_view(uuid) to authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: reset_lookup_user(text)', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.reset_lookup_user(p_email text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$function$;
revoke all on function public.reset_lookup_user(text) from public, anon, authenticated, service_role;
grant execute on function public.reset_lookup_user(text) to service_role;
$dalili$);

select pg_temp.dalili_run('function: sanitize_teacher_links()', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.sanitize_teacher_links()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.youtube_url is not null and not public.is_valid_youtube_url(new.youtube_url) then
    new.youtube_url := null;
  end if;
  if public.is_dangerous_url(new.telegram_url)  then new.telegram_url  := null; end if;
  if public.is_dangerous_url(new.instagram_url) then new.instagram_url := null; end if;
  if public.is_dangerous_url(new.photo_url)     then new.photo_url     := null; end if;
  return new;
end;
$function$;
revoke all on function public.sanitize_teacher_links() from public, anon, authenticated, service_role;
grant execute on function public.sanitize_teacher_links() to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: set_security_credential(text,text)', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.set_security_credential(p_question text, p_answer text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;
  if coalesce(btrim(p_question), '') = '' or coalesce(btrim(p_answer), '') = '' then
    raise exception 'question and answer are required';
  end if;
  insert into public.security_credentials (user_id, question, answer_hash, failed_attempts, locked_until, updated_at)
  values (auth.uid(), p_question, crypt(public.norm_answer(p_answer), gen_salt('bf')), 0, null, now())
  on conflict (user_id) do update
    set question = excluded.question,
        answer_hash = excluded.answer_hash,
        failed_attempts = 0,
        locked_until = null,
        updated_at = now();
end;
$function$;
revoke all on function public.set_security_credential(text,text) from public, anon, authenticated, service_role;
grant execute on function public.set_security_credential(text,text) to authenticated, service_role;
$dalili$);

select pg_temp.dalili_run('function: set_updated_at()', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;
revoke all on function public.set_updated_at() from public, anon, authenticated, service_role;
grant execute on function public.set_updated_at() to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('function: validate_quiz_question()', $dalili$
set local check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.validate_quiz_question()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  el jsonb;
  n  integer;
begin
  if length(btrim(coalesce(new.prompt, ''))) = 0 or length(new.prompt) > 1000 then
    raise exception 'نص السؤال غير صالح.' using errcode = 'check_violation';
  end if;
  if jsonb_typeof(new.options) is distinct from 'array' then
    raise exception 'خيارات السؤال غير صالحة.' using errcode = 'check_violation';
  end if;
  for el in select * from jsonb_array_elements(new.options) loop
    if jsonb_typeof(el) <> 'string'
       or length(btrim(el #>> '{}')) = 0
       or length(el #>> '{}') > 300 then
      raise exception 'خيارات السؤال غير صالحة.' using errcode = 'check_violation';
    end if;
  end loop;
  if tg_op = 'INSERT' then
    select count(*) into n from public.quiz_questions where quiz_id = new.quiz_id;
    if n >= 60 then
      raise exception 'الحد الأقصى ٦٠ سؤالاً للاختبار.' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$function$;
revoke all on function public.validate_quiz_question() from public, anon, authenticated, service_role;
grant execute on function public.validate_quiz_question() to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('directory: view + map/search functions', $dalili$
do $do$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p
           where p.pronamespace = 'public'::regnamespace and p.proname in ('map_teachers', 'search_teachers')
  loop execute format('drop function %s', f.sig); end loop;
end $do$;
drop view if exists public.teacher_directory;
create view public.teacher_directory as
 SELECT tp.user_id,
    tp.full_name,
    tp.photo_url,
    tp.school,
    tp.institute,
    tp.bio,
    tp.years_experience,
    tp.gender,
    tp.answered_count,
    COALESCE(r.avg_rating, 0::numeric) AS avg_rating,
    COALESCE(r.rating_count, 0) AS rating_count,
    tp.featured_until IS NOT NULL AND tp.featured_until > now() AS featured,
    tp.location_visible,
    tp.governorate_id,
    g.name AS governorate_name,
    g.latitude,
    g.longitude,
    COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), '{}'::text[]) AS subjects,
    COALESCE(array_agg(DISTINCT st.name) FILTER (WHERE st.name IS NOT NULL), '{}'::text[]) AS stages,
    tp.youtube_url
   FROM teacher_profiles tp
     JOIN governorates g ON g.id = tp.governorate_id
     LEFT JOIN teacher_subjects tsub ON tsub.teacher_id = tp.user_id
     LEFT JOIN subjects s ON s.id = tsub.subject_id
     LEFT JOIN teacher_stages tst ON tst.teacher_id = tp.user_id
     LEFT JOIN stages st ON st.id = tst.stage_id
     LEFT JOIN ( SELECT teacher_ratings.teacher_id,
            round(avg(teacher_ratings.rating), 1) AS avg_rating,
            count(*)::integer AS rating_count
           FROM teacher_ratings
          GROUP BY teacher_ratings.teacher_id) r ON r.teacher_id = tp.user_id
  WHERE tp.verification_status = 'approved'::verification_status AND NOT is_account_deactivated(tp.user_id) AND NOT is_banned(tp.user_id)
  GROUP BY tp.user_id, g.id, r.avg_rating, r.rating_count;
revoke all on public.teacher_directory from public, anon, authenticated;
grant select on public.teacher_directory to anon, authenticated;
CREATE OR REPLACE FUNCTION public.map_teachers(p_subject_id uuid DEFAULT NULL::uuid, p_governorate_id smallint DEFAULT NULL::smallint)
 RETURNS TABLE(user_id uuid, full_name text, photo_url text, bio text, years_experience smallint, gender text, governorate_id smallint, governorate_name text, latitude double precision, longitude double precision, answered_count integer, avg_rating numeric, rating_count integer, featured boolean, subjects text[], stages text[])
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
$function$;
revoke all on function public.map_teachers(uuid,smallint) from public, anon, authenticated, service_role;
grant execute on function public.map_teachers(uuid,smallint) to public, authenticated, anon, service_role;
CREATE OR REPLACE FUNCTION public.search_teachers(p_subject_id uuid DEFAULT NULL::uuid, p_governorate_id smallint DEFAULT NULL::smallint, p_stage_id smallint DEFAULT NULL::smallint, p_near_governorate_id smallint DEFAULT NULL::smallint)
 RETURNS TABLE(user_id uuid, full_name text, photo_url text, bio text, years_experience smallint, gender text, governorate_id smallint, governorate_name text, latitude double precision, longitude double precision, answered_count integer, avg_rating numeric, rating_count integer, featured boolean, location_visible boolean, subjects text[], stages text[], distance_km double precision)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
$function$;
revoke all on function public.search_teachers(uuid,smallint,smallint,smallint) from public, anon, authenticated, service_role;
grant execute on function public.search_teachers(uuid,smallint,smallint,smallint) to public, authenticated, anon, service_role;
$dalili$);

select pg_temp.dalili_run('view: quiz_questions_public', $dalili$
drop view if exists public.quiz_questions_public;
create view public.quiz_questions_public with (security_invoker = off) as
 SELECT id,
    quiz_id,
    prompt,
    options,
    sort_order
   FROM quiz_questions;
revoke all on public.quiz_questions_public from public, anon, authenticated;
grant select on public.quiz_questions_public to authenticated;
$dalili$);

select pg_temp.dalili_run('triggers: public.account_status', $dalili$
drop trigger if exists trg_protect_account_ban on public.account_status;
CREATE TRIGGER trg_protect_account_ban BEFORE INSERT OR UPDATE ON public.account_status FOR EACH ROW EXECUTE FUNCTION protect_account_ban();
$dalili$);

select pg_temp.dalili_run('triggers: public.announcements', $dalili$
drop trigger if exists trg_push_announcements on public.announcements;
CREATE TRIGGER trg_push_announcements AFTER INSERT ON public.announcements FOR EACH ROW EXECUTE FUNCTION notify_push_on_insert();
$dalili$);

select pg_temp.dalili_run('triggers: public.exam_papers', $dalili$
drop trigger if exists trg_limit_exam_papers on public.exam_papers;
CREATE TRIGGER trg_limit_exam_papers BEFORE INSERT ON public.exam_papers FOR EACH ROW EXECUTE FUNCTION limit_teacher_content();
$dalili$);

select pg_temp.dalili_run('triggers: public.messages', $dalili$
drop trigger if exists trg_message_integrity on public.messages;
CREATE TRIGGER trg_message_integrity BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION enforce_message_integrity();
drop trigger if exists trg_push_messages on public.messages;
CREATE TRIGGER trg_push_messages AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION notify_push_on_insert();
$dalili$);

select pg_temp.dalili_run('triggers: public.notifications', $dalili$
drop trigger if exists trg_guard_notification_answer on public.notifications;
CREATE TRIGGER trg_guard_notification_answer BEFORE UPDATE OF status ON public.notifications FOR EACH ROW EXECUTE FUNCTION guard_notification_answer();
drop trigger if exists trg_guard_notification_keys on public.notifications;
CREATE TRIGGER trg_guard_notification_keys BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION guard_notification_keys();
drop trigger if exists trg_notification_answered on public.notifications;
CREATE TRIGGER trg_notification_answered AFTER UPDATE OF status ON public.notifications FOR EACH ROW EXECUTE FUNCTION handle_notification_answered();
drop trigger if exists trg_push_notifications on public.notifications;
CREATE TRIGGER trg_push_notifications AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION notify_push_on_insert();
$dalili$);

select pg_temp.dalili_run('triggers: public.push_subscriptions', $dalili$
drop trigger if exists trg_guard_push_endpoint on public.push_subscriptions;
CREATE TRIGGER trg_guard_push_endpoint BEFORE INSERT OR UPDATE ON public.push_subscriptions FOR EACH ROW EXECUTE FUNCTION guard_push_endpoint();
$dalili$);

select pg_temp.dalili_run('triggers: public.questions', $dalili$
drop trigger if exists trg_aa_question_integrity on public.questions;
CREATE TRIGGER trg_aa_question_integrity BEFORE INSERT ON public.questions FOR EACH ROW EXECUTE FUNCTION enforce_question_integrity();
drop trigger if exists trg_fanout_question_notifications on public.questions;
CREATE TRIGGER trg_fanout_question_notifications AFTER INSERT ON public.questions FOR EACH ROW EXECUTE FUNCTION fanout_question_notifications();
drop trigger if exists trg_guard_question_keys on public.questions;
CREATE TRIGGER trg_guard_question_keys BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION guard_question_keys();
drop trigger if exists trg_question_rate_limit on public.questions;
CREATE TRIGGER trg_question_rate_limit BEFORE INSERT ON public.questions FOR EACH ROW EXECUTE FUNCTION enforce_question_rate_limit();
$dalili$);

select pg_temp.dalili_run('triggers: public.quiz_questions', $dalili$
drop trigger if exists trg_validate_quiz_question on public.quiz_questions;
CREATE TRIGGER trg_validate_quiz_question BEFORE INSERT OR UPDATE ON public.quiz_questions FOR EACH ROW EXECUTE FUNCTION validate_quiz_question();
$dalili$);

select pg_temp.dalili_run('triggers: public.quizzes', $dalili$
drop trigger if exists trg_limit_quizzes on public.quizzes;
CREATE TRIGGER trg_limit_quizzes BEFORE INSERT ON public.quizzes FOR EACH ROW EXECUTE FUNCTION limit_teacher_content();
$dalili$);

select pg_temp.dalili_run('triggers: public.reports', $dalili$
drop trigger if exists trg_guard_report_insert on public.reports;
CREATE TRIGGER trg_guard_report_insert BEFORE INSERT ON public.reports FOR EACH ROW EXECUTE FUNCTION guard_report_insert();
$dalili$);

select pg_temp.dalili_run('triggers: public.student_profiles', $dalili$
drop trigger if exists trg_student_profiles_updated_at on public.student_profiles;
CREATE TRIGGER trg_student_profiles_updated_at BEFORE UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
drop trigger if exists trg_student_stage_change on public.student_profiles;
CREATE TRIGGER trg_student_stage_change AFTER UPDATE OF stage_id ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION handle_student_stage_change();
$dalili$);

select pg_temp.dalili_run('triggers: public.teacher_profiles', $dalili$
drop trigger if exists trg_clamp_teacher_insert on public.teacher_profiles;
CREATE TRIGGER trg_clamp_teacher_insert BEFORE INSERT ON public.teacher_profiles FOR EACH ROW EXECUTE FUNCTION clamp_teacher_insert();
drop trigger if exists trg_protect_teacher_fields on public.teacher_profiles;
CREATE TRIGGER trg_protect_teacher_fields BEFORE UPDATE ON public.teacher_profiles FOR EACH ROW EXECUTE FUNCTION protect_teacher_privileged_fields();
drop trigger if exists trg_sanitize_teacher_links on public.teacher_profiles;
CREATE TRIGGER trg_sanitize_teacher_links BEFORE INSERT OR UPDATE ON public.teacher_profiles FOR EACH ROW EXECUTE FUNCTION sanitize_teacher_links();
drop trigger if exists trg_teacher_profiles_updated_at on public.teacher_profiles;
CREATE TRIGGER trg_teacher_profiles_updated_at BEFORE UPDATE ON public.teacher_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
$dalili$);

select pg_temp.dalili_run('trigger: on_auth_user_created on auth.users (create if missing)', $dalili$
do $do$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created' and tgrelid = 'auth.users'::regclass) then
    execute 'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user()';
  end if;
end $do$;
$dalili$);

select pg_temp.dalili_run('policies: public.account_status', $dalili$
drop policy if exists "owner manages own status" on public.account_status;  -- سياسة قديمة أُلغيت
drop policy if exists "admin manages account status" on public.account_status;
create policy "admin manages account status" on public.account_status as permissive for all to authenticated
  using (is_admin())
  with check (is_admin());
drop policy if exists "admin reads all status" on public.account_status;
create policy "admin reads all status" on public.account_status as permissive for select to authenticated
  using (is_admin());
drop policy if exists "owner inserts own status" on public.account_status;
create policy "owner inserts own status" on public.account_status as permissive for insert to authenticated
  with check ((auth.uid() = user_id));
drop policy if exists "owner reads own status" on public.account_status;
create policy "owner reads own status" on public.account_status as permissive for select to authenticated
  using ((auth.uid() = user_id));
drop policy if exists "owner updates own status" on public.account_status;
create policy "owner updates own status" on public.account_status as permissive for update to authenticated
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
$dalili$);

select pg_temp.dalili_run('policies: public.ads', $dalili$
drop policy if exists "active ads readable by everyone" on public.ads;
create policy "active ads readable by everyone" on public.ads as permissive for select to anon, authenticated
  using ((active = true));
drop policy if exists "admin reads all ads" on public.ads;
create policy "admin reads all ads" on public.ads as permissive for select to authenticated
  using (is_admin());
drop policy if exists "only admin writes ads" on public.ads;
create policy "only admin writes ads" on public.ads as permissive for all to authenticated
  using (is_admin())
  with check (is_admin());
$dalili$);

select pg_temp.dalili_run('policies: public.announcements', $dalili$
drop policy if exists "admin deletes announcements" on public.announcements;
create policy "admin deletes announcements" on public.announcements as permissive for delete to authenticated
  using (is_admin());
drop policy if exists "admin inserts announcements" on public.announcements;
create policy "admin inserts announcements" on public.announcements as permissive for insert to authenticated
  with check (is_admin());
drop policy if exists "admin updates announcements" on public.announcements;
create policy "admin updates announcements" on public.announcements as permissive for update to authenticated
  using (is_admin())
  with check (is_admin());
drop policy if exists "read my announcements" on public.announcements;
create policy "read my announcements" on public.announcements as permissive for select to authenticated
  using ((is_admin() OR (active AND ((audience = 'all'::text) OR ((audience = 'students'::text) AND is_student(auth.uid())) OR ((audience = 'teachers'::text) AND is_teacher(auth.uid())) OR ((audience = 'user'::text) AND (target_user_id = auth.uid()))))));
$dalili$);

select pg_temp.dalili_run('policies: public.exam_papers', $dalili$
drop policy if exists "approved teacher inserts own exam papers" on public.exam_papers;
create policy "approved teacher inserts own exam papers" on public.exam_papers as permissive for insert to authenticated
  with check (((auth.uid() = teacher_id) AND is_approved_teacher_of(subject_id)));
drop policy if exists "owner or admin deletes exam papers" on public.exam_papers;
create policy "owner or admin deletes exam papers" on public.exam_papers as permissive for delete to authenticated
  using (((auth.uid() = teacher_id) OR is_admin()));
drop policy if exists "owner or admin updates exam papers" on public.exam_papers;
create policy "owner or admin updates exam papers" on public.exam_papers as permissive for update to authenticated
  using (((auth.uid() = teacher_id) OR is_admin()))
  with check ((is_admin() OR ((auth.uid() = teacher_id) AND is_approved_teacher_of(subject_id))));
drop policy if exists "read exam papers" on public.exam_papers;
create policy "read exam papers" on public.exam_papers as permissive for select to authenticated
  using (((NOT is_banned(teacher_id)) OR (auth.uid() = teacher_id) OR ( SELECT is_admin() AS is_admin)));
$dalili$);

select pg_temp.dalili_run('policies: public.governorates', $dalili$
drop policy if exists "governorates readable by everyone" on public.governorates;
create policy "governorates readable by everyone" on public.governorates as permissive for select to anon, authenticated
  using (true);
drop policy if exists "only admin writes governorates" on public.governorates;
create policy "only admin writes governorates" on public.governorates as permissive for all to authenticated
  using (is_admin())
  with check (is_admin());
$dalili$);

select pg_temp.dalili_run('policies: public.messages', $dalili$
drop policy if exists "banned cannot send messages" on public.messages;
create policy "banned cannot send messages" on public.messages as restrictive for insert to authenticated
  with check ((NOT is_banned(auth.uid())));
drop policy if exists "participant sends messages" on public.messages;
create policy "participant sends messages" on public.messages as permissive for insert to authenticated
  with check (((auth.uid() = sender_id) AND (((EXISTS ( SELECT 1
   FROM questions q
  WHERE ((q.id = messages.question_id) AND (q.student_id = auth.uid())))) AND (EXISTS ( SELECT 1
   FROM notifications n
  WHERE ((n.question_id = messages.question_id) AND (n.teacher_id = messages.recipient_id))))) OR ((EXISTS ( SELECT 1
   FROM notifications n
  WHERE ((n.question_id = messages.question_id) AND (n.teacher_id = auth.uid())))) AND (EXISTS ( SELECT 1
   FROM questions q
  WHERE ((q.id = messages.question_id) AND (q.student_id = messages.recipient_id))))))));
drop policy if exists "read messages as participant or admin" on public.messages;
create policy "read messages as participant or admin" on public.messages as permissive for select to authenticated
  using (((auth.uid() = sender_id) OR (auth.uid() = recipient_id) OR is_admin()));
drop policy if exists "sender or admin deletes messages" on public.messages;
create policy "sender or admin deletes messages" on public.messages as permissive for delete to authenticated
  using (((auth.uid() = sender_id) OR is_admin()));
$dalili$);

select pg_temp.dalili_run('policies: public.news', $dalili$
drop policy if exists "news readable by everyone" on public.news;
create policy "news readable by everyone" on public.news as permissive for select to anon, authenticated
  using (true);
drop policy if exists "only admin writes news" on public.news;
create policy "only admin writes news" on public.news as permissive for all to authenticated
  using (is_admin())
  with check (is_admin());
$dalili$);

select pg_temp.dalili_run('policies: public.notifications', $dalili$
drop policy if exists "only admin deletes notifications" on public.notifications;
create policy "only admin deletes notifications" on public.notifications as permissive for delete to authenticated
  using (is_admin());
drop policy if exists "only admin inserts notifications directly" on public.notifications;
create policy "only admin inserts notifications directly" on public.notifications as permissive for insert to authenticated
  with check (is_admin());
drop policy if exists "read notifications as teacher, question owner, or admin" on public.notifications;
create policy "read notifications as teacher, question owner, or admin" on public.notifications as permissive for select to authenticated
  using (((auth.uid() = teacher_id) OR is_admin() OR owns_question(question_id)));
drop policy if exists "teacher, question owner, or admin updates notifications" on public.notifications;
create policy "teacher, question owner, or admin updates notifications" on public.notifications as permissive for update to authenticated
  using (((auth.uid() = teacher_id) OR is_admin() OR owns_question(question_id)))
  with check (((auth.uid() = teacher_id) OR is_admin() OR owns_question(question_id)));
$dalili$);

select pg_temp.dalili_run('policies: public.push_subscriptions', $dalili$
drop policy if exists "owner manages own push subscriptions" on public.push_subscriptions;
create policy "owner manages own push subscriptions" on public.push_subscriptions as permissive for all to authenticated
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
$dalili$);

select pg_temp.dalili_run('policies: public.questions', $dalili$
drop policy if exists "banned cannot ask" on public.questions;
create policy "banned cannot ask" on public.questions as restrictive for insert to authenticated
  with check ((NOT is_banned(auth.uid())));
drop policy if exists "read questions as owner, notified teacher, or admin" on public.questions;
create policy "read questions as owner, notified teacher, or admin" on public.questions as permissive for select to authenticated
  using (((auth.uid() = student_id) OR is_admin() OR is_notified_teacher(id)));
drop policy if exists "student creates own questions" on public.questions;
create policy "student creates own questions" on public.questions as permissive for insert to authenticated
  with check ((auth.uid() = student_id));
drop policy if exists "student or admin deletes questions" on public.questions;
create policy "student or admin deletes questions" on public.questions as permissive for delete to authenticated
  using (((auth.uid() = student_id) OR is_admin()));
drop policy if exists "student or admin updates questions" on public.questions;
create policy "student or admin updates questions" on public.questions as permissive for update to authenticated
  using (((auth.uid() = student_id) OR is_admin()))
  with check (((auth.uid() = student_id) OR is_admin()));
$dalili$);

select pg_temp.dalili_run('policies: public.quiz_attempts', $dalili$
drop policy if exists "student or quiz owner reads attempts" on public.quiz_attempts;
create policy "student or quiz owner reads attempts" on public.quiz_attempts as permissive for select to authenticated
  using (((auth.uid() = student_id) OR is_admin() OR (EXISTS ( SELECT 1
   FROM quizzes q
  WHERE ((q.id = quiz_attempts.quiz_id) AND (q.teacher_id = auth.uid()))))));
$dalili$);

select pg_temp.dalili_run('policies: public.quiz_questions', $dalili$
drop policy if exists "owner or admin deletes quiz questions" on public.quiz_questions;
create policy "owner or admin deletes quiz questions" on public.quiz_questions as permissive for delete to authenticated
  using ((is_admin() OR (EXISTS ( SELECT 1
   FROM quizzes q
  WHERE ((q.id = quiz_questions.quiz_id) AND (q.teacher_id = auth.uid()))))));
drop policy if exists "owner or admin reads quiz questions" on public.quiz_questions;
create policy "owner or admin reads quiz questions" on public.quiz_questions as permissive for select to authenticated
  using ((is_admin() OR (EXISTS ( SELECT 1
   FROM quizzes q
  WHERE ((q.id = quiz_questions.quiz_id) AND (q.teacher_id = auth.uid()))))));
drop policy if exists "owner updates quiz questions" on public.quiz_questions;
create policy "owner updates quiz questions" on public.quiz_questions as permissive for update to authenticated
  using ((EXISTS ( SELECT 1
   FROM quizzes q
  WHERE ((q.id = quiz_questions.quiz_id) AND (q.teacher_id = auth.uid())))))
  with check ((EXISTS ( SELECT 1
   FROM quizzes q
  WHERE ((q.id = quiz_questions.quiz_id) AND (q.teacher_id = auth.uid())))));
drop policy if exists "owner writes quiz questions" on public.quiz_questions;
create policy "owner writes quiz questions" on public.quiz_questions as permissive for insert to authenticated
  with check ((EXISTS ( SELECT 1
   FROM quizzes q
  WHERE ((q.id = quiz_questions.quiz_id) AND (q.teacher_id = auth.uid())))));
$dalili$);

select pg_temp.dalili_run('policies: public.quizzes', $dalili$
drop policy if exists "approved teacher inserts own quizzes" on public.quizzes;
create policy "approved teacher inserts own quizzes" on public.quizzes as permissive for insert to authenticated
  with check (((auth.uid() = teacher_id) AND is_approved_teacher_of(subject_id)));
drop policy if exists "owner or admin deletes quizzes" on public.quizzes;
create policy "owner or admin deletes quizzes" on public.quizzes as permissive for delete to authenticated
  using (((auth.uid() = teacher_id) OR is_admin()));
drop policy if exists "owner or admin updates quizzes" on public.quizzes;
create policy "owner or admin updates quizzes" on public.quizzes as permissive for update to authenticated
  using (((auth.uid() = teacher_id) OR is_admin()))
  with check ((is_admin() OR ((auth.uid() = teacher_id) AND is_approved_teacher_of(subject_id))));
drop policy if exists "read quizzes" on public.quizzes;
create policy "read quizzes" on public.quizzes as permissive for select to authenticated
  using (((NOT is_banned(teacher_id)) OR (auth.uid() = teacher_id) OR ( SELECT is_admin() AS is_admin)));
$dalili$);

select pg_temp.dalili_run('policies: public.referrals', $dalili$
drop policy if exists "referrer reads own referrals" on public.referrals;
create policy "referrer reads own referrals" on public.referrals as permissive for select to authenticated
  using ((auth.uid() = referrer_id));
$dalili$);

select pg_temp.dalili_run('policies: public.reports', $dalili$
drop policy if exists "admin reads reports" on public.reports;
create policy "admin reads reports" on public.reports as permissive for select to authenticated
  using (is_admin());
drop policy if exists "admin updates reports" on public.reports;
create policy "admin updates reports" on public.reports as permissive for update to authenticated
  using (is_admin())
  with check (is_admin());
drop policy if exists "reporter reads own reports" on public.reports;
create policy "reporter reads own reports" on public.reports as permissive for select to authenticated
  using ((auth.uid() = reporter_id));
drop policy if exists "user files a report" on public.reports;
create policy "user files a report" on public.reports as permissive for insert to authenticated
  with check (((auth.uid() = reporter_id) AND (reporter_id <> reported_id)));
$dalili$);

select pg_temp.dalili_run('policies: public.stages', $dalili$
drop policy if exists "only admin writes stages" on public.stages;
create policy "only admin writes stages" on public.stages as permissive for all to authenticated
  using (is_admin())
  with check (is_admin());
drop policy if exists "stages readable by everyone" on public.stages;
create policy "stages readable by everyone" on public.stages as permissive for select to anon, authenticated
  using (true);
$dalili$);

select pg_temp.dalili_run('policies: public.student_profiles', $dalili$
drop policy if exists "student deletes own profile" on public.student_profiles;
create policy "student deletes own profile" on public.student_profiles as permissive for delete to authenticated
  using (((auth.uid() = user_id) OR is_admin()));
drop policy if exists "student inserts own profile" on public.student_profiles;
create policy "student inserts own profile" on public.student_profiles as permissive for insert to authenticated
  with check ((auth.uid() = user_id));
drop policy if exists "student reads own profile" on public.student_profiles;
create policy "student reads own profile" on public.student_profiles as permissive for select to authenticated
  using (((auth.uid() = user_id) OR is_admin()));
drop policy if exists "student updates own profile" on public.student_profiles;
create policy "student updates own profile" on public.student_profiles as permissive for update to authenticated
  using (((auth.uid() = user_id) OR is_admin()))
  with check (((auth.uid() = user_id) OR is_admin()));
$dalili$);

select pg_temp.dalili_run('policies: public.subjects', $dalili$
drop policy if exists "only admin writes subjects" on public.subjects;
create policy "only admin writes subjects" on public.subjects as permissive for all to authenticated
  using (is_admin())
  with check (is_admin());
drop policy if exists "subjects readable by everyone" on public.subjects;
create policy "subjects readable by everyone" on public.subjects as permissive for select to anon, authenticated
  using (true);
$dalili$);

select pg_temp.dalili_run('policies: public.teacher_profiles', $dalili$
drop policy if exists "approved teachers are public" on public.teacher_profiles;  -- سياسة قديمة أُلغيت
drop policy if exists "teacher inserts own profile" on public.teacher_profiles;  -- سياسة قديمة أُلغيت
drop policy if exists "admin reads all teacher profiles" on public.teacher_profiles;
create policy "admin reads all teacher profiles" on public.teacher_profiles as permissive for select to authenticated
  using (is_admin());
drop policy if exists "teacher deletes own profile" on public.teacher_profiles;
create policy "teacher deletes own profile" on public.teacher_profiles as permissive for delete to authenticated
  using (((auth.uid() = user_id) OR is_admin()));
drop policy if exists "teacher inserts own pending profile" on public.teacher_profiles;
create policy "teacher inserts own pending profile" on public.teacher_profiles as permissive for insert to authenticated
  with check (((auth.uid() = user_id) AND (verification_status = 'pending'::verification_status) AND (answered_count = 0)));
drop policy if exists "teacher reads own profile" on public.teacher_profiles;
create policy "teacher reads own profile" on public.teacher_profiles as permissive for select to authenticated
  using ((auth.uid() = user_id));
drop policy if exists "teacher updates own profile" on public.teacher_profiles;
create policy "teacher updates own profile" on public.teacher_profiles as permissive for update to authenticated
  using (((auth.uid() = user_id) OR is_admin()))
  with check (((auth.uid() = user_id) OR is_admin()));
$dalili$);

select pg_temp.dalili_run('policies: public.teacher_ratings', $dalili$
drop policy if exists "admin edits any rating" on public.teacher_ratings;
create policy "admin edits any rating" on public.teacher_ratings as permissive for update to authenticated
  using (is_admin())
  with check (is_admin());
drop policy if exists "banned cannot rate" on public.teacher_ratings;
create policy "banned cannot rate" on public.teacher_ratings as restrictive for insert to authenticated
  with check ((NOT is_banned(auth.uid())));
drop policy if exists "owner or admin deletes rating" on public.teacher_ratings;
create policy "owner or admin deletes rating" on public.teacher_ratings as permissive for delete to authenticated
  using (((auth.uid() = student_id) OR is_admin()));
drop policy if exists "ratings are public" on public.teacher_ratings;
create policy "ratings are public" on public.teacher_ratings as permissive for select to anon, authenticated
  using (true);
drop policy if exists "student rates an interacted teacher" on public.teacher_ratings;
create policy "student rates an interacted teacher" on public.teacher_ratings as permissive for insert to authenticated
  with check (((auth.uid() = student_id) AND (student_id <> teacher_id) AND (EXISTS ( SELECT 1
   FROM messages m
  WHERE ((m.sender_id = teacher_ratings.teacher_id) AND (m.recipient_id = teacher_ratings.student_id))))));
drop policy if exists "student updates own rating" on public.teacher_ratings;
create policy "student updates own rating" on public.teacher_ratings as permissive for update to authenticated
  using ((auth.uid() = student_id))
  with check (((auth.uid() = student_id) AND (student_id <> teacher_id) AND (EXISTS ( SELECT 1
   FROM messages m
  WHERE ((m.sender_id = teacher_ratings.teacher_id) AND (m.recipient_id = teacher_ratings.student_id))))));
$dalili$);

select pg_temp.dalili_run('policies: public.teacher_stages', $dalili$
drop policy if exists "teacher manages own stages" on public.teacher_stages;
create policy "teacher manages own stages" on public.teacher_stages as permissive for all to authenticated
  using (((auth.uid() = teacher_id) OR is_admin()))
  with check (((auth.uid() = teacher_id) OR is_admin()));
drop policy if exists "teacher_stages readable by everyone" on public.teacher_stages;
create policy "teacher_stages readable by everyone" on public.teacher_stages as permissive for select to anon, authenticated
  using (true);
$dalili$);

select pg_temp.dalili_run('policies: public.teacher_subjects', $dalili$
drop policy if exists "teacher manages own subjects" on public.teacher_subjects;
create policy "teacher manages own subjects" on public.teacher_subjects as permissive for all to authenticated
  using (((auth.uid() = teacher_id) OR is_admin()))
  with check (((auth.uid() = teacher_id) OR is_admin()));
drop policy if exists "teacher_subjects readable by everyone" on public.teacher_subjects;
create policy "teacher_subjects readable by everyone" on public.teacher_subjects as permissive for select to anon, authenticated
  using (true);
$dalili$);

select pg_temp.dalili_run('policies: public.teacher_views', $dalili$
drop policy if exists "teacher reads own views" on public.teacher_views;
create policy "teacher reads own views" on public.teacher_views as permissive for select to authenticated
  using ((auth.uid() = teacher_id));
$dalili$);

select pg_temp.dalili_run('policies: public.user_roles', $dalili$
drop policy if exists "only admin manages roles" on public.user_roles;  -- سياسة قديمة أُلغيت
drop policy if exists "only super admin manages roles" on public.user_roles;
create policy "only super admin manages roles" on public.user_roles as permissive for all to authenticated
  using (is_super_admin())
  with check (is_super_admin());
drop policy if exists "read own roles or admin reads all" on public.user_roles;
create policy "read own roles or admin reads all" on public.user_roles as permissive for select to authenticated
  using (((auth.uid() = user_id) OR is_admin()));
$dalili$);

select pg_temp.dalili_run('policies: storage.objects', $dalili$
drop policy if exists "ad images are publicly readable" on storage.objects;
create policy "ad images are publicly readable" on storage.objects as permissive for select to anon, authenticated
  using ((bucket_id = 'ads'::text));
drop policy if exists "approved teacher uploads study resources" on storage.objects;
create policy "approved teacher uploads study resources" on storage.objects as permissive for insert to authenticated
  with check (((bucket_id = 'study-resources'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text) AND is_approved_teacher()));
drop policy if exists "avatars are publicly readable" on storage.objects;
create policy "avatars are publicly readable" on storage.objects as permissive for select to anon, authenticated
  using ((bucket_id = 'avatars'::text));
drop policy if exists "delete message attachments as participant" on storage.objects;
create policy "delete message attachments as participant" on storage.objects as permissive for delete to authenticated
  using (((bucket_id = 'message-attachments'::text) AND can_access_message_attachment(name)));
drop policy if exists "id docs readable by owner or admin" on storage.objects;
create policy "id docs readable by owner or admin" on storage.objects as permissive for select to authenticated
  using (((bucket_id = 'id-documents'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR is_admin())));
drop policy if exists "only admin deletes ad images" on storage.objects;
create policy "only admin deletes ad images" on storage.objects as permissive for delete to authenticated
  using (((bucket_id = 'ads'::text) AND is_admin()));
drop policy if exists "only admin updates ad images" on storage.objects;
create policy "only admin updates ad images" on storage.objects as permissive for update to authenticated
  using (((bucket_id = 'ads'::text) AND is_admin()))
  with check (((bucket_id = 'ads'::text) AND is_admin()));
drop policy if exists "only admin uploads ad images" on storage.objects;
create policy "only admin uploads ad images" on storage.objects as permissive for insert to authenticated
  with check (((bucket_id = 'ads'::text) AND is_admin()));
drop policy if exists "owner or admin deletes id doc" on storage.objects;
create policy "owner or admin deletes id doc" on storage.objects as permissive for delete to authenticated
  using (((bucket_id = 'id-documents'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR is_admin())));
drop policy if exists "owner or admin deletes question attachment" on storage.objects;
create policy "owner or admin deletes question attachment" on storage.objects as permissive for delete to authenticated
  using (((bucket_id = 'question-attachments'::text) AND (is_admin() OR owns_question(((storage.foldername(name))[1])::uuid))));
drop policy if exists "owner or admin deletes study resources" on storage.objects;
create policy "owner or admin deletes study resources" on storage.objects as permissive for delete to authenticated
  using (((bucket_id = 'study-resources'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR is_admin())));
drop policy if exists "read message attachments as participant" on storage.objects;
create policy "read message attachments as participant" on storage.objects as permissive for select to authenticated
  using (((bucket_id = 'message-attachments'::text) AND can_access_message_attachment(name)));
drop policy if exists "read question attachments as participant" on storage.objects;
create policy "read question attachments as participant" on storage.objects as permissive for select to authenticated
  using (((bucket_id = 'question-attachments'::text) AND can_access_question_attachment(name)));
drop policy if exists "student uploads own question attachment" on storage.objects;
create policy "student uploads own question attachment" on storage.objects as permissive for insert to authenticated
  with check (((bucket_id = 'question-attachments'::text) AND owns_question(((storage.foldername(name))[1])::uuid)));
drop policy if exists "upload message attachments as participant" on storage.objects;
create policy "upload message attachments as participant" on storage.objects as permissive for insert to authenticated
  with check (((bucket_id = 'message-attachments'::text) AND can_access_message_attachment(name)));
drop policy if exists "users delete own avatar" on storage.objects;
create policy "users delete own avatar" on storage.objects as permissive for delete to authenticated
  using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
drop policy if exists "users update own avatar" on storage.objects;
create policy "users update own avatar" on storage.objects as permissive for update to authenticated
  using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)))
  with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
drop policy if exists "users update own id doc" on storage.objects;
create policy "users update own id doc" on storage.objects as permissive for update to authenticated
  using (((bucket_id = 'id-documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)))
  with check (((bucket_id = 'id-documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
drop policy if exists "users upload own avatar" on storage.objects;
create policy "users upload own avatar" on storage.objects as permissive for insert to authenticated
  with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
drop policy if exists "users upload own id doc" on storage.objects;
create policy "users upload own id doc" on storage.objects as permissive for insert to authenticated
  with check (((bucket_id = 'id-documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
$dalili$);

select pg_temp.dalili_run('indexes', $dalili$
CREATE INDEX IF NOT EXISTS idx_ads_active_order ON public.ads USING btree (active, sort_order);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements USING btree (active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_papers_subject ON public.exam_papers USING btree (subject_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_exam_papers_teacher ON public.exam_papers USING btree (teacher_id);
CREATE INDEX IF NOT EXISTS idx_messages_question ON public.messages USING btree (question_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages USING btree (recipient_id);
CREATE INDEX IF NOT EXISTS idx_news_created ON public.news USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_question ON public.notifications USING btree (question_id);
CREATE INDEX IF NOT EXISTS idx_notifications_teacher ON public.notifications USING btree (teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_questions_student ON public.questions USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON public.questions USING btree (subject_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON public.quiz_attempts USING btree (student_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions USING btree (quiz_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_quizzes_subject ON public.quizzes USING btree (subject_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_teacher ON public.quizzes USING btree (teacher_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals USING btree (referrer_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports USING btree (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reset_attempts_ip_time ON public.reset_attempts USING btree (ip, created_at);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_gov ON public.teacher_profiles USING btree (governorate_id);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_status ON public.teacher_profiles USING btree (verification_status);
CREATE INDEX IF NOT EXISTS idx_teacher_ratings_teacher ON public.teacher_ratings USING btree (teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_stages_stage ON public.teacher_stages USING btree (stage_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject ON public.teacher_subjects USING btree (subject_id);
CREATE INDEX IF NOT EXISTS idx_teacher_views_teacher ON public.teacher_views USING btree (teacher_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_open_report ON public.reports USING btree (reporter_id, reported_id) WHERE (status = 'open'::text);
$dalili$);

select pg_temp.dalili_run('storage: bucket size/type limits', $dalili$
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ads', 'ads', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('id-documents', 'id-documents', false, 10485760, array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('message-attachments', 'message-attachments', false, 10485760, array['image/png','image/jpeg','image/webp','image/gif','application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('question-attachments', 'question-attachments', false, 10485760, array['image/png','image/jpeg','image/webp','image/gif','application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('study-resources', 'study-resources', true, 20971520, array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
$dalili$);

create temp table dalili_exp_fn(sig text, h text);
insert into dalili_exp_fn values
  ('can_access_message_attachment(text)', '340f1ac427541be816ee970a1fc453cc'),
  ('can_access_question_attachment(text)', 'cbb80b06a5be828babfcbd036f9d4a7c'),
  ('check_reset_rate_limit(text,integer,interval)', '67d5aa2189ec273b65e9dc7d5ab7bd0b'),
  ('check_security_answer(uuid,text)', 'c890997070a14ffb74408fdb040eb6c2'),
  ('clamp_teacher_insert()', 'db4fcbdb222f519e52f0ed83a50d9eae'),
  ('enforce_message_integrity()', 'e6978460fd06756e1c1d82d395131d93'),
  ('enforce_question_integrity()', '3d9afc55da3ee465ecec76d136b1c34f'),
  ('enforce_question_rate_limit()', '3f6ec57cede0aacfe32198d3b7e424bf'),
  ('fanout_question_notifications()', 'a1531456dd7ead9d7d425f5d04d11768'),
  ('grade_quiz(uuid,jsonb)', 'be851b722f27d92f8660baf70d219517'),
  ('guard_notification_answer()', '2b7814aec2db61d638078a059910bfdf'),
  ('guard_notification_keys()', 'dbc386b8a135c170c6e92c4d87e7c794'),
  ('guard_push_endpoint()', 'ca83de5e0f13a588194fb96add6783f3'),
  ('guard_question_keys()', '36480a46499ef2a6388037575c82ae9d'),
  ('guard_report_insert()', '9d49422e8f167809b57ed0c35eb8c188'),
  ('handle_new_user()', '79b6430e7775e068c8a3d244ef5e569d'),
  ('handle_notification_answered()', '8659992224365babaaa11875f3495e86'),
  ('handle_student_stage_change()', '22e990bac27a314ee7a364de5a99a874'),
  ('has_role(user_role)', '4afc6e9b9ee836d508b40cbcc20567c5'),
  ('has_security_credential()', 'de914d004b3f5305b1f91a93dbed08d8'),
  ('haversine_km(double precision,double precision,double precision,double precision)', 'b4dea03628b293673b0ee13f5b3aee40'),
  ('is_account_deactivated(uuid)', 'e901ca034ec0fcb800bb3b10e1617483'),
  ('is_admin()', '93ce99f9d4bd1e0f6d29c7021567642a'),
  ('is_allowed_push_endpoint(text)', 'c14315358859a9a64c5ff2f851b2a699'),
  ('is_approved_teacher()', '75ddbc1fc7eb3a0655e98d942d1c3167'),
  ('is_approved_teacher_of(uuid)', 'ac80910ee0ba3a51342d53b8da9a0545'),
  ('is_banned(uuid)', '141200efa6c8447f2644b6c7e73acebc'),
  ('is_dangerous_url(text)', '1d4f402c5f916e8250672308e7f0aa7f'),
  ('is_notified_teacher(uuid)', '4410ca7415a346d3f7415702b3b67ee7'),
  ('is_student(uuid)', '6ba9760b4bce5e1f522eff623f1721fa'),
  ('is_super_admin()', '3cb55f88689db18b0cd1f5ae897c1ae7'),
  ('is_teacher(uuid)', 'd02ad4365711d5bb2daf35821fe62871'),
  ('is_valid_youtube_url(text)', '4a1da77efcf92c6ced179caf375026e4'),
  ('limit_teacher_content()', 'b4b81313ebd79d12ab8a2228f41f8e95'),
  ('map_teachers(uuid,smallint)', '543181140ac01430a6168c09c4000c36'),
  ('my_referral_code()', '6c16eae138dd6d4802253aee7d3a2925'),
  ('norm_answer(text)', '7b26db60febe825d8f9d9b14edf724fe'),
  ('notify_push_on_insert()', '0f5e98cfcf3e0605c152745e6b907ac2'),
  ('owns_question(uuid)', 'df0eb932e1b1199dea35179d3edb53e9'),
  ('protect_account_ban()', 'c9c1fb32d5e912b87cc673c0198196c5'),
  ('protect_teacher_privileged_fields()', 'd67fd6a47efa5864917708a1a6a5bb6d'),
  ('record_referral(text)', 'b5cf73f04b6a5f910890852bc100b61e'),
  ('record_teacher_view(uuid)', '69bb06b2f3d1b3f7e7234a961657c40a'),
  ('reset_lookup_user(text)', 'cdfcac7188ab1a7ec8c21096fe6ad46c'),
  ('sanitize_teacher_links()', '35b9b4a6aeed430deac248406ecf9b4b'),
  ('search_teachers(uuid,smallint,smallint,smallint)', '08aca8f9e704c80aaf36aad0293d4c22'),
  ('set_security_credential(text,text)', '1aff2e7ea31382d67754db6ca92f6682'),
  ('set_updated_at()', '727866738d9aa5007301b5b92d112fce'),
  ('validate_quiz_question()', '7f76856687336c3e51fce9b7b1c7db57');

create temp table dalili_exp_trg(tbl text, name text);
insert into dalili_exp_trg values
  ('public.account_status', 'trg_protect_account_ban'),
  ('public.announcements', 'trg_push_announcements'),
  ('public.exam_papers', 'trg_limit_exam_papers'),
  ('public.messages', 'trg_message_integrity'),
  ('public.messages', 'trg_push_messages'),
  ('public.notifications', 'trg_guard_notification_answer'),
  ('public.notifications', 'trg_guard_notification_keys'),
  ('public.notifications', 'trg_notification_answered'),
  ('public.notifications', 'trg_push_notifications'),
  ('public.push_subscriptions', 'trg_guard_push_endpoint'),
  ('public.questions', 'trg_aa_question_integrity'),
  ('public.questions', 'trg_fanout_question_notifications'),
  ('public.questions', 'trg_guard_question_keys'),
  ('public.questions', 'trg_question_rate_limit'),
  ('public.quiz_questions', 'trg_validate_quiz_question'),
  ('public.quizzes', 'trg_limit_quizzes'),
  ('public.reports', 'trg_guard_report_insert'),
  ('public.student_profiles', 'trg_student_profiles_updated_at'),
  ('public.student_profiles', 'trg_student_stage_change'),
  ('public.teacher_profiles', 'trg_clamp_teacher_insert'),
  ('public.teacher_profiles', 'trg_protect_teacher_fields'),
  ('public.teacher_profiles', 'trg_sanitize_teacher_links'),
  ('public.teacher_profiles', 'trg_teacher_profiles_updated_at'),
  ('auth.users', 'on_auth_user_created');

create temp table dalili_exp_pol(tbl text, name text, cmd text, h text);
insert into dalili_exp_pol values
  ('public.account_status', 'admin manages account status', 'ALL', '1239a6a60b2c9a3e337b843e5e512f88'),
  ('public.account_status', 'admin reads all status', 'SELECT', '811cb83ad86278a533f95101f0808e26'),
  ('public.account_status', 'owner inserts own status', 'INSERT', '4f8b4689a22ce197f6ac6539ef981f22'),
  ('public.account_status', 'owner reads own status', 'SELECT', 'fe64da596569454d53a69ee4ca3ca533'),
  ('public.account_status', 'owner updates own status', 'UPDATE', '5090ca774a4a0dca7a30fef3dc002ec4'),
  ('public.ads', 'active ads readable by everyone', 'SELECT', 'b7909cc27a8b07932cfefab3c674df75'),
  ('public.ads', 'admin reads all ads', 'SELECT', '811cb83ad86278a533f95101f0808e26'),
  ('public.ads', 'only admin writes ads', 'ALL', '1239a6a60b2c9a3e337b843e5e512f88'),
  ('public.announcements', 'admin deletes announcements', 'DELETE', '811cb83ad86278a533f95101f0808e26'),
  ('public.announcements', 'admin inserts announcements', 'INSERT', 'f503f93259043fefa4695918fe88098a'),
  ('public.announcements', 'admin updates announcements', 'UPDATE', '1239a6a60b2c9a3e337b843e5e512f88'),
  ('public.announcements', 'read my announcements', 'SELECT', 'a3f9975502a4688ceb8b259d04cd51ad'),
  ('public.exam_papers', 'approved teacher inserts own exam papers', 'INSERT', '083cdc5fffae2dc850a2b72bd3056e07'),
  ('public.exam_papers', 'owner or admin deletes exam papers', 'DELETE', 'e37a3f0081ef77cf0704e4257e22f024'),
  ('public.exam_papers', 'owner or admin updates exam papers', 'UPDATE', 'f05f47980a8df8a00a26e568d1fde9db'),
  ('public.exam_papers', 'read exam papers', 'SELECT', '4fd076d7bbc060321062deaf88475bea'),
  ('public.governorates', 'governorates readable by everyone', 'SELECT', '8fc83448cc1729047ef68f79e32e6460'),
  ('public.governorates', 'only admin writes governorates', 'ALL', '1239a6a60b2c9a3e337b843e5e512f88'),
  ('public.messages', 'banned cannot send messages', 'INSERT', '1281cab6d3d71d2ca2996022dfe1454a'),
  ('public.messages', 'participant sends messages', 'INSERT', 'ca39fba524532e9a1c9f028330d3cdba'),
  ('public.messages', 'read messages as participant or admin', 'SELECT', 'd319d6172b47082a92c7c85d4c62f7f3'),
  ('public.messages', 'sender or admin deletes messages', 'DELETE', 'd7033da92e4ba5a6f548347151bb41af'),
  ('public.news', 'news readable by everyone', 'SELECT', '8fc83448cc1729047ef68f79e32e6460'),
  ('public.news', 'only admin writes news', 'ALL', '1239a6a60b2c9a3e337b843e5e512f88'),
  ('public.notifications', 'only admin deletes notifications', 'DELETE', '811cb83ad86278a533f95101f0808e26'),
  ('public.notifications', 'only admin inserts notifications directly', 'INSERT', 'f503f93259043fefa4695918fe88098a'),
  ('public.notifications', 'read notifications as teacher, question owner, or admin', 'SELECT', '43398dfb3c48f3a09ffec2d9540cacf1'),
  ('public.notifications', 'teacher, question owner, or admin updates notifications', 'UPDATE', 'f12834c514bce3833218239ca80d1826'),
  ('public.push_subscriptions', 'owner manages own push subscriptions', 'ALL', '5090ca774a4a0dca7a30fef3dc002ec4'),
  ('public.questions', 'banned cannot ask', 'INSERT', '1281cab6d3d71d2ca2996022dfe1454a'),
  ('public.questions', 'read questions as owner, notified teacher, or admin', 'SELECT', '0871b8c749b64272a7aa31fd0cd05589'),
  ('public.questions', 'student creates own questions', 'INSERT', '4d9c3fb7fc64e91080901aa3483bb62c'),
  ('public.questions', 'student or admin deletes questions', 'DELETE', '47ab1453061f1f48c5ed2e7759facbab'),
  ('public.questions', 'student or admin updates questions', 'UPDATE', '616d7b12926c97f3412db6106394350b'),
  ('public.quiz_attempts', 'student or quiz owner reads attempts', 'SELECT', '89962ee859b7cbe5a4f66c8ce928360a'),
  ('public.quiz_questions', 'owner or admin deletes quiz questions', 'DELETE', '2b6fff8325eaa81f14a813e0f4b7d493'),
  ('public.quiz_questions', 'owner or admin reads quiz questions', 'SELECT', '2b6fff8325eaa81f14a813e0f4b7d493'),
  ('public.quiz_questions', 'owner updates quiz questions', 'UPDATE', '1e7d0dcb452c8f129d4206b9e4a2624a'),
  ('public.quiz_questions', 'owner writes quiz questions', 'INSERT', '5a2b596c10aa5e91013a05b1936e3683'),
  ('public.quizzes', 'approved teacher inserts own quizzes', 'INSERT', '083cdc5fffae2dc850a2b72bd3056e07'),
  ('public.quizzes', 'owner or admin deletes quizzes', 'DELETE', 'e37a3f0081ef77cf0704e4257e22f024'),
  ('public.quizzes', 'owner or admin updates quizzes', 'UPDATE', 'f05f47980a8df8a00a26e568d1fde9db'),
  ('public.quizzes', 'read quizzes', 'SELECT', '4fd076d7bbc060321062deaf88475bea'),
  ('public.referrals', 'referrer reads own referrals', 'SELECT', '4fb581a54269946ead4d830cd46c6f4c'),
  ('public.reports', 'admin reads reports', 'SELECT', '811cb83ad86278a533f95101f0808e26'),
  ('public.reports', 'admin updates reports', 'UPDATE', '1239a6a60b2c9a3e337b843e5e512f88'),
  ('public.reports', 'reporter reads own reports', 'SELECT', '65ad11c1b243d2ab75f8a4e6aa301b7e'),
  ('public.reports', 'user files a report', 'INSERT', '6637934538d687a3c6fd113fec3d1b7a'),
  ('public.stages', 'only admin writes stages', 'ALL', '1239a6a60b2c9a3e337b843e5e512f88'),
  ('public.stages', 'stages readable by everyone', 'SELECT', '8fc83448cc1729047ef68f79e32e6460'),
  ('public.student_profiles', 'student deletes own profile', 'DELETE', '3abd250ea7469a43c288e3a840482809'),
  ('public.student_profiles', 'student inserts own profile', 'INSERT', '4f8b4689a22ce197f6ac6539ef981f22'),
  ('public.student_profiles', 'student reads own profile', 'SELECT', '3abd250ea7469a43c288e3a840482809'),
  ('public.student_profiles', 'student updates own profile', 'UPDATE', 'c770a528b1d43ebfd81359c49e8bd23e'),
  ('public.subjects', 'only admin writes subjects', 'ALL', '1239a6a60b2c9a3e337b843e5e512f88'),
  ('public.subjects', 'subjects readable by everyone', 'SELECT', '8fc83448cc1729047ef68f79e32e6460'),
  ('public.teacher_profiles', 'admin reads all teacher profiles', 'SELECT', '811cb83ad86278a533f95101f0808e26'),
  ('public.teacher_profiles', 'teacher deletes own profile', 'DELETE', '3abd250ea7469a43c288e3a840482809'),
  ('public.teacher_profiles', 'teacher inserts own pending profile', 'INSERT', '6aae72d15df89e4ba71193ede0f3a75f'),
  ('public.teacher_profiles', 'teacher reads own profile', 'SELECT', 'fe64da596569454d53a69ee4ca3ca533'),
  ('public.teacher_profiles', 'teacher updates own profile', 'UPDATE', 'c770a528b1d43ebfd81359c49e8bd23e'),
  ('public.teacher_ratings', 'admin edits any rating', 'UPDATE', '1239a6a60b2c9a3e337b843e5e512f88'),
  ('public.teacher_ratings', 'banned cannot rate', 'INSERT', '1281cab6d3d71d2ca2996022dfe1454a'),
  ('public.teacher_ratings', 'owner or admin deletes rating', 'DELETE', '47ab1453061f1f48c5ed2e7759facbab'),
  ('public.teacher_ratings', 'ratings are public', 'SELECT', '8fc83448cc1729047ef68f79e32e6460'),
  ('public.teacher_ratings', 'student rates an interacted teacher', 'INSERT', 'c752bc58a86cb187de69ae52942e2c6d'),
  ('public.teacher_ratings', 'student updates own rating', 'UPDATE', '4178473a6dfc89d9273dbfcf225b8aa1'),
  ('public.teacher_stages', 'teacher manages own stages', 'ALL', '39fa44e73f3e87536c1272c064e1772d'),
  ('public.teacher_stages', 'teacher_stages readable by everyone', 'SELECT', '8fc83448cc1729047ef68f79e32e6460'),
  ('public.teacher_subjects', 'teacher manages own subjects', 'ALL', '39fa44e73f3e87536c1272c064e1772d'),
  ('public.teacher_subjects', 'teacher_subjects readable by everyone', 'SELECT', '8fc83448cc1729047ef68f79e32e6460'),
  ('public.teacher_views', 'teacher reads own views', 'SELECT', 'fb9903660c4786ef3110a736e50c344f'),
  ('public.user_roles', 'only super admin manages roles', 'ALL', '9471e5b107c2f1bdc0d569dbd002bf62'),
  ('public.user_roles', 'read own roles or admin reads all', 'SELECT', '3abd250ea7469a43c288e3a840482809'),
  ('storage.objects', 'ad images are publicly readable', 'SELECT', '743be5c1a3c966ab4bad471d1ff64869'),
  ('storage.objects', 'approved teacher uploads study resources', 'INSERT', '42ea1d97bc8c2c628bd7fa730d6e09a6'),
  ('storage.objects', 'avatars are publicly readable', 'SELECT', '7ca7f8e7a61af4caf629bef9bbeca030'),
  ('storage.objects', 'delete message attachments as participant', 'DELETE', '45da8acddb832beb65e7ed3ddb721bea'),
  ('storage.objects', 'id docs readable by owner or admin', 'SELECT', '3788e06841bc7da624d0fa704ab0b3d1'),
  ('storage.objects', 'only admin deletes ad images', 'DELETE', 'f9d5fce0a22a3bc437aad569ba1737f1'),
  ('storage.objects', 'only admin updates ad images', 'UPDATE', '81ec71053cce8482e2d9cfe7cc0f8c68'),
  ('storage.objects', 'only admin uploads ad images', 'INSERT', '703ce7087296b90642976c520125dc7a'),
  ('storage.objects', 'owner or admin deletes id doc', 'DELETE', '3788e06841bc7da624d0fa704ab0b3d1'),
  ('storage.objects', 'owner or admin deletes question attachment', 'DELETE', 'aa4b2d988a59ce3e926bcc2ac921a46c'),
  ('storage.objects', 'owner or admin deletes study resources', 'DELETE', 'aae49805d9ef0f3c45fe74a0be7c1623'),
  ('storage.objects', 'read message attachments as participant', 'SELECT', '45da8acddb832beb65e7ed3ddb721bea'),
  ('storage.objects', 'read question attachments as participant', 'SELECT', 'd7a9cf5b35ebec11b48b2c47d067f153'),
  ('storage.objects', 'student uploads own question attachment', 'INSERT', 'ba7f9e0ac7f9ea04ba223d644cf0dadc'),
  ('storage.objects', 'upload message attachments as participant', 'INSERT', '9fce5b7d24a3b3ed4700871b3b504c8a'),
  ('storage.objects', 'users delete own avatar', 'DELETE', '1e7367bd42920eba634408cc6a23c551'),
  ('storage.objects', 'users update own avatar', 'UPDATE', 'fdf437d6e2baa45f9caf4e6c2873d582'),
  ('storage.objects', 'users update own id doc', 'UPDATE', '9c5a616096842d7096942dae5a439c06'),
  ('storage.objects', 'users upload own avatar', 'INSERT', 'f341e52f73138c95f399449aa1a45f47'),
  ('storage.objects', 'users upload own id doc', 'INSERT', '43e9848f22b95147f11b8e0a1f78f65d');

create temp table dalili_exp_col(tbl text, col text);
insert into dalili_exp_col values
  ('account_status', 'user_id'),
  ('account_status', 'deactivated'),
  ('account_status', 'updated_at'),
  ('account_status', 'banned'),
  ('ads', 'id'),
  ('ads', 'image_url'),
  ('ads', 'caption'),
  ('ads', 'sort_order'),
  ('ads', 'active'),
  ('ads', 'created_at'),
  ('ads', 'contact_info'),
  ('announcements', 'id'),
  ('announcements', 'audience'),
  ('announcements', 'target_user_id'),
  ('announcements', 'kind'),
  ('announcements', 'title'),
  ('announcements', 'body'),
  ('announcements', 'active'),
  ('announcements', 'created_at'),
  ('app_config', 'key'),
  ('app_config', 'value'),
  ('exam_papers', 'id'),
  ('exam_papers', 'teacher_id'),
  ('exam_papers', 'subject_id'),
  ('exam_papers', 'stage_id'),
  ('exam_papers', 'year'),
  ('exam_papers', 'title'),
  ('exam_papers', 'file_path'),
  ('exam_papers', 'file_mime'),
  ('exam_papers', 'file_name'),
  ('exam_papers', 'created_at'),
  ('governorates', 'id'),
  ('governorates', 'name'),
  ('governorates', 'latitude'),
  ('governorates', 'longitude'),
  ('messages', 'id'),
  ('messages', 'question_id'),
  ('messages', 'sender_id'),
  ('messages', 'body'),
  ('messages', 'sent_at'),
  ('messages', 'recipient_id'),
  ('messages', 'attachment_path'),
  ('messages', 'attachment_mime'),
  ('messages', 'attachment_name'),
  ('news', 'id'),
  ('news', 'image_url'),
  ('news', 'caption'),
  ('news', 'created_at'),
  ('notifications', 'id'),
  ('notifications', 'question_id'),
  ('notifications', 'teacher_id'),
  ('notifications', 'status'),
  ('notifications', 'sent_at'),
  ('push_subscriptions', 'endpoint'),
  ('push_subscriptions', 'user_id'),
  ('push_subscriptions', 'p256dh'),
  ('push_subscriptions', 'auth'),
  ('push_subscriptions', 'created_at'),
  ('questions', 'id'),
  ('questions', 'student_id'),
  ('questions', 'subject_id'),
  ('questions', 'stage_id'),
  ('questions', 'governorate_id'),
  ('questions', 'question_text'),
  ('questions', 'status'),
  ('questions', 'created_at'),
  ('questions', 'attachment_path'),
  ('questions', 'attachment_mime'),
  ('questions', 'attachment_name'),
  ('quiz_attempts', 'id'),
  ('quiz_attempts', 'quiz_id'),
  ('quiz_attempts', 'student_id'),
  ('quiz_attempts', 'score'),
  ('quiz_attempts', 'total'),
  ('quiz_attempts', 'created_at'),
  ('quiz_questions', 'id'),
  ('quiz_questions', 'quiz_id'),
  ('quiz_questions', 'prompt'),
  ('quiz_questions', 'options'),
  ('quiz_questions', 'correct_index'),
  ('quiz_questions', 'sort_order'),
  ('quiz_questions_public', 'id'),
  ('quiz_questions_public', 'quiz_id'),
  ('quiz_questions_public', 'prompt'),
  ('quiz_questions_public', 'options'),
  ('quiz_questions_public', 'sort_order'),
  ('quizzes', 'id'),
  ('quizzes', 'teacher_id'),
  ('quizzes', 'subject_id'),
  ('quizzes', 'stage_id'),
  ('quizzes', 'chapter'),
  ('quizzes', 'title'),
  ('quizzes', 'created_at'),
  ('referral_codes', 'user_id'),
  ('referral_codes', 'code'),
  ('referral_codes', 'created_at'),
  ('referrals', 'id'),
  ('referrals', 'referrer_id'),
  ('referrals', 'referred_id'),
  ('referrals', 'code'),
  ('referrals', 'created_at'),
  ('reports', 'id'),
  ('reports', 'reporter_id'),
  ('reports', 'reported_id'),
  ('reports', 'context_type'),
  ('reports', 'context_id'),
  ('reports', 'reason'),
  ('reports', 'status'),
  ('reports', 'created_at'),
  ('reset_attempts', 'id'),
  ('reset_attempts', 'ip'),
  ('reset_attempts', 'created_at'),
  ('security_credentials', 'user_id'),
  ('security_credentials', 'question'),
  ('security_credentials', 'answer_hash'),
  ('security_credentials', 'failed_attempts'),
  ('security_credentials', 'locked_until'),
  ('security_credentials', 'updated_at'),
  ('stages', 'id'),
  ('stages', 'name'),
  ('stages', 'sort_order'),
  ('student_profiles', 'user_id'),
  ('student_profiles', 'full_name'),
  ('student_profiles', 'phone'),
  ('student_profiles', 'governorate_id'),
  ('student_profiles', 'stage_id'),
  ('student_profiles', 'id_document_url'),
  ('student_profiles', 'created_at'),
  ('student_profiles', 'updated_at'),
  ('subjects', 'id'),
  ('subjects', 'name'),
  ('subjects', 'active'),
  ('subjects', 'created_by'),
  ('subjects', 'created_at'),
  ('teacher_directory', 'user_id'),
  ('teacher_directory', 'full_name'),
  ('teacher_directory', 'photo_url'),
  ('teacher_directory', 'school'),
  ('teacher_directory', 'institute'),
  ('teacher_directory', 'bio'),
  ('teacher_directory', 'years_experience'),
  ('teacher_directory', 'gender'),
  ('teacher_directory', 'answered_count'),
  ('teacher_directory', 'avg_rating'),
  ('teacher_directory', 'rating_count'),
  ('teacher_directory', 'featured'),
  ('teacher_directory', 'location_visible'),
  ('teacher_directory', 'governorate_id'),
  ('teacher_directory', 'governorate_name'),
  ('teacher_directory', 'latitude'),
  ('teacher_directory', 'longitude'),
  ('teacher_directory', 'subjects'),
  ('teacher_directory', 'stages'),
  ('teacher_directory', 'youtube_url'),
  ('teacher_profiles', 'user_id'),
  ('teacher_profiles', 'full_name'),
  ('teacher_profiles', 'phone'),
  ('teacher_profiles', 'school'),
  ('teacher_profiles', 'institute'),
  ('teacher_profiles', 'governorate_id'),
  ('teacher_profiles', 'telegram_url'),
  ('teacher_profiles', 'instagram_url'),
  ('teacher_profiles', 'contact_email'),
  ('teacher_profiles', 'photo_url'),
  ('teacher_profiles', 'id_document_url'),
  ('teacher_profiles', 'location_visible'),
  ('teacher_profiles', 'verification_status'),
  ('teacher_profiles', 'answered_count'),
  ('teacher_profiles', 'created_at'),
  ('teacher_profiles', 'updated_at'),
  ('teacher_profiles', 'bio'),
  ('teacher_profiles', 'years_experience'),
  ('teacher_profiles', 'gender'),
  ('teacher_profiles', 'featured_until'),
  ('teacher_profiles', 'youtube_url'),
  ('teacher_profiles', 'views_base'),
  ('teacher_ratings', 'student_id'),
  ('teacher_ratings', 'teacher_id'),
  ('teacher_ratings', 'rating'),
  ('teacher_ratings', 'comment'),
  ('teacher_ratings', 'created_at'),
  ('teacher_ratings', 'updated_at'),
  ('teacher_stages', 'teacher_id'),
  ('teacher_stages', 'stage_id'),
  ('teacher_subjects', 'teacher_id'),
  ('teacher_subjects', 'subject_id'),
  ('teacher_views', 'id'),
  ('teacher_views', 'teacher_id'),
  ('teacher_views', 'viewer_id'),
  ('teacher_views', 'created_at'),
  ('user_roles', 'user_id'),
  ('user_roles', 'role'),
  ('user_roles', 'granted_at'),
  ('user_roles', 'active'),
  ('user_roles', 'super');

create temp table dalili_exp_idx(name text);
insert into dalili_exp_idx values
  ('idx_ads_active_order'),
  ('idx_announcements_active'),
  ('idx_exam_papers_subject'),
  ('idx_exam_papers_teacher'),
  ('idx_messages_question'),
  ('idx_messages_recipient'),
  ('idx_news_created'),
  ('idx_notifications_question'),
  ('idx_notifications_teacher'),
  ('idx_push_subscriptions_user'),
  ('idx_questions_student'),
  ('idx_questions_subject'),
  ('idx_quiz_attempts_student'),
  ('idx_quiz_questions_quiz'),
  ('idx_quizzes_subject'),
  ('idx_quizzes_teacher'),
  ('idx_referrals_referrer'),
  ('idx_reports_status'),
  ('idx_reset_attempts_ip_time'),
  ('idx_teacher_profiles_gov'),
  ('idx_teacher_profiles_status'),
  ('idx_teacher_ratings_teacher'),
  ('idx_teacher_stages_stage'),
  ('idx_teacher_subjects_subject'),
  ('idx_teacher_views_teacher'),
  ('uniq_open_report');


with cur as (
  select p.oid::regprocedure::text as sig, md5(regexp_replace(p.prosrc, '\s+', '', 'g')) as h
  from pg_proc p where p.pronamespace = 'public'::regnamespace
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
)
insert into dalili_report(kind, item, detail)
select 'function MISSING', e.sig, '' from dalili_exp_fn e where not exists (select 1 from cur c where c.sig = e.sig)
union all select 'function DIFFERS', e.sig, '' from dalili_exp_fn e join cur c on c.sig = e.sig where c.h <> e.h
union all select 'function EXTRA', c.sig, 'not in repo' from cur c where not exists (select 1 from dalili_exp_fn e where e.sig = c.sig);

with cur as (
  select c.relnamespace::regnamespace::text || '.' || c.relname as tbl, t.tgname as name
  from pg_trigger t join pg_class c on c.oid = t.tgrelid
  where not t.tgisinternal and c.relnamespace::regnamespace::text in ('public', 'auth')
)
insert into dalili_report(kind, item, detail)
select 'trigger MISSING', e.tbl, e.name from dalili_exp_trg e where not exists (select 1 from cur c where c.tbl = e.tbl and c.name = e.name)
union all select 'trigger EXTRA', c.tbl, c.name from cur c where c.tbl like 'public.%' and not exists (select 1 from dalili_exp_trg e where e.tbl = c.tbl and e.name = c.name);

with cur as (
  select schemaname || '.' || tablename as tbl, policyname as name, cmd,
         md5(regexp_replace(coalesce(qual, '') || '#' || coalesce(with_check, ''), '\s+', '', 'g')) as h
  from pg_policies where schemaname in ('public', 'storage')
), diffs as (
  select e.tbl, e.name from dalili_exp_pol e join cur c on c.tbl = e.tbl and c.name = e.name where c.h <> e.h or c.cmd <> e.cmd
)
insert into dalili_report(kind, item, detail)
select 'policy MISSING', e.tbl, e.name from dalili_exp_pol e where not exists (select 1 from cur c where c.tbl = e.tbl and c.name = e.name)
union all select 'policy EXTRA', c.tbl, c.name || ' [' || c.cmd || ']' from cur c where not exists (select 1 from dalili_exp_pol e where e.tbl = c.tbl and e.name = c.name)
union all select 'policy DIFFERS', d.tbl, d.name from diffs d where (select count(*) from diffs) <= 15
union all select 'policy text format', count(*) || ' policies', 'formatting only (different Postgres version) - ignore' from diffs having count(*) > 15;

with cur as (select table_name as tbl, column_name as col from information_schema.columns where table_schema = 'public')
insert into dalili_report(kind, item, detail)
select 'column MISSING', e.tbl, e.col from dalili_exp_col e where not exists (select 1 from cur c where c.tbl = e.tbl and c.col = e.col)
union all select 'column EXTRA', c.tbl, c.col from cur c where not exists (select 1 from dalili_exp_col e where e.tbl = c.tbl and e.col = c.col);

insert into dalili_report(kind, item, detail)
select 'index MISSING', e.name, '' from dalili_exp_idx e
where not exists (select 1 from pg_indexes i where i.schemaname = 'public' and i.indexname = e.name);

insert into dalili_report(kind, item, detail)
select 'table WITHOUT RLS', c.relname, '' from pg_class c
where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and not c.relrowsecurity;

insert into dalili_report(kind, item, detail)
select 'privilege PROBLEM', 'view writable by ' || r.rolname, c.relname
from pg_class c cross join (select rolname from pg_roles where rolname in ('anon', 'authenticated')) r
where c.relnamespace = 'public'::regnamespace and c.relkind = 'v'
  and (has_table_privilege(r.rolname, c.oid, 'INSERT') or has_table_privilege(r.rolname, c.oid, 'UPDATE') or has_table_privilege(r.rolname, c.oid, 'DELETE'));

insert into dalili_report(kind, item, detail)
select 'privilege PROBLEM', 'client can call ' || p.oid::regprocedure::text, r.rolname
from pg_proc p cross join (select rolname from pg_roles where rolname in ('anon', 'authenticated')) r
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('check_security_answer', 'check_reset_rate_limit', 'reset_lookup_user')
  and has_function_privilege(r.rolname, p.oid, 'EXECUTE');

insert into dalili_report(kind, item, detail)
select 'privilege PROBLEM', 'anon can read teacher_profiles rows', count(*)::text
from pg_policies where schemaname = 'public' and tablename = 'teacher_profiles' and cmd in ('SELECT', 'ALL') and 'anon' = any(roles)
having count(*) > 0;

insert into dalili_report(kind, item, detail)
select 'summary',
       (select count(*) from dalili_report where kind = 'section' and detail = 'OK') || ' sections OK, ' ||
       (select count(*) from dalili_report where kind = 'section' and detail <> 'OK') || ' FAILED',
       (select count(*) from dalili_report where kind not in ('section', 'summary')) || ' differences remaining | postgres ' || current_setting('server_version');

-- التقرير النهائي: الفاشل أولاً، ثم الفروقات، ثم الملخّص (الأقسام الناجحة لا تُعرض)
select kind, item, detail from dalili_report
where not (kind = 'section' and detail = 'OK')
order by (kind = 'summary'), (kind <> 'section'), ord;
