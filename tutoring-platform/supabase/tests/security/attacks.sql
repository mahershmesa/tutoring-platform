\set QUIET on
\pset tuples_only on
\pset format unaligned
create or replace function pg_temp.r(name text, vuln boolean) returns text language sql as
 $$ select case when vuln then '🔴 VULN  ' else '🟢 SAFE  ' end || name $$;
\set T1 '71000000-0000-0000-0000-000000000000'
\set T2 '72000000-0000-0000-0000-000000000000'
\set S1 '51000000-0000-0000-0000-000000000000'
\set S2 '52000000-0000-0000-0000-000000000000'
\set BAN '5b000000-0000-0000-0000-000000000000'
\set A1 'a1000000-0000-0000-0000-000000000000'

-- V1: زائر مجهول يعدّل/يحذف أسئلة الاختبارات عبر العرض العام
begin; set local role anon;
do $$ declare n int; begin
  begin update public.quiz_questions_public set prompt='HACKED'; get diagnostics n = row_count;
  exception when others then n := 0; end;
  perform set_config('t.v1a', n::text, true); end $$;
do $$ declare n int; begin
  begin delete from public.quiz_questions_public; get diagnostics n = row_count;
  exception when others then n := 0; end;
  perform set_config('t.v1b', n::text, true); end $$;
select pg_temp.r('V1a anon UPDATE quiz questions via public view (rows='||current_setting('t.v1a')||')', current_setting('t.v1a')::int>0);
select pg_temp.r('V1b anon DELETE quiz questions via public view (rows='||current_setting('t.v1b')||')', current_setting('t.v1b')::int>0);
rollback;

-- V1c: anon reads quiz questions (public view) / correct answers
begin; set local role anon;
do $$ declare n int:=0; begin begin select count(*) into n from public.quiz_questions; exception when others then n:=0; end; perform set_config('t.x', n::text, true); end $$;
select pg_temp.r('V1c anon reads correct answers from base table', current_setting('t.x')::int>0);
rollback;

-- V2: استدعاء دوال الاسترجاع مباشرةً من زائر
begin; set local role anon;
do $$ declare s text:='denied'; begin begin s := public.check_security_answer('51000000-0000-0000-0000-000000000000','guess'); exception when insufficient_privilege then s:='denied'; end; perform set_config('t.x', s, true); end $$;
select pg_temp.r('V2a anon calls check_security_answer directly (result='||current_setting('t.x')||')', current_setting('t.x')<>'denied');
do $$ declare s text:='denied'; begin begin s := public.check_reset_rate_limit('1.2.3.4')::text; exception when insufficient_privilege then s:='denied'; end; perform set_config('t.x', s, true); end $$;
select pg_temp.r('V2b anon calls check_reset_rate_limit (poison IP limits) (result='||current_setting('t.x')||')', current_setting('t.x')<>'denied');
do $$ declare s text:='denied'; begin begin s := public.is_account_deactivated('51000000-0000-0000-0000-000000000000')::text; exception when insufficient_privilege then s:='denied'; end; perform set_config('t.x', s, true); end $$;
select pg_temp.r('V2c anon probes is_account_deactivated(uuid) (result='||current_setting('t.x')||')', current_setting('t.x')<>'denied');
do $$ declare s text:='denied'; begin begin s := public.is_banned('5b000000-0000-0000-0000-000000000000')::text; exception when insufficient_privilege then s:='denied'; end; perform set_config('t.x', s, true); end $$;
select pg_temp.r('V2d anon probes is_banned(uuid) (result='||current_setting('t.x')||')', current_setting('t.x')<>'denied');
rollback;

-- V3: المحظور يفكّ حظر نفسه بحذف صفّه
begin; set local role authenticated; set local request.jwt.claim.sub = :'BAN';
delete from public.account_status where user_id = :'BAN';
reset role;
select pg_temp.r('V3 banned user un-bans self by deleting own status row', not public.is_banned(:'BAN'));
rollback;

