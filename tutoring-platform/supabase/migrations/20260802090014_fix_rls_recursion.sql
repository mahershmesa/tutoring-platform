-- =============================================================
-- 20260802090014_fix_rls_recursion.sql
-- إصلاح تكرار لا نهائي في سياسات RLS.
--
-- المشكلة: سياسة SELECT على questions تشير إلى notifications، وسياسة
-- notifications تشير إلى questions. أي استعلام يقيّم الاثنتين متداخلتين
-- (مثلاً إدراج رسالة يفحص ملكية السؤال) يسبّب:
--   questions → notifications → questions → ... (infinite recursion)
--
-- الحل: ننقل الفحوص المتقاطعة إلى دوال SECURITY DEFINER تتجاوز RLS،
-- فتنكسر الحلقة (الدالة تقرأ الجدول الآخر بدون تفعيل سياساته).
-- =============================================================

create or replace function public.owns_question(qid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.questions
    where id = qid and student_id = auth.uid()
  );
$$;

create or replace function public.is_notified_teacher(qid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.notifications
    where question_id = qid and teacher_id = auth.uid()
  );
$$;

-- -------------------------------------------------------------
-- إعادة صياغة السياسات باستخدام الدوال (ALTER يحافظ على هوية السياسة)
-- -------------------------------------------------------------

-- questions: يقرأ صاحبه، أو مدرّس مُشعَر، أو الإدارة
alter policy "read questions as owner, notified teacher, or admin"
  on public.questions
  using (
    auth.uid() = student_id
    or public.is_admin()
    or public.is_notified_teacher(id)
  );

-- notifications: يقرأ المدرّس المستهدف، أو صاحب السؤال، أو الإدارة
alter policy "read notifications as teacher, question owner, or admin"
  on public.notifications
  using (
    auth.uid() = teacher_id
    or public.is_admin()
    or public.owns_question(question_id)
  );

-- notifications: تحديث من المدرّس، أو صاحب السؤال، أو الإدارة
alter policy "teacher, question owner, or admin updates notifications"
  on public.notifications
  using (
    auth.uid() = teacher_id
    or public.is_admin()
    or public.owns_question(question_id)
  )
  with check (
    auth.uid() = teacher_id
    or public.is_admin()
    or public.owns_question(question_id)
  );

-- messages: يقرأ المشاركون (صاحب السؤال أو المدرّس المُشعَر) أو الإدارة
alter policy "read messages as participant or admin"
  on public.messages
  using (
    public.is_admin()
    or public.owns_question(question_id)
    or public.is_notified_teacher(question_id)
  );

-- messages: يرسل المشارك فقط (المرسِل هو المستخدم الحالي وطرف في المحادثة)
alter policy "participant sends messages"
  on public.messages
  with check (
    auth.uid() = sender_id
    and (
      public.owns_question(question_id)
      or public.is_notified_teacher(question_id)
    )
  );
