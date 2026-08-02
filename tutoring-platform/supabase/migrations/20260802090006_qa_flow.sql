-- =============================================================
-- 20260802090006_qa_flow.sql
-- قلب التطبيق: الأسئلة، الإشعارات، الرسائل + منطق التوزيع والعدّاد
-- =============================================================

-- -------------------------------------------------------------
-- الأسئلة — الطالب يختار مادة واحدة ويرسل أسئلته ضمن جلسة
-- نخزّن snapshot للمرحلة والمحافظة وقت السؤال (للمطابقة والتاريخ)
-- -------------------------------------------------------------
create table public.questions (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references auth.users (id) on delete cascade,
  subject_id     uuid not null references public.subjects (id),
  stage_id       smallint not null references public.stages (id),
  governorate_id smallint not null references public.governorates (id),
  question_text  text not null,
  status         public.question_status not null default 'open',
  created_at     timestamptz not null default now()
);

comment on table public.questions is 'أسئلة الطلاب. تُحذف تلقائياً عند تغيير الطالب لمرحلته الدراسية.';
create index idx_questions_student on public.questions (student_id);
create index idx_questions_subject on public.questions (subject_id);

-- -------------------------------------------------------------
-- الإشعارات — نسخة لكل مدرّس مطابق للسؤال
-- -------------------------------------------------------------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  teacher_id  uuid not null references public.teacher_profiles (user_id) on delete cascade,
  status      public.notification_status not null default 'sent',
  sent_at     timestamptz not null default now(),
  unique (question_id, teacher_id)
);

comment on table public.notifications is 'إشعار موجّه لمدرّس مطابق. status=answered عند تأكيد الطالب لاستلام رد.';
create index idx_notifications_teacher on public.notifications (teacher_id, status);
create index idx_notifications_question on public.notifications (question_id);

-- -------------------------------------------------------------
-- الرسائل — المحادثة الداخلية ضمن سؤال معيّن
-- -------------------------------------------------------------
create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  sender_id   uuid not null references auth.users (id) on delete cascade,
  body        text not null,
  sent_at     timestamptz not null default now()
);

comment on table public.messages is 'رسائل المحادثة داخل السؤال بين الطالب والمدرّس.';
create index idx_messages_question on public.messages (question_id);

-- =============================================================
-- المنطق (Triggers)
-- =============================================================

-- توزيع الإشعارات: عند إنشاء سؤال، أنشئ إشعاراً لكل مدرّس:
--   مقبول (approved) + يدرّس نفس المادة + يغطّي نفس المرحلة + بنفس المحافظة.
-- (عدّل شروط المطابقة هنا إذا رغبت بتوسيع أو تضييق النطاق)
create or replace function public.fanout_question_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
  on conflict (question_id, teacher_id) do nothing;
  return new;
end;
$$;

create trigger trg_fanout_question_notifications
  after insert on public.questions
  for each row execute function public.fanout_question_notifications();

-- العدّاد: عند تحوّل الإشعار إلى answered، زد answered_count للمدرّس مرة واحدة.
create or replace function public.handle_notification_answered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'answered' and old.status is distinct from 'answered' then
    -- ارفع إشارة موثوقة (transaction-local) ليسمح تريغر الحماية بتعديل العدّاد
    perform set_config('app.privileged_write', 'on', true);
    update public.teacher_profiles
      set answered_count = answered_count + 1
      where user_id = new.teacher_id;
    perform set_config('app.privileged_write', 'off', true);
  end if;
  return new;
end;
$$;

create trigger trg_notification_answered
  after update of status on public.notifications
  for each row execute function public.handle_notification_answered();

-- =============================================================
-- RLS
-- =============================================================

-- ---------- questions ----------
alter table public.questions enable row level security;

-- يقرأ السؤال: صاحبه (الطالب)، أو مدرّس وصله إشعار عنه، أو الإدارة.
create policy "read questions as owner, notified teacher, or admin"
  on public.questions for select
  to authenticated
  using (
    auth.uid() = student_id
    or public.is_admin()
    or exists (
      select 1 from public.notifications n
      where n.question_id = questions.id
        and n.teacher_id = auth.uid()
    )
  );

create policy "student creates own questions"
  on public.questions for insert
  to authenticated
  with check (auth.uid() = student_id);

create policy "student or admin updates questions"
  on public.questions for update
  to authenticated
  using (auth.uid() = student_id or public.is_admin())
  with check (auth.uid() = student_id or public.is_admin());

create policy "student or admin deletes questions"
  on public.questions for delete
  to authenticated
  using (auth.uid() = student_id or public.is_admin());

-- ---------- notifications ----------
alter table public.notifications enable row level security;

-- يقرأ الإشعار: المدرّس المستهدف، أو الطالب صاحب السؤال، أو الإدارة.
create policy "read notifications as teacher, question owner, or admin"
  on public.notifications for select
  to authenticated
  using (
    auth.uid() = teacher_id
    or public.is_admin()
    or exists (
      select 1 from public.questions q
      where q.id = notifications.question_id
        and q.student_id = auth.uid()
    )
  );

-- الإنشاء يتم عبر التريغر (SECURITY DEFINER). مباشرةً: الإدارة فقط.
create policy "only admin inserts notifications directly"
  on public.notifications for insert
  to authenticated
  with check (public.is_admin());

-- التحديث: المدرّس (read) أو الطالب صاحب السؤال (answered) أو الإدارة.
create policy "teacher, question owner, or admin updates notifications"
  on public.notifications for update
  to authenticated
  using (
    auth.uid() = teacher_id
    or public.is_admin()
    or exists (
      select 1 from public.questions q
      where q.id = notifications.question_id
        and q.student_id = auth.uid()
    )
  )
  with check (
    auth.uid() = teacher_id
    or public.is_admin()
    or exists (
      select 1 from public.questions q
      where q.id = notifications.question_id
        and q.student_id = auth.uid()
    )
  );

create policy "only admin deletes notifications"
  on public.notifications for delete
  to authenticated
  using (public.is_admin());

-- ---------- messages ----------
alter table public.messages enable row level security;

-- يقرأ الرسائل: الطالب صاحب السؤال، أو المدرّس المُشعَر، أو الإدارة.
create policy "read messages as participant or admin"
  on public.messages for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.questions q
      where q.id = messages.question_id and q.student_id = auth.uid()
    )
    or exists (
      select 1 from public.notifications n
      where n.question_id = messages.question_id and n.teacher_id = auth.uid()
    )
  );

-- الإرسال: المرسِل هو المستخدم الحالي وطرف في المحادثة (طالب صاحب السؤال أو مدرّس مُشعَر).
create policy "participant sends messages"
  on public.messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and (
      exists (
        select 1 from public.questions q
        where q.id = messages.question_id and q.student_id = auth.uid()
      )
      or exists (
        select 1 from public.notifications n
        where n.question_id = messages.question_id and n.teacher_id = auth.uid()
      )
    )
  );

create policy "sender or admin deletes messages"
  on public.messages for delete
  to authenticated
  using (auth.uid() = sender_id or public.is_admin());