-- V4: تضخيم عدّاد "أجاب على X" بتبديل حالة الإشعار
begin;
select answered_count as before from public.teacher_profiles where user_id=:'T1' \gset
set local role authenticated; set local request.jwt.claim.sub = :'S1';
update public.notifications set status='answered' where question_id='c1000000-0000-0000-0000-000000000000';
update public.notifications set status='sent'     where question_id='c1000000-0000-0000-0000-000000000000';
update public.notifications set status='answered' where question_id='c1000000-0000-0000-0000-000000000000';
update public.notifications set status='read'     where question_id='c1000000-0000-0000-0000-000000000000';
update public.notifications set status='answered' where question_id='c1000000-0000-0000-0000-000000000000';
reset role;
select pg_temp.r('V4 answered_count inflated by toggling one notification (+'||(answered_count - :before)||')', answered_count - :before > 1) from public.teacher_profiles where user_id=:'T1';
rollback;

-- V5: المدرّس ينقل محتواه لمادة ليست له
begin; set local role authenticated; set local request.jwt.claim.sub = :'T1';
do $$ declare n int:=0; begin begin
  update public.exam_papers set subject_id=(select id from public.subjects where name='فيزياء') where teacher_id=auth.uid(); get diagnostics n=row_count;
  exception when others then n:=0; end; perform set_config('t.x', n::text, true); end $$;
select pg_temp.r('V5a teacher moves exam paper to a subject he does not teach', current_setting('t.x')::int>0);
do $$ declare n int:=0; begin begin
  update public.quizzes set subject_id=(select id from public.subjects where name='فيزياء') where teacher_id=auth.uid(); get diagnostics n=row_count;
  exception when others then n:=0; end; perform set_config('t.x', n::text, true); end $$;
select pg_temp.r('V5b teacher moves quiz to a subject he does not teach', current_setting('t.x')::int>0);
rollback;

-- V6: رابط javascript: مخزّن في بروفايل المدرّس (XSS)
begin; set local role authenticated; set local request.jwt.claim.sub = :'T1';
do $$ declare n int:=0; begin begin
  update public.teacher_profiles set youtube_url='javascript:alert(document.cookie)', telegram_url='javascript:alert(1)' where user_id=auth.uid(); get diagnostics n=row_count;
  exception when others then n:=0; end; perform set_config('t.x', n::text, true); end $$;
reset role;
select pg_temp.r('V6 javascript: URL stored & exposed in public directory (youtube_url='||coalesce(youtube_url,'null')||')', youtube_url ilike 'javascript:%') from public.teacher_directory where user_id=:'T1';
rollback;

-- V7: الطالب يعدّل تاريخ/مفاتيح سؤاله (تجاوز حدّ المعدّل)
begin; set local role authenticated; set local request.jwt.claim.sub = :'S1';
update public.questions set created_at = now() - interval '2 days', governorate_id = 2 where student_id = auth.uid();
reset role;
select pg_temp.r('V7 student back-dates own question (rate-limit bypass) / changes routing keys', created_at < now() - interval '1 day' or governorate_id=2) from public.questions where id='c1000000-0000-0000-0000-000000000000';
rollback;

-- V8: زائر يضخّم المشاهدات بلا حدّ
begin; set local role anon;
select public.record_teacher_view(:'T1') from generate_series(1,200) \g /dev/null
reset role;
select pg_temp.r('V8 anon inflates teacher views without limit ('||count(*)||' rows from 200 calls)', count(*)>100) from public.teacher_views where teacher_id=:'T1';
rollback;

-- V10: مدرّس محظور ما زال يرفع محتوى
begin;
insert into public.account_status(user_id,banned) values (:'T1',true) on conflict (user_id) do update set banned=true;
set local role authenticated; set local request.jwt.claim.sub = :'T1';
do $$ declare ok boolean:=false; begin begin
  insert into public.quizzes(teacher_id,subject_id,chapter,title) select auth.uid(), id,'x','x' from public.subjects where name='رياضيات'; ok:=true;
  exception when others then ok:=false; end; perform set_config('t.x', ok::text, true); end $$;
select pg_temp.r('V10 banned teacher still publishes content', current_setting('t.x')::boolean);
rollback;

-- V11: خيارات اختبار غير نصّية (تعطّل صفحة الاختبار)
begin; set local role authenticated; set local request.jwt.claim.sub = :'T1';
do $$ declare ok boolean:=false; begin begin
  insert into public.quiz_questions(quiz_id,prompt,options,correct_index) values ('d1000000-0000-0000-0000-000000000000','x','[{"a":1},{"b":2}]',0); ok:=true;
  exception when others then ok:=false; end; perform set_config('t.x', ok::text, true); end $$;
