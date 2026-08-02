-- =============================================================
-- 20260802090004_profiles.sql
-- بروفايلات الطالب والمدرّس + التريغرات المرتبطة بيها
-- =============================================================

-- -------------------------------------------------------------
-- بروفايل الطالب — مرحلة دراسية واحدة (اختيار وحيد)
-- -------------------------------------------------------------
create table public.student_profiles (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  full_name       text not null,
  phone           text,
  governorate_id  smallint references public.governorates (id),
  stage_id        smallint references public.stages (id),
  id_document_url text,                       -- بطاقة هوية/طلابية (اختيارية)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.student_profiles is 'بروفايل الطالب — مرحلة واحدة فقط (stage_id مفرد).';

-- -------------------------------------------------------------
-- بروفايل المدرّس
-- -------------------------------------------------------------
create table public.teacher_profiles (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  full_name           text not null,
  phone               text,
  school              text,                   -- اختياري
  institute           text,                   -- اختياري
  governorate_id      smallint references public.governorates (id),
  telegram_url        text,
  instagram_url       text,
  contact_email       text,
  photo_url           text,                   -- الصورة الشخصية (Storage)
  id_document_url     text,                   -- إثبات هوية تعليمية (Storage)
  location_visible    boolean not null default false,                 -- إظهار/إخفاء على الخريطة
  verification_status public.verification_status not null default 'pending',
  answered_count      integer not null default 0,                     -- "أجاب على X طالب"
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.teacher_profiles is
  'بروفايل المدرّس. verification_status و answered_count حقول لا يعدّلها المدرّس بنفسه.';

create index idx_teacher_profiles_gov on public.teacher_profiles (governorate_id);
create index idx_teacher_profiles_status on public.teacher_profiles (verification_status);

-- -------------------------------------------------------------
-- تريغر: updated_at
-- -------------------------------------------------------------
create trigger trg_student_profiles_updated_at
  before update on public.student_profiles
  for each row execute function public.set_updated_at();

create trigger trg_teacher_profiles_updated_at
  before update on public.teacher_profiles
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- تريغر: تعديل مرحلة الطالب يمسح أسئلته السابقة (منطق مطلوب صراحة)
-- (جدول questions يُنشأ في migration لاحق؛ التريغر يُنفَّذ وقت التشغيل فقط)
-- -------------------------------------------------------------
create or replace function public.handle_student_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.stage_id is distinct from old.stage_id then
    delete from public.questions where student_id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger trg_student_stage_change
  after update of stage_id on public.student_profiles
  for each row execute function public.handle_student_stage_change();

-- -------------------------------------------------------------
-- تريغر أمان: منع المدرّس (غير الإداري) من تعديل الحقول الحسّاسة
-- (verification_status / answered_count) — تُعاد لقيمتها القديمة بصمت.
-- استثناء: الإدارة، أو تريغرات النظام التي ترفع الإشارة app.privileged_write
-- (مثل تريغر زيادة العدّاد) — لأنها تعديلات موثوقة لا تأتي من المستخدم مباشرةً.
-- ملاحظة: عملاء PostgREST لا يستطيعون ضبط هذه الإشارة، فتبقى الحماية فعّالة.
-- -------------------------------------------------------------
create or replace function public.protect_teacher_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin()
     or coalesce(current_setting('app.privileged_write', true), '') = 'on' then
    return new;                       -- الإدارة أو تريغر نظام موثوق
  end if;
  new.verification_status := old.verification_status;
  new.answered_count      := old.answered_count;
  return new;
end;
$$;

create trigger trg_protect_teacher_fields
  before update on public.teacher_profiles
  for each row execute function public.protect_teacher_privileged_fields();

-- =============================================================
-- RLS
-- =============================================================

-- ---------- student_profiles ----------
alter table public.student_profiles enable row level security;

create policy "student reads own profile"
  on public.student_profiles for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

create policy "student inserts own profile"
  on public.student_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "student updates own profile"
  on public.student_profiles for update
  to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "student deletes own profile"
  on public.student_profiles for delete
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- ---------- teacher_profiles ----------
alter table public.teacher_profiles enable row level security;

-- المدرّسون المقبولون ظاهرون للعامة (للخريطة والبحث، حتى بدون حساب).
-- ملاحظة: إخفاء نقطة الخريطة يعتمد على location_visible في طبقة الاستعلام/الواجهة.
create policy "approved teachers are public"
  on public.teacher_profiles for select
  to anon, authenticated
  using (verification_status = 'approved');

create policy "teacher reads own profile"
  on public.teacher_profiles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "admin reads all teacher profiles"
  on public.teacher_profiles for select
  to authenticated
  using (public.is_admin());

create policy "teacher inserts own profile"
  on public.teacher_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

-- المدرّس يعدّل بروفايله؛ الحقول الحسّاسة يحرسها التريغر أعلاه.
create policy "teacher updates own profile"
  on public.teacher_profiles for update
  to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "teacher deletes own profile"
  on public.teacher_profiles for delete
  to authenticated
  using (auth.uid() = user_id or public.is_admin());
