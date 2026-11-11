-- =============================================================
-- 20260802090041_security_audit_fixes.sql — إصلاحات التدقيق الأمني الشامل
--
-- كل بند أُثبت عملياً (هجوم ناجح) على نسخة محلية تحاكي صلاحيات Supabase
-- الافتراضية، ثم أُعيد الاختبار بعد الإصلاح. الملف آمن للتكرار (idempotent).
--
--  (1) CRITICAL  العرض quiz_questions_public كان يقبل UPDATE/DELETE من أي
--                زائر (العروض تأخذ صلاحيات افتراضية كاملة وتتجاوز RLS).
--  (2) HIGH      دوال استرجاع كلمة المرور كانت قابلة للاستدعاء مباشرةً من
--                العميل (revoke from public لا يسحب منح anon/authenticated).
--  (3) HIGH      المحظور يفكّ حظر نفسه بحذف صفّه من account_status.
--  (4) HIGH      تضخيم عدّاد «أجاب على X» بتبديل حالة الإشعار.
--  (5) HIGH      رابط javascript: يُخزَّن في بروفايل المدرّس (XSS مخزّن).
--  (6) MEDIUM    المدرّس ينقل محتواه لمادة ليست له / المحظور ينشر محتوى.
--  (7) MEDIUM    الطالب يعدّل تاريخ/مفاتيح سؤاله (تجاوز حدّ المعدّل).
--  (8) MEDIUM    مدير ثانٍ يحظر المدير الأساسي.
--  (9) LOW       حدود حجم ومعدّل ناقصة (نصوص، محاولات، مشاهدات، بلاغات…).
-- (10) LOW       استرجاع كلمة المرور يبحث بهاتف البروفايل (قابل للتعديل).
-- =============================================================


-- ======================================================================
-- (1) العروض: قراءة فقط — لا كتابة عبر العرض إطلاقاً
-- ======================================================================
revoke all on public.quiz_questions_public from public, anon, authenticated;
grant select on public.quiz_questions_public to authenticated;

revoke insert, update, delete, truncate, references, trigger
  on public.teacher_directory from public, anon, authenticated;


-- ======================================================================
-- (2) دوال الخادم فقط: اسحب التنفيذ من أدوار العميل صراحةً
-- ======================================================================
revoke execute on function public.check_security_answer(uuid, text)
  from public, anon, authenticated;
revoke execute on function public.check_reset_rate_limit(text, integer, interval)
  from public, anon, authenticated;
grant execute on function public.check_security_answer(uuid, text) to service_role;
grant execute on function public.check_reset_rate_limit(text, integer, interval) to service_role;

-- دوال تخصّ المسجّلين فقط: لا حاجة للزائر بها (تقليل سطح الهجوم)
revoke execute on function public.grade_quiz(uuid, jsonb) from public, anon;
revoke execute on function public.my_referral_code() from public, anon;
revoke execute on function public.record_referral(text) from public, anon;
revoke execute on function public.set_security_credential(text, text) from public, anon;
grant execute on function public.set_security_credential(text, text) to authenticated;