select pg_temp.r('V11 teacher stores non-text quiz options (crashes student page)', current_setting('t.x')::boolean);
rollback;

-- V12: نصوص بلا حدّ للحجم
begin; set local role authenticated; set local request.jwt.claim.sub = :'S1';
do $$ declare ok boolean:=false; begin begin
  insert into public.messages(question_id,sender_id,recipient_id,body) values ('c1000000-0000-0000-0000-000000000000',auth.uid(),'71000000-0000-0000-0000-000000000000', repeat('x', 2000000)); ok:=true;
  exception when others then ok:=false; end; perform set_config('t.x', ok::text, true); end $$;
select pg_temp.r('V12 2MB message body accepted (no size limits)', current_setting('t.x')::boolean);
rollback;

-- V13: grade_quiz بلا حدّ (تضخيم الجدول)
begin; set local role authenticated; set local request.jwt.claim.sub = :'S1';
select public.grade_quiz('d1000000-0000-0000-0000-000000000000','{}') from generate_series(1,150) \g /dev/null
reset role;
select pg_temp.r('V13 unlimited quiz attempts ('||count(*)||' rows from 150 calls)', count(*)>=150) from public.quiz_attempts;
rollback;

-- V14: إحالة بأثر رجعي من حساب قديم
begin;
update auth.users set created_at = now() - interval '90 days' where id=:'S2';
set local role authenticated; set local request.jwt.claim.sub = :'S1';
select public.my_referral_code() as code \gset
set local request.jwt.claim.sub = :'S2';
select public.record_referral(:'code') \g /dev/null
reset role;
select pg_temp.r('V14 90-day-old account retroactively counted as a referral', count(*)>0) from public.referrals;
rollback;

-- V15: مدير ثانٍ يحظر المدير الأساسي
begin; set local role authenticated; set local request.jwt.claim.sub = :'A1';
insert into public.account_status(user_id,banned) values ('a0000000-0000-0000-0000-000000000000',true) on conflict (user_id) do update set banned=true;
reset role;
select pg_temp.r('V15 second-level admin can ban the primary admin', public.is_banned('a0000000-0000-0000-0000-000000000000'));
rollback;

-- V16: exam paper file_path يشير لملف مدرّس آخر
begin; set local role authenticated; set local request.jwt.claim.sub = :'T1';
do $$ declare ok boolean:=false; begin begin
  insert into public.exam_papers(teacher_id,subject_id,title,file_path) select auth.uid(), id,'x','72000000-0000-0000-0000-000000000000/victim.pdf' from public.subjects where name='رياضيات'; ok:=true;
  exception when others then ok:=false; end; perform set_config('t.x', ok::text, true); end $$;
select pg_temp.r('V16 exam paper row pointing at another teacher''s file', current_setting('t.x')::boolean);
rollback;

-- ===== ضوابط يجب أن تبقى سليمة (تحقّق) =====
begin; set local role authenticated; set local request.jwt.claim.sub = :'S1';
do $$ declare ok boolean:=false; begin begin insert into public.user_roles(user_id,role) values (auth.uid(),'admin'); ok:=true; exception when others then ok:=false; end; perform set_config('t.x', ok::text, true); end $$;
select pg_temp.r('C1 user self-grants admin', current_setting('t.x')::boolean);
select pg_temp.r('C2 user reads secrets tables (security_credentials/app_config/reset_attempts/referral_codes)',
  (select count(*) from public.security_credentials)+(select count(*) from public.app_config)+(select count(*) from public.reset_attempts)+(select count(*) from public.referral_codes) > 0);
