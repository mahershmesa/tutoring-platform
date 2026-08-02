-- =============================================================
-- seed.sql — بيانات تجريبية للتطوير المحلي فقط.
-- تُنفَّذ تلقائياً بعد الـ migrations عند: supabase db reset
-- ليست جزءاً من مخطط الإنتاج.
-- =============================================================

begin;

-- إشارة موثوقة (transaction-local) تسمح بضبط verification_status='approved'
-- في السيّد رغم تريغر حماية حقول المدرّس.
select set_config('app.privileged_write', 'on', true);

-- مستخدمون تجريبيون (مدرّسون). تريغر on_auth_user_created ينشئ لكلٍّ منهم
-- بروفايل مدرّس بحالة pending + دور teacher.
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password,
   email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','d0000000-0000-0000-0000-000000000001','authenticated','authenticated',
   'demo.baghdad@example.com', crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}','{"role":"teacher","full_name":"أحمد الجبوري"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','d0000000-0000-0000-0000-000000000002','authenticated','authenticated',
   'demo.najaf@example.com', crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}','{"role":"teacher","full_name":"زينب الموسوي"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','d0000000-0000-0000-0000-000000000003','authenticated','authenticated',
   'demo.basra@example.com', crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}','{"role":"teacher","full_name":"علي الشمري"}', now(), now())
on conflict (id) do nothing;

-- ترقية البروفايلات إلى approved + بيانات المحافظة والظهور على الخريطة
update public.teacher_profiles tp set
  governorate_id      = g.id,
  verification_status = 'approved',
  location_visible    = true,
  answered_count      = v.cnt,
  school              = v.school,
  phone               = v.phone,
  telegram_url        = v.tg
from (values
  ('d0000000-0000-0000-0000-000000000001'::uuid, 'بغداد', 14, 'معهد الرافدين',     '07700000001', 'https://t.me/demo1'),
  ('d0000000-0000-0000-0000-000000000002'::uuid, 'النجف',  3, 'معهد النور',        '07700000002', 'https://t.me/demo2'),
  ('d0000000-0000-0000-0000-000000000003'::uuid, 'البصرة', 9, 'إعدادية الفراهيدي', '07700000003', 'https://t.me/demo3')
) as v(user_id, gov, cnt, school, phone, tg)
join public.governorates g on g.name = v.gov
where tp.user_id = v.user_id;

-- المواد التي يدرّسها كل مدرّس
insert into public.teacher_subjects (teacher_id, subject_id)
select v.user_id, s.id
from (values
  ('d0000000-0000-0000-0000-000000000001'::uuid, 'رياضيات'),
  ('d0000000-0000-0000-0000-000000000002'::uuid, 'رياضيات'),
  ('d0000000-0000-0000-0000-000000000003'::uuid, 'كيمياء')
) as v(user_id, subj)
join public.subjects s on s.name = v.subj
on conflict do nothing;

-- المراحل التي يغطّيها كل مدرّس
insert into public.teacher_stages (teacher_id, stage_id)
select v.user_id, st.id
from (values
  ('d0000000-0000-0000-0000-000000000001'::uuid, 'السادس'),
  ('d0000000-0000-0000-0000-000000000002'::uuid, 'الثالث'),
  ('d0000000-0000-0000-0000-000000000003'::uuid, 'السادس')
) as v(user_id, stg)
join public.stages st on st.name = v.stg
on conflict do nothing;

select set_config('app.privileged_write', 'off', true);

commit;
