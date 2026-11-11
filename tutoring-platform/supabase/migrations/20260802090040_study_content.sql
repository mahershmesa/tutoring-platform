-- =============================================================
-- 20260802090040_study_content.sql — محتوى المدرّس: الوزاريات + اختبر نفسك
--
-- قسمان، المحتوى يرفعه المدرّس المعتمد (approved) وبمواده فقط:
--   1) exam_papers — بنك الوزاريات/النماذج (ملفات PDF/صور) معزول لكل مادة.
--   2) quizzes + quiz_questions — اختبار MCQ تفاعلي مصنّف حسب المادة + الفصل.
--
-- أمان محوري: الإجابة الصحيحة (correct_index) لا تُقرأ أبداً من العميل.
--   * الطلاب يقرؤون الأسئلة عبر view بلا عمود الإجابة (quiz_questions_public).
--   * التصحيح عبر دالة SECURITY DEFINER (grade_quiz) تحسب الدرجة في القاعدة.
-- =============================================================

-- @section: 40/00 approval helpers
-- -------------------------------------------------------------
-- مساعد: هل المستخدم الحالي مدرّس معتمد ويُدرّس هذه المادة؟
-- -------------------------------------------------------------
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
  );
$$;
revoke all on function public.is_approved_teacher_of(uuid) from public;
grant execute on function public.is_approved_teacher_of(uuid) to authenticated;

-- مساعد: هل المستخدم الحالي مدرّس معتمد (بلا تقييد مادة)؟ لسياسات التخزين.
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
  );
$$;
revoke all on function public.is_approved_teacher() from public;
grant execute on function public.is_approved_teacher() to authenticated;

-- @section: 40/01 exam papers
-- =============================================================
-- 1) بنك الوزاريات/النماذج (ملفات)
-- =============================================================
create table if not exists public.exam_papers (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references auth.users (id) on delete cascade,
  subject_id  uuid not null references public.subjects (id),
  stage_id    smallint references public.stages (id),       -- اختياري: عام للمادة
  year        smallint,                                      -- سنة الوزاري (اختياري)
  title       text not null,
  file_path   text not null,
  file_mime   text,
  file_name   text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_exam_papers_subject on public.exam_papers (subject_id, stage_id);
create index if not exists idx_exam_papers_teacher on public.exam_papers (teacher_id);

alter table public.exam_papers enable row level security;

-- يقرأ الوزاريات: كل مستخدم مسجّل (محتوى دراسي عام).
drop policy if exists "read exam papers" on public.exam_papers;
create policy "read exam papers"
  on public.exam_papers for select
  to authenticated
  using (true);

-- يرفع: المدرّس المعتمد لنفسه وبمادته فقط.
drop policy if exists "approved teacher inserts own exam papers" on public.exam_papers;
create policy "approved teacher inserts own exam papers"
  on public.exam_papers for insert
  to authenticated
  with check (
    auth.uid() = teacher_id
    and public.is_approved_teacher_of(subject_id)
  );

-- يحذف/يعدّل: صاحبه أو الإدارة (الإدارة تزيل المخالف).
drop policy if exists "owner or admin updates exam papers" on public.exam_papers;
create policy "owner or admin updates exam papers"
  on public.exam_papers for update
  to authenticated
  using (auth.uid() = teacher_id or public.is_admin())
  with check (auth.uid() = teacher_id or public.is_admin());

drop policy if exists "owner or admin deletes exam papers" on public.exam_papers;
create policy "owner or admin deletes exam papers"
  on public.exam_papers for delete
  to authenticated
  using (auth.uid() = teacher_id or public.is_admin());

-- @section: 40/02 quizzes + questions view + grading
-- =============================================================
-- 2) اختبر نفسك — اختبارات MCQ تفاعلية
-- =============================================================
create table if not exists public.quizzes (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references auth.users (id) on delete cascade,
  subject_id  uuid not null references public.subjects (id),
  stage_id    smallint references public.stages (id),
  chapter     text not null,                                 -- الفصل/الوحدة
  title       text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_quizzes_subject on public.quizzes (subject_id, stage_id);
create index if not exists idx_quizzes_teacher on public.quizzes (teacher_id);

create table if not exists public.quiz_questions (
  id            uuid primary key default gen_random_uuid(),
  quiz_id       uuid not null references public.quizzes (id) on delete cascade,
  prompt        text not null,
  options       jsonb not null,                              -- مصفوفة نصوص (2..6)
  correct_index smallint not null,                           -- 0-based
  sort_order    int not null default 0,
  constraint quiz_options_count check (
    jsonb_typeof(options) = 'array'
    and jsonb_array_length(options) between 2 and 6
  ),
  constraint quiz_correct_in_range check (
    correct_index >= 0 and correct_index < jsonb_array_length(options)
  )
);
create index if not exists idx_quiz_questions_quiz on public.quiz_questions (quiz_id, sort_order);

create table if not exists public.quiz_attempts (
  id          uuid primary key default gen_random_uuid(),
  quiz_id     uuid not null references public.quizzes (id) on delete cascade,
  student_id  uuid not null references auth.users (id) on delete cascade,
  score       smallint not null,
  total       smallint not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_quiz_attempts_student on public.quiz_attempts (student_id, quiz_id);

alter table public.quizzes        enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts  enable row level security;

-- ---------- quizzes ----------
drop policy if exists "read quizzes" on public.quizzes;
create policy "read quizzes"
  on public.quizzes for select
  to authenticated
  using (true);

drop policy if exists "approved teacher inserts own quizzes" on public.quizzes;
create policy "approved teacher inserts own quizzes"
  on public.quizzes for insert
  to authenticated
  with check (auth.uid() = teacher_id and public.is_approved_teacher_of(subject_id));

drop policy if exists "owner or admin updates quizzes" on public.quizzes;
create policy "owner or admin updates quizzes"
  on public.quizzes for update
  to authenticated
  using (auth.uid() = teacher_id or public.is_admin())
  with check (auth.uid() = teacher_id or public.is_admin());

drop policy if exists "owner or admin deletes quizzes" on public.quizzes;
create policy "owner or admin deletes quizzes"
  on public.quizzes for delete
  to authenticated
  using (auth.uid() = teacher_id or public.is_admin());

-- ---------- quiz_questions ----------
-- القراءة المباشرة (مع الإجابة): صاحب الاختبار أو الإدارة فقط — لا الطلاب.
drop policy if exists "owner or admin reads quiz questions" on public.quiz_questions;
create policy "owner or admin reads quiz questions"
  on public.quiz_questions for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.quizzes q
      where q.id = quiz_questions.quiz_id and q.teacher_id = auth.uid()
    )
  );

