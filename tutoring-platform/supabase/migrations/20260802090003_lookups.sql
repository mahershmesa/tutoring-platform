-- =============================================================
-- 20260802090003_lookups.sql
-- جداول مرجعية: المحافظات، المراحل الدراسية، المواد (اختصاصات)
-- =============================================================

-- -------------------------------------------------------------
-- المحافظات (18 محافظة عراقية — قائمة ثابتة)
-- -------------------------------------------------------------
create table public.governorates (
  id   smallint generated always as identity primary key,
  name text not null unique
);

comment on table public.governorates is 'المحافظات العراقية الـ18 — أساس الخريطة والفلترة.';

insert into public.governorates (name) values
  ('بغداد'), ('البصرة'), ('نينوى'), ('أربيل'), ('النجف'),
  ('كربلاء'), ('الأنبار'), ('ديالى'), ('ذي قار'), ('بابل'),
  ('واسط'), ('ميسان'), ('المثنى'), ('القادسية'), ('صلاح الدين'),
  ('كركوك'), ('دهوك'), ('السليمانية');

-- -------------------------------------------------------------
-- المراحل الدراسية (قائمة ثابتة مع ترتيب)
-- -------------------------------------------------------------
create table public.stages (
  id         smallint generated always as identity primary key,
  name       text not null unique,
  sort_order smallint not null
);

comment on table public.stages is 'المراحل الدراسية المدعومة (الأول ... السادس + طالب جامعي).';

insert into public.stages (name, sort_order) values
  ('الأول', 1), ('الثاني', 2), ('الثالث', 3), ('الرابع', 4),
  ('الخامس', 5), ('السادس', 6), ('طالب جامعي', 7);

-- -------------------------------------------------------------
-- المواد / الاختصاصات — تُدار من لوحة الإدارة (قابلة للإضافة)
-- -------------------------------------------------------------
create table public.subjects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  active     boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.subjects is 'المواد الرسمية. الإدارة فقط تضيف/تعطّل، وتظهر بكل مكان في الموقع.';

-- =============================================================
-- RLS
-- =============================================================

-- المحافظات: قراءة عامة (حتى بدون حساب)، تعديل للإدارة فقط.
alter table public.governorates enable row level security;

create policy "governorates readable by everyone"
  on public.governorates for select
  to anon, authenticated
  using (true);

create policy "only admin writes governorates"
  on public.governorates for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- المراحل: قراءة عامة، تعديل للإدارة فقط.
alter table public.stages enable row level security;

create policy "stages readable by everyone"
  on public.stages for select
  to anon, authenticated
  using (true);

create policy "only admin writes stages"
  on public.stages for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- المواد: قراءة عامة (لازمة للقوائم المنسدلة والفلترة)، تعديل للإدارة فقط.
alter table public.subjects enable row level security;

create policy "subjects readable by everyone"
  on public.subjects for select
  to anon, authenticated
  using (true);

create policy "only admin writes subjects"
  on public.subjects for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
