-- =============================================================
-- 20260802090005_teacher_relations.sql
-- علاقات المدرّس متعددة القيم: المواد التي يدرّسها + المراحل التي يغطّيها
-- =============================================================

-- المواد التي يدرّسها المدرّس (many-to-many مع subjects)
create table public.teacher_subjects (
  teacher_id uuid not null references public.teacher_profiles (user_id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  primary key (teacher_id, subject_id)
);

comment on table public.teacher_subjects is 'ربط المدرّس بالمواد التي يدرّسها.';
create index idx_teacher_subjects_subject on public.teacher_subjects (subject_id);

-- المراحل الدراسية التي يغطّيها المدرّس (اختيار متعدد)
create table public.teacher_stages (
  teacher_id uuid not null references public.teacher_profiles (user_id) on delete cascade,
  stage_id   smallint not null references public.stages (id) on delete cascade,
  primary key (teacher_id, stage_id)
);

comment on table public.teacher_stages is 'ربط المدرّس بالمراحل الدراسية التي يقبل تدريسها (متعدد).';
create index idx_teacher_stages_stage on public.teacher_stages (stage_id);

-- =============================================================
-- RLS
-- =============================================================

-- ---------- teacher_subjects ----------
alter table public.teacher_subjects enable row level security;

create policy "teacher_subjects readable by everyone"
  on public.teacher_subjects for select
  to anon, authenticated
  using (true);

create policy "teacher manages own subjects"
  on public.teacher_subjects for all
  to authenticated
  using (auth.uid() = teacher_id or public.is_admin())
  with check (auth.uid() = teacher_id or public.is_admin());

-- ---------- teacher_stages ----------
alter table public.teacher_stages enable row level security;

create policy "teacher_stages readable by everyone"
  on public.teacher_stages for select
  to anon, authenticated
  using (true);

create policy "teacher manages own stages"
  on public.teacher_stages for all
  to authenticated
  using (auth.uid() = teacher_id or public.is_admin())
  with check (auth.uid() = teacher_id or public.is_admin());