-- كتابة الأسئلة: صاحب الاختبار فقط.
drop policy if exists "owner writes quiz questions" on public.quiz_questions;
create policy "owner writes quiz questions"
  on public.quiz_questions for insert
  to authenticated
  with check (
    exists (
      select 1 from public.quizzes q
      where q.id = quiz_questions.quiz_id and q.teacher_id = auth.uid()
    )
  );

drop policy if exists "owner updates quiz questions" on public.quiz_questions;
create policy "owner updates quiz questions"
  on public.quiz_questions for update
  to authenticated
  using (
    exists (select 1 from public.quizzes q
            where q.id = quiz_questions.quiz_id and q.teacher_id = auth.uid())
  )
  with check (
    exists (select 1 from public.quizzes q
            where q.id = quiz_questions.quiz_id and q.teacher_id = auth.uid())
  );

drop policy if exists "owner or admin deletes quiz questions" on public.quiz_questions;
create policy "owner or admin deletes quiz questions"
  on public.quiz_questions for delete
  to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.quizzes q
               where q.id = quiz_questions.quiz_id and q.teacher_id = auth.uid())
  );

-- عرض عام للطلاب: كل الأعمدة عدا الإجابة الصحيحة (يتجاوز RLS كونه مملوكاً للمالك).
drop view if exists public.quiz_questions_public;
create view public.quiz_questions_public
with (security_invoker = off) as
  select id, quiz_id, prompt, options, sort_order
  from public.quiz_questions;
-- مهم: العروض تأخذ صلاحيات Supabase الافتراضية الكاملة (ALL لـ anon/authenticated)
-- وتتجاوز RLS، فالعرض البسيط يقبل UPDATE/DELETE من أي زائر. قراءة فقط:
revoke all on public.quiz_questions_public from public, anon, authenticated;
grant select on public.quiz_questions_public to authenticated;

-- ---------- quiz_attempts ----------
-- الطالب يقرأ محاولاته؛ صاحب الاختبار يقرأ محاولات اختباره (تفاعل).
drop policy if exists "student or quiz owner reads attempts" on public.quiz_attempts;
create policy "student or quiz owner reads attempts"
  on public.quiz_attempts for select
  to authenticated
  using (
    auth.uid() = student_id
    or public.is_admin()
    or exists (select 1 from public.quizzes q
               where q.id = quiz_attempts.quiz_id and q.teacher_id = auth.uid())
  );
-- الإدراج يتم حصراً عبر grade_quiz (SECURITY DEFINER) — لا إدراج مباشر.

-- -------------------------------------------------------------
-- التصحيح الآمن: تحسب الدرجة في القاعدة وتسجّل المحاولة، وتكشف
-- الإجابات الصحيحة فقط بعد التسليم. p_answers: { "question_id": index }.
-- -------------------------------------------------------------
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
revoke all on function public.grade_quiz(uuid, jsonb) from public;
grant execute on function public.grade_quiz(uuid, jsonb) to authenticated;

-- @section: 40/03 storage bucket
-- =============================================================
-- 3) تخزين ملفات الوزاريات — bucket عام للقراءة، مقيّد الكتابة
--    المسار: <teacher_id>/<file>
-- =============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'study-resources', 'study-resources', true, 20971520, -- 20MB
  array['image/png','image/jpeg','image/webp','application/pdf']
)
on conflict (id) do nothing;

-- رفع: مدرّس معتمد، في مجلده الذي يحمل هويته فقط.
drop policy if exists "approved teacher uploads study resources" on storage.objects;
create policy "approved teacher uploads study resources"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'study-resources'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_approved_teacher()
  );

-- حذف: صاحب الملف (مجلده) أو الإدارة.
drop policy if exists "owner or admin deletes study resources" on storage.objects;
create policy "owner or admin deletes study resources"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'study-resources'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
