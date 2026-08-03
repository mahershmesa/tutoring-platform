-- =============================================================
-- 20260802090016_security_hardening.sql
-- تحصينات أمنية من التدقيق:
--   (3ب) حدود حجم/أنواع الملفات على الـ buckets (منع رفع ملفات ضخمة/خبيثة).
--   (6)  عدّاد "أجاب على X" لا يزيد إلا لو المدرّس أرسل رداً فعلياً (منع التزوير).
--   (6)  حدّ لعدد الأسئلة لكل طالب خلال نافذة زمنية (منع السبام).
-- =============================================================

-- -------------------------------------------------------------
-- (3ب) حدود التخزين: حجم أقصى + أنواع MIME مسموحة
-- -------------------------------------------------------------
update storage.buckets
  set file_size_limit = 5242880, -- 5MB
      allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif']
  where id in ('avatars', 'ads');

update storage.buckets
  set file_size_limit = 10485760, -- 10MB
      allowed_mime_types = array['image/png','image/jpeg','image/webp','application/pdf']
  where id = 'id-documents';

-- -------------------------------------------------------------
-- (6) العدّاد لا يزيد إلا مع رد فعلي من المدرّس على هذا السؤال
-- -------------------------------------------------------------
create or replace function public.handle_notification_answered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'answered' and old.status is distinct from 'answered' then
    -- شرط النزاهة: يجب أن يكون المدرّس قد أرسل رسالة على هذا السؤال فعلاً
    if exists (
      select 1 from public.messages m
      where m.question_id = new.question_id
        and m.sender_id = new.teacher_id
    ) then
      perform set_config('app.privileged_write', 'on', true);
      update public.teacher_profiles
        set answered_count = answered_count + 1
        where user_id = new.teacher_id;
      perform set_config('app.privileged_write', 'off', true);
    end if;
  end if;
  return new;
end;
$$;

-- -------------------------------------------------------------
-- (6) حدّ معدّل الأسئلة: أقصى 20 سؤالاً لكل طالب في الساعة الأخيرة
-- -------------------------------------------------------------
create or replace function public.enforce_question_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
begin
  select count(*) into recent_count
  from public.questions
  where student_id = new.student_id
    and created_at > now() - interval '1 hour';

  if recent_count >= 20 then
    raise exception 'تجاوزت الحد المسموح من الأسئلة. حاول لاحقاً.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger trg_question_rate_limit
  before insert on public.questions
  for each row execute function public.enforce_question_rate_limit();
