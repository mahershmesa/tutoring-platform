\set ON_ERROR_STOP on
\set QUIET on
\pset tuples_only on
\pset format unaligned
create or replace function pg_temp.ok(name text, cond boolean) returns text language plpgsql as
 $$ begin if cond is not true then raise exception 'FUNCTIONAL FAIL: %', name; end if; return '✅ '||name; end $$;
\set T1 '71000000-0000-0000-0000-000000000000'
\set S1 '51000000-0000-0000-0000-000000000000'
\set S2 '52000000-0000-0000-0000-000000000000'
\set A0 'a0000000-0000-0000-0000-000000000000'
\set A1 'a1000000-0000-0000-0000-000000000000'
begin;
-- زائر
set local role anon;
select pg_temp.ok('anon: map_teachers returns approved teachers', (select count(*) from public.map_teachers()) = 2);
select pg_temp.ok('anon: teacher_directory readable', (select count(*) from public.teacher_directory) = 2);
select public.record_teacher_view(:'T1');
select pg_temp.ok('anon: subjects/ratings readable', (select count(*) from public.subjects) > 0 and (select count(*) from public.teacher_ratings) >= 0);
reset role;
select pg_temp.ok('anon view recorded', (select count(*) from public.teacher_views where teacher_id=:'T1') = 1);

-- طالب: سؤال جديد → يتوزّع
set local role authenticated; set local request.jwt.claim.sub = :'S2';
insert into public.questions(id,student_id,subject_id,stage_id,governorate_id,question_text)
  select 'c2000000-0000-0000-0000-000000000000', auth.uid(), id, 1, 5, 'سؤال جديد' from public.subjects where name='رياضيات';
select pg_temp.ok('student: question inserted + fanout to matching teacher', (select count(*) from public.notifications where question_id='c2000000-0000-0000-0000-000000000000') = 1);
update public.questions set attachment_path='c2000000-0000-0000-0000-000000000000/a.png', attachment_mime='image/png', attachment_name='a.png' where id='c2000000-0000-0000-0000-000000000000';
select pg_temp.ok('student: attaches file to own question', (select attachment_path is not null from public.questions where id='c2000000-0000-0000-0000-000000000000'));
-- مدرّس يرد
set local request.jwt.claim.sub = :'T1';
select pg_temp.ok('teacher: sees the question', (select count(*) from public.questions where id='c2000000-0000-0000-0000-000000000000') = 1);
update public.notifications set status='read' where question_id='c2000000-0000-0000-0000-000000000000' and teacher_id=auth.uid();
insert into public.messages(question_id,sender_id,recipient_id,body) values ('c2000000-0000-0000-0000-000000000000', auth.uid(), :'S2', 'هذا الجواب');
-- طالب يرد ويؤكد ويقيّم
set local request.jwt.claim.sub = :'S2';
select pg_temp.ok('student: reads teacher reply', (select count(*) from public.messages where question_id='c2000000-0000-0000-0000-000000000000') = 1);
insert into public.messages(question_id,sender_id,recipient_id,body) values ('c2000000-0000-0000-0000-000000000000', auth.uid(), :'T1', 'شكراً');
update public.notifications set status='answered' where question_id='c2000000-0000-0000-0000-000000000000' and teacher_id=:'T1';
insert into public.teacher_ratings(student_id,teacher_id,rating,comment) values (auth.uid(), :'T1', 5, 'ممتاز');
update public.teacher_ratings set rating=4 where student_id=auth.uid() and teacher_id=:'T1';
reset role;
select pg_temp.ok('answered_count +1 after confirm', (select answered_count from public.teacher_profiles where user_id=:'T1') = 1);
select pg_temp.ok('rating visible in directory', (select rating_count from public.teacher_directory where user_id=:'T1') = 1);

-- طالب: اختبار + وزاريات
set local role authenticated; set local request.jwt.claim.sub = :'S2';
select pg_temp.ok('student: reads quiz questions via public view', (select count(*) from public.quiz_questions_public where quiz_id='d1000000-0000-0000-0000-000000000000') = 2);
select pg_temp.ok('student: grade_quiz scores correctly', (public.grade_quiz('d1000000-0000-0000-0000-000000000000', '{"e1000000-0000-0000-0000-000000000000":1,"e2000000-0000-0000-0000-000000000000":1}') ->> 'score') = '1');
select pg_temp.ok('student: reads exam papers + quizzes', (select count(*) from public.exam_papers) = 1 and (select count(*) from public.quizzes) = 1);
-- طالب: تعطيل/تفعيل الحساب (upsert) + بلاغ + سؤال أمان + اشتراك دفع
insert into public.account_status(user_id,deactivated) values (auth.uid(), true) on conflict (user_id) do update set deactivated=excluded.deactivated;
insert into public.account_status(user_id,deactivated) values (auth.uid(), false) on conflict (user_id) do update set deactivated=excluded.deactivated;
select pg_temp.ok('student: deactivate/reactivate own account', (select not deactivated and not banned from public.account_status where user_id=auth.uid()));
insert into public.reports(reporter_id,reported_id,context_type,reason) values (auth.uid(), :'T1', 'user', 'سبب');
select public.set_security_credential('سؤال؟','جواب');
select pg_temp.ok('student: security credential set', public.has_security_credential());
insert into public.push_subscriptions(endpoint,user_id,p256dh,auth) values ('https://fcm.googleapis.com/fcm/send/abc', auth.uid(), 'k', 'a')
  on conflict (endpoint) do update set p256dh=excluded.p256dh;