-- ======================================================================
-- (10) استرجاع كلمة المرور: البحث بهوية المصادقة (غير قابلة للتعديل من
--      المستخدم) بدل هاتف البروفايل. للخادم (service_role) فقط.
-- ======================================================================
create or replace function public.reset_lookup_user(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;
revoke execute on function public.reset_lookup_user(text) from public, anon, authenticated;
grant execute on function public.reset_lookup_user(text) to service_role;


-- ======================================================================
-- (3) + (8) حالة الحساب: لا حذف من صاحب الصفّ، وحماية حقل الحظر
-- ======================================================================
drop policy if exists "owner manages own status" on public.account_status;

drop policy if exists "owner reads own status" on public.account_status;
create policy "owner reads own status"
  on public.account_status for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "owner inserts own status" on public.account_status;
create policy "owner inserts own status"
  on public.account_status for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "owner updates own status" on public.account_status;
create policy "owner updates own status"
  on public.account_status for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
-- (الحذف يبقى للإدارة فقط عبر سياسة "admin manages account status".)

create or replace function public.protect_account_ban()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
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
$$;

drop trigger if exists trg_protect_account_ban on public.account_status;
create trigger trg_protect_account_ban
  before insert or update on public.account_status
  for each row execute function public.protect_account_ban();


-- ======================================================================
-- (4) الإشعارات: حالة answered نهائية (لا رجوع ثم تأكيد متكرر)
-- ======================================================================
create or replace function public.guard_notification_keys()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
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
$$;


-- ======================================================================
-- (5) روابط بروفايل المدرّس: تعقيم على مستوى القاعدة
--     (الإدخال المباشر عبر REST يتجاوز تحقّق التطبيق)
-- ======================================================================
create or replace function public.is_dangerous_url(v text)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select v is not null
     and regexp_replace(v, '[\s\x01-\x20]+', '', 'g')
         ~* '^(javascript|data|vbscript|file|blob):';
$$;

create or replace function public.is_valid_youtube_url(v text)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select v is not null
     and length(v) <= 500
     and v ~* '^https://(www\.|m\.)?(youtube\.com|youtu\.be)(/[^\s<>"'']*)?$';
$$;

create or replace function public.sanitize_teacher_links()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.youtube_url is not null and not public.is_valid_youtube_url(new.youtube_url) then
    new.youtube_url := null;
  end if;
  if public.is_dangerous_url(new.telegram_url)  then new.telegram_url  := null; end if;
  if public.is_dangerous_url(new.instagram_url) then new.instagram_url := null; end if;
  if public.is_dangerous_url(new.photo_url)     then new.photo_url     := null; end if;
  return new;
end;
$$;

drop trigger if exists trg_sanitize_teacher_links on public.teacher_profiles;
create trigger trg_sanitize_teacher_links
  before insert or update on public.teacher_profiles
  for each row execute function public.sanitize_teacher_links();

-- تنظيف لمرّة واحدة لأي قيمة خطرة موجودة (يمرّ عبر التريغر أعلاه)
update public.teacher_profiles
set youtube_url = youtube_url
where (youtube_url is not null and not public.is_valid_youtube_url(youtube_url))
   or public.is_dangerous_url(telegram_url)
   or public.is_dangerous_url(instagram_url)
   or public.is_dangerous_url(photo_url);


-- ======================================================================
-- (6) محتوى المدرّس: الاعتماد يشمل «غير محظور/غير معطّل»، والتعديل يخضع
--     لنفس شرط المادة، ومحتوى المحظور يختفي عن الطلاب
-- ======================================================================
create or replace function public.is_approved_teacher_of(p_subject uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.teacher_profiles tp
    where tp.user_id = auth.uid() and tp.verification_status = 'approved'
  ) and exists (
    select 1 from public.teacher_subjects ts
    where ts.teacher_id = auth.uid() and ts.subject_id = p_subject
  ) and not public.is_banned(auth.uid())
    and not public.is_account_deactivated(auth.uid());
$$;

create or replace function public.is_approved_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.teacher_profiles tp
    where tp.user_id = auth.uid() and tp.verification_status = 'approved'
  ) and not public.is_banned(auth.uid())
    and not public.is_account_deactivated(auth.uid());
$$;

-- exam_papers
drop policy if exists "read exam papers" on public.exam_papers;
create policy "read exam papers"
  on public.exam_papers for select
  to authenticated
  using (
    not public.is_banned(teacher_id)
    or auth.uid() = teacher_id
    or (select public.is_admin())
  );

drop policy if exists "owner or admin updates exam papers" on public.exam_papers;
create policy "owner or admin updates exam papers"
  on public.exam_papers for update
  to authenticated
  using (auth.uid() = teacher_id or public.is_admin())
  with check (
    public.is_admin()
    or (auth.uid() = teacher_id and public.is_approved_teacher_of(subject_id))
  );

-- quizzes
drop policy if exists "read quizzes" on public.quizzes;
create policy "read quizzes"
  on public.quizzes for select
  to authenticated
  using (
    not public.is_banned(teacher_id)
    or auth.uid() = teacher_id
    or (select public.is_admin())
  );

drop policy if exists "owner or admin updates quizzes" on public.quizzes;
create policy "owner or admin updates quizzes"
  on public.quizzes for update
  to authenticated
  using (auth.uid() = teacher_id or public.is_admin())
  with check (
    public.is_admin()
    or (auth.uid() = teacher_id and public.is_approved_teacher_of(subject_id))
  );

-- ختم الزمن + حدّ يومي لمحتوى المدرّس (منع الإغراق)
create or replace function public.limit_teacher_content()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
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
$$;

drop trigger if exists trg_limit_exam_papers on public.exam_papers;
create trigger trg_limit_exam_papers
  before insert on public.exam_papers
  for each row execute function public.limit_teacher_content();

drop trigger if exists trg_limit_quizzes on public.quizzes;
create trigger trg_limit_quizzes
  before insert on public.quizzes
  for each row execute function public.limit_teacher_content();

-- أسئلة الاختبار: الخيارات نصوص فعلاً، وبأطوال معقولة، وعدد محدود لكل اختبار
create or replace function public.validate_quiz_question()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
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
$$;

drop trigger if exists trg_validate_quiz_question on public.quiz_questions;
create trigger trg_validate_quiz_question
  before insert or update on public.quiz_questions
  for each row execute function public.validate_quiz_question();


-- ======================================================================
-- (7) الأسئلة: مفاتيح التوجيه وزمن الإنشاء ثابتة بعد الإدراج
-- ======================================================================
create or replace function public.guard_question_keys()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
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
$$;

drop trigger if exists trg_guard_question_keys on public.questions;
create trigger trg_guard_question_keys
  before update on public.questions
  for each row execute function public.guard_question_keys();


