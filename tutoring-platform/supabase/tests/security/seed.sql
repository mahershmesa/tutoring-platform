\set ON_ERROR_STOP on
insert into auth.users(id,email,raw_user_meta_data) values
 ('a0000000-0000-0000-0000-000000000000','super@x','{"role":"student","full_name":"Super"}'),
 ('a1000000-0000-0000-0000-000000000000','admin2@x','{"role":"student","full_name":"Admin2"}'),
 ('71000000-0000-0000-0000-000000000000','p9647700000001@dalili.app','{"role":"teacher","full_name":"T1 Math","phone":"9647700000001"}'),
 ('72000000-0000-0000-0000-000000000000','p9647700000002@dalili.app','{"role":"teacher","full_name":"T2 Phys","phone":"9647700000002"}'),
 ('73000000-0000-0000-0000-000000000000','p9647700000003@dalili.app','{"role":"teacher","full_name":"T3 Pending","phone":"9647700000003"}'),
 ('51000000-0000-0000-0000-000000000000','p9647800000001@dalili.app','{"role":"student","full_name":"S1","phone":"9647800000001"}'),
 ('52000000-0000-0000-0000-000000000000','p9647800000002@dalili.app','{"role":"student","full_name":"S2","phone":"9647800000002"}'),
 ('5b000000-0000-0000-0000-000000000000','p9647800000009@dalili.app','{"role":"student","full_name":"Banned","phone":"9647800000009"}');
insert into public.user_roles(user_id,role,active,super) values
 ('a0000000-0000-0000-0000-000000000000','admin',true,true),
 ('a1000000-0000-0000-0000-000000000000','admin',true,false);
update public.teacher_profiles set governorate_id=1, verification_status='approved', location_visible=true
  where user_id in ('71000000-0000-0000-0000-000000000000','72000000-0000-0000-0000-000000000000');
update public.teacher_profiles set governorate_id=1 where user_id='73000000-0000-0000-0000-000000000000';
insert into public.teacher_subjects select '71000000-0000-0000-0000-000000000000', id from public.subjects where name='رياضيات';
insert into public.teacher_subjects select '72000000-0000-0000-0000-000000000000', id from public.subjects where name='فيزياء';
insert into public.teacher_subjects select '73000000-0000-0000-0000-000000000000', id from public.subjects where name='رياضيات';
insert into public.teacher_stages values ('71000000-0000-0000-0000-000000000000',6),('72000000-0000-0000-0000-000000000000',6);
update public.student_profiles set governorate_id=1, stage_id=6;
insert into public.account_status(user_id,banned) values ('5b000000-0000-0000-0000-000000000000',true);
-- سؤال + رد المدرّس
insert into public.questions(id,student_id,subject_id,stage_id,governorate_id,question_text)
  select 'c1000000-0000-0000-0000-000000000000','51000000-0000-0000-0000-000000000000', id, 6, 1, 'سؤال' from public.subjects where name='رياضيات';
insert into public.messages(question_id,sender_id,recipient_id,body) values
  ('c1000000-0000-0000-0000-000000000000','71000000-0000-0000-0000-000000000000','51000000-0000-0000-0000-000000000000','جواب');
-- اختبار T1
insert into public.quizzes(id,teacher_id,subject_id,stage_id,chapter,title)
  select 'd1000000-0000-0000-0000-000000000000','71000000-0000-0000-0000-000000000000', id, 6, 'ف1','اختبار' from public.subjects where name='رياضيات';
insert into public.quiz_questions(id,quiz_id,prompt,options,correct_index,sort_order) values
 ('e1000000-0000-0000-0000-000000000000','d1000000-0000-0000-0000-000000000000','2+2','["3","4"]',1,0),
 ('e2000000-0000-0000-0000-000000000000','d1000000-0000-0000-0000-000000000000','3*3','["9","6"]',0,1);
insert into public.exam_papers(id,teacher_id,subject_id,title,file_path)
  select 'f1000000-0000-0000-0000-000000000000','71000000-0000-0000-0000-000000000000', id,'وزاري','71000000-0000-0000-0000-000000000000/p.pdf' from public.subjects where name='رياضيات';