select pg_temp.ok('student: push subscription saved', (select count(*) from public.push_subscriptions) = 1);
update public.student_profiles set full_name='اسم جديد', phone='9647800000002' where user_id=auth.uid();

-- مدرّس: بروفايل + محتوى
set local request.jwt.claim.sub = :'T1';
update public.teacher_profiles set youtube_url='https://www.youtube.com/@channel', telegram_url='@myuser', instagram_url='https://instagram.com/x', bio='نبذة', years_experience=7 where user_id=auth.uid();
select pg_temp.ok('teacher: valid youtube kept, plain @telegram kept', (select youtube_url='https://www.youtube.com/@channel' and telegram_url='@myuser' and instagram_url is not null from public.teacher_profiles where user_id=auth.uid()));
delete from public.teacher_subjects where teacher_id=auth.uid();
insert into public.teacher_subjects select auth.uid(), id from public.subjects where name='رياضيات';
insert into public.exam_papers(teacher_id,subject_id,stage_id,year,title,file_path,file_mime,file_name)
  select auth.uid(), id, 6, 2024, 'وزاري ٢٠٢٤', auth.uid()::text||'/paper-1.pdf','application/pdf','p.pdf' from public.subjects where name='رياضيات';
insert into public.quizzes(id,teacher_id,subject_id,stage_id,chapter,title)
  select 'd2000000-0000-0000-0000-000000000000', auth.uid(), id, 6, 'ف2','اختبار ٢' from public.subjects where name='رياضيات';
insert into public.quiz_questions(quiz_id,prompt,options,correct_index,sort_order) values
  ('d2000000-0000-0000-0000-000000000000','س١','["أ","ب","ج"]',2,0),('d2000000-0000-0000-0000-000000000000','س٢','["نعم","لا"]',0,1);
update public.quizzes set title='اختبار معدّل' where id='d2000000-0000-0000-0000-000000000000';
select pg_temp.ok('teacher: content created/edited', (select count(*) from public.quiz_questions where quiz_id='d2000000-0000-0000-0000-000000000000') = 2 and (select count(*) from public.exam_papers where teacher_id=auth.uid()) = 2);
select pg_temp.ok('teacher: sees attempts on own quiz', (select count(*) from public.quiz_attempts) = 1);
delete from public.quizzes where id='d2000000-0000-0000-0000-000000000000';
insert into storage.objects(bucket_id,name) values ('study-resources', auth.uid()::text||'/paper-9.pdf');

-- مدير ثانٍ: مهام عادية
set local request.jwt.claim.sub = :'A1';
insert into public.account_status(user_id,banned) values (:'S1', true) on conflict (user_id) do update set banned=excluded.banned;
select pg_temp.ok('admin2: bans a normal user', public.is_banned(:'S1'));
update public.account_status set banned=false where user_id=:'S1';
update public.teacher_profiles set verification_status='approved' where user_id='73000000-0000-0000-0000-000000000000';
update public.teacher_profiles set featured_until=now()+interval '7 days', views_base=50 where user_id=:'T1';
select pg_temp.ok('admin2: approve + feature', (select count(*) from public.teacher_profiles where verification_status='approved') = 3);
select pg_temp.ok('admin2: reads reports', (select count(*) from public.reports) = 1);
update public.reports set status='reviewed';
-- مدير أساسي: إدارة المدراء + حظر مدير ثانٍ
set local request.jwt.claim.sub = :'A0';
update public.user_roles set active=false where user_id=:'A1' and role='admin';
insert into public.account_status(user_id,banned) values (:'A1', true) on conflict (user_id) do update set banned=excluded.banned;
select pg_temp.ok('super: suspends + bans second-level admin', public.is_banned(:'A1'));

-- service_role: استرجاع كلمة المرور
reset role; set local role service_role; reset request.jwt.claim.sub;
select pg_temp.ok('service: rate limit ok', public.check_reset_rate_limit('9.9.9.9'));
select pg_temp.ok('service: lookup by auth email', public.reset_lookup_user('P9647800000002@dalili.app') = :'S2');
select pg_temp.ok('service: correct answer ok / wrong rejected', public.check_security_answer(:'S2','  جواب ') = 'ok' and public.check_security_answer(:'S2','خطأ') = 'wrong');
reset role;

-- إحالة لحساب جديد
insert into auth.users(id,email,raw_user_meta_data) values ('5c000000-0000-0000-0000-000000000000','new@x','{"role":"student","full_name":"New"}');
set local role authenticated; set local request.jwt.claim.sub = :'S2';
select public.my_referral_code() as code \gset
set local request.jwt.claim.sub = '5c000000-0000-0000-0000-000000000000';
select public.record_referral(:'code');
set local request.jwt.claim.sub = :'S2';
select pg_temp.ok('referral: new account counted for referrer', (select count(*) from public.referrals) = 1);
reset role;
select '🎉 ALL FUNCTIONAL CHECKS PASSED';
rollback;
