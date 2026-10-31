-- =============================================================
-- 20260802090026_security_batch_b.sql — دفعة الأمان (ب)
-- (#5) تقييد recipient_id في الرسائل بالطرف الآخر الفعلي + حدّ معدّل للرسائل.
-- (#8) ختم created_at للسؤال من الخادم (منع تجاوز حدّ المعدّل).
-- (#9) اشتقاق المحافظة/المرحلة للسؤال من بروفايل الطالب (منع القصف الموجّه).
-- =============================================================


-- ======================================================================
-- (#5) الرسائل: المستلم لازم يكون الطرف الآخر الفعلي للسؤال
-- ======================================================================
drop policy if exists "participant sends messages" on public.messages;
create policy "participant sends messages"
  on public.messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and (
      -- المرسِل = صاحب السؤال (طالب) → المستلم مدرّس مُشعَر على هذا السؤال
      (
        exists (
          select 1 from public.questions q
          where q.id = messages.question_id and q.student_id = auth.uid()
        )
        and exists (
          select 1 from public.notifications n
          where n.question_id = messages.question_id
            and n.teacher_id = messages.recipient_id
        )
      )
      or
      -- المرسِل = مدرّس مُشعَر → المستلم هو صاحب السؤال
      (
        exists (
          select 1 from public.notifications n
          where n.question_id = messages.question_id and n.teacher_id = auth.uid()
        )
        and exists (
          select 1 from public.questions q
          where q.id = messages.question_id and q.student_id = messages.recipient_id
        )
      )
    )
  );

-- حدّ معدّل + ختم زمن للرسائل (منع البريد المزعج/المضايقة والتجاوز الزمني)
create or replace function public.enforce_message_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  new.sent_at := now(); -- لا ثقة بزمن العميل
  select count(*) into recent
  from public.messages
  where sender_id = new.sender_id
    and sent_at > now() - interval '1 hour';
  if recent >= 100 then
    raise exception 'تجاوزت حدّ الرسائل المسموح. حاول لاحقاً.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger trg_message_integrity
  before insert on public.messages
  for each row execute function public.enforce_message_integrity();


-- ======================================================================
-- (#8 + #9) الأسئلة: ختم الزمن + اشتقاق المحافظة/المرحلة من بروفايل الطالب
-- ======================================================================
create or replace function public.enforce_question_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sp record;
begin
  -- #8 لا ثقة بزمن العميل (يمنع تجاوز حدّ المعدّل بتواريخ قديمة)
  new.created_at := now();

  -- #9 المرحلة والمحافظة تُشتقّان من بروفايل الطالب (لا من حمولة العميل)
  select governorate_id, stage_id into sp
  from public.student_profiles
  where user_id = new.student_id;

  if sp.governorate_id is null or sp.stage_id is null then
    raise exception 'أكمل محافظتك ومرحلتك في البروفايل أولاً.'
      using errcode = 'check_violation';
  end if;

  new.governorate_id := sp.governorate_id;
  new.stage_id := sp.stage_id;
  return new;
end;
$$;

-- يعمل قبل تريغر حدّ المعدّل والتوزيع (الاسم أسبق أبجدياً).
create trigger trg_aa_question_integrity
  before insert on public.questions
  for each row execute function public.enforce_question_integrity();