select pg_temp.r('C3 student reads other users'' profiles (PII)', (select count(*) from public.student_profiles where user_id<>auth.uid())+(select count(*) from public.teacher_profiles) > 0);
rollback;
begin; set local role authenticated; set local request.jwt.claim.sub = '73000000-0000-0000-0000-000000000000';
update public.teacher_profiles set verification_status='approved', featured_until=now()+interval '1 year', answered_count=999, views_base=999 where user_id=auth.uid();
reset role;
select pg_temp.r('C4 pending teacher self-approves / self-features', verification_status='approved' or featured_until is not null or answered_count>0 or views_base>0) from public.teacher_profiles where user_id='73000000-0000-0000-0000-000000000000';
rollback;
begin; set local role authenticated; set local request.jwt.claim.sub = :'T2';
select pg_temp.r('C5 unrelated teacher reads another conversation', (select count(*) from public.messages)+(select count(*) from public.questions) > 0);
rollback;
begin; set local role authenticated; set local request.jwt.claim.sub = :'T1';
do $$ declare n int:=0; begin begin update public.notifications set status='answered' where teacher_id=auth.uid(); get diagnostics n=row_count; exception when others then n:=0; end; perform set_config('t.x', n::text, true); end $$;
select pg_temp.r('C6 teacher self-confirms answer', current_setting('t.x')::int>0);
rollback;
begin; set local role authenticated; set local request.jwt.claim.sub = :'A1';
do $$ declare n int:=0; begin begin update public.user_roles set super=true where user_id=auth.uid(); get diagnostics n=row_count; exception when others then n:=0; end; perform set_config('t.x', n::text, true); end $$;
select pg_temp.r('C7 second-level admin promotes self to primary', current_setting('t.x')::int>0);
rollback;
begin; set local role anon;
select pg_temp.r('C8 anon reads private tables (messages/questions/notifications/reports/push/ratings-owner)', (select count(*) from public.messages)+(select count(*) from public.questions)+(select count(*) from public.notifications)+(select count(*) from public.reports)+(select count(*) from public.push_subscriptions)+(select count(*) from public.student_profiles)+(select count(*) from public.teacher_profiles)+(select count(*) from public.user_roles) > 0);
rollback;

-- ===== فحوص انحراف القاعدة (دفعات 16/25) =====
-- D2: مدرّس قيد المراجعة يحذف بروفايله ويعيد إدراجه «مقبولاً»
begin; set local role authenticated; set local request.jwt.claim.sub = '73000000-0000-0000-0000-000000000000';
do $$ begin begin
  delete from public.teacher_profiles where user_id = auth.uid();
  insert into public.teacher_profiles(user_id, full_name, governorate_id, verification_status, answered_count)
  values (auth.uid(), 'Self Approved', 1, 'approved', 500);
  exception when others then null; end; end $$;
reset role;
select pg_temp.r('D2 pending teacher self-approves via delete + re-insert', coalesce((select verification_status = 'approved' or answered_count > 0 from public.teacher_profiles where user_id = '73000000-0000-0000-0000-000000000000'), false));
rollback;

-- D3: حدّ ٢٠ سؤالاً بالساعة
begin; set local role authenticated; set local request.jwt.claim.sub = '52000000-0000-0000-0000-000000000000';
do $$ declare n int := 0; begin
  for i in 1..25 loop
    begin
      insert into public.questions(student_id, subject_id, stage_id, governorate_id, question_text)
      select auth.uid(), id, 6, 1, 'spam' from public.subjects where name = 'رياضيات';
      n := n + 1;
    exception when others then null; end;
  end loop;
  perform set_config('t.x', n::text, true); end $$;
select pg_temp.r('D3 no hourly question limit (' || current_setting('t.x') || ' of 25 accepted)', current_setting('t.x')::int > 20);
rollback;

-- D4: تأكيد «أجاب» لمدرّس لم يرسل أي رد
begin;
delete from public.messages where question_id = 'c1000000-0000-0000-0000-000000000000';
set local role authenticated; set local request.jwt.claim.sub = '51000000-0000-0000-0000-000000000000';
update public.notifications set status = 'answered' where question_id = 'c1000000-0000-0000-0000-000000000000';
reset role;
select pg_temp.r('D4 answered_count rises without any teacher reply', (select answered_count from public.teacher_profiles where user_id = '71000000-0000-0000-0000-000000000000') > 0);
rollback;

-- D5: زائر يقرأ هواتف المدرّسين مباشرةً من الجدول
begin; set local role anon;
select pg_temp.r('D5 anon reads teacher phones/emails directly from teacher_profiles', (select count(*) from public.teacher_profiles where phone is not null) > 0);
rollback;