-- ======================================================================
-- (9) حدود المعدّل
-- ======================================================================

-- مشاهدات الملف: سقف لمشاهدات الزوّار المجهولين لكل مدرّس في الساعة
create or replace function public.record_teacher_view(p_teacher uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
$$;

-- تصحيح الاختبار: حدّ ٦٠ محاولة/ساعة للطالب
create or replace function public.grade_quiz(p_quiz_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
$$;
revoke execute on function public.grade_quiz(uuid, jsonb) from public, anon;
grant execute on function public.grade_quiz(uuid, jsonb) to authenticated;

-- الإحالات: تُحتسب للحسابات الجديدة فقط (خلال يومين من التسجيل)
create or replace function public.record_referral(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
$$;
revoke execute on function public.record_referral(text) from public, anon;
grant execute on function public.record_referral(text) to authenticated;

-- البلاغات: الحالة والزمن من الخادم + حدّ ٢٠ بلاغاً/يوم للمُبلِّغ
create or replace function public.guard_report_insert()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
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
$$;

-- العدّ يحتاج قراءة بلاغات المُبلِّغ نفسه (بدونها العدّ = 0 دائماً تحت RLS)
drop policy if exists "reporter reads own reports" on public.reports;
create policy "reporter reads own reports"
  on public.reports for select
  to authenticated
  using (auth.uid() = reporter_id);

drop trigger if exists trg_guard_report_insert on public.reports;
create trigger trg_guard_report_insert
  before insert on public.reports
  for each row execute function public.guard_report_insert();

-- اشتراكات الدفع: سقف ١٠ أجهزة للمستخدم (يمنع تضخيم الإرسال)
create or replace function public.guard_push_endpoint()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
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
$$;


-- ======================================================================
-- (9) حدود الحجم: قيود NOT VALID (تُفرض على كل إدراج/تعديل جديد دون
--     فحص الصفوف القديمة، فلا يفشل التطبيق على بيانات موجودة)
-- ======================================================================
do $$
declare
  c record;
begin
  for c in
    select * from (values
      ('questions',          'chk_questions_text_len',      'length(question_text) <= 5000'),
      ('questions',          'chk_questions_att_len',       'length(coalesce(attachment_path, '''')) <= 500 and length(coalesce(attachment_name, '''')) <= 300 and length(coalesce(attachment_mime, '''')) <= 100'),
      ('messages',           'chk_messages_body_len',       'length(body) <= 5000'),
      ('messages',           'chk_messages_att_len',        'length(coalesce(attachment_path, '''')) <= 500 and length(coalesce(attachment_name, '''')) <= 300 and length(coalesce(attachment_mime, '''')) <= 100'),
      ('reports',            'chk_reports_reason_len',      'length(reason) <= 1000'),
      ('teacher_ratings',    'chk_ratings_comment_len',     'length(coalesce(comment, '''')) <= 1000'),
      ('student_profiles',   'chk_student_fields_len',      'length(full_name) <= 150 and length(coalesce(phone, '''')) <= 30 and length(coalesce(id_document_url, '''')) <= 500'),
      ('teacher_profiles',   'chk_teacher_fields_len',      'length(full_name) <= 150 and length(coalesce(phone, '''')) <= 30 and length(coalesce(school, '''')) <= 200 and length(coalesce(institute, '''')) <= 200 and length(coalesce(bio, '''')) <= 3000 and length(coalesce(contact_email, '''')) <= 200 and length(coalesce(telegram_url, '''')) <= 500 and length(coalesce(instagram_url, '''')) <= 500 and length(coalesce(photo_url, '''')) <= 500 and length(coalesce(id_document_url, '''')) <= 500'),
      ('teacher_profiles',   'chk_teacher_years_range',     'years_experience is null or years_experience between 0 and 80'),
      ('exam_papers',        'chk_exam_papers_len',         'length(title) <= 200 and length(file_path) <= 500 and length(coalesce(file_name, '''')) <= 300 and length(coalesce(file_mime, '''')) <= 100'),
      ('exam_papers',        'chk_exam_papers_own_folder',  'file_path like teacher_id::text || ''/%'' and position(''..'' in file_path) = 0'),
      ('exam_papers',        'chk_exam_papers_year',        'year is null or year between 1990 and 2100'),
      ('quizzes',            'chk_quizzes_len',             'length(title) <= 200 and length(chapter) <= 200'),
      ('push_subscriptions', 'chk_push_len',                'length(endpoint) <= 1000 and length(p256dh) <= 300 and length(auth) <= 300'),
      ('security_credentials','chk_security_question_len',  'length(question) <= 300')
    ) as t(tbl, conname, expr)
  loop
    if not exists (
      select 1 from pg_constraint
      where conname = c.conname and conrelid = ('public.' || c.tbl)::regclass
    ) then
      execute format('alter table public.%I add constraint %I check (%s) not valid',
                     c.tbl, c.conname, c.expr);
    end if;
  end loop;
end $$;
