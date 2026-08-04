-- =============================================================
-- 20260802090024_guard_answer_confirmation.sql
-- يحصر إطلاق تأكيد الرد (status → 'answered') بصاحب السؤال (الطالب)
-- فقط — أو الإدارة أو سياق الخادم. يمنع مدرّساً من ضبط إشعاره بنفسه إلى
-- answered لتضخيم عدّاده (تزوير ذاتي)، فيبقى العدّاد "بفعل الطالب" حصراً.
-- (سياسة RLS تُبقي للمدرّس ضبط 'read' فقط؛ هذا الحارس يخصّ 'answered'.)
-- =============================================================

create or replace function public.guard_notification_answer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'answered' and old.status is distinct from 'answered' then
    -- auth.uid() = null → سياق خادم/خدمة (service_role) نثق به.
    -- الإدارة مسموحة. غير ذلك: يجب أن يكون المُحدِّث صاحب السؤال.
    if auth.uid() is not null and not public.is_admin() then
      if not exists (
        select 1 from public.questions q
        where q.id = new.question_id
          and q.student_id = auth.uid()
      ) then
        raise exception 'only the question owner may confirm an answer'
          using errcode = 'insufficient_privilege';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_guard_notification_answer
  before update of status on public.notifications
  for each row execute function public.guard_notification_answer();
