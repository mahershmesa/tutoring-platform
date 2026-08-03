-- =============================================================
-- 20260802090017_message_privacy_attachments.sql
--   * خصوصية صارمة 1-إلى-1 للرسائل (recipient_id) — تسدّ تسريب النص بين المدرّسين.
--   * مرفقات الرسائل (ملف/صورة) في bucket خاص محمي بحيث يصله فقط:
--       - الطالب صاحب السؤال، و
--       - المدرّس صاحب المحادثة تحديداً (مجلده فقط).
-- =============================================================

-- -------------------------------------------------------------
-- أعمدة جديدة على الرسائل
-- -------------------------------------------------------------
alter table public.messages
  add column if not exists recipient_id    uuid references auth.users(id) on delete cascade,
  add column if not exists attachment_path text,
  add column if not exists attachment_mime text,
  add column if not exists attachment_name text;

create index if not exists idx_messages_recipient on public.messages (recipient_id);

-- -------------------------------------------------------------
-- تشديد قراءة الرسائل: المرسِل أو المستقبِل أو الإدارة فقط (لا "كل مدرّسي السؤال")
-- -------------------------------------------------------------
alter policy "read messages as participant or admin"
  on public.messages
  using (
    auth.uid() = sender_id
    or auth.uid() = recipient_id
    or public.is_admin()
  );

-- الإدراج يبقى: المرسِل طرف في السؤال (خصوصية القراءة مضمونة بسياسة SELECT أعلاه)
-- (لا تغيير على "participant sends messages")

-- -------------------------------------------------------------
-- bucket المرفقات (خاص) + حدود الحجم والأنواع
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-attachments', 'message-attachments', false, 10485760, -- 10MB
  array['image/png','image/jpeg','image/webp','image/gif','application/pdf']
)
on conflict (id) do nothing;

-- -------------------------------------------------------------
-- دالة تحكّم آمنة: هل يحق للمستخدم الحالي الوصول لمرفق بهذا المسار؟
-- المسار: <question_id>/<teacher_id>/<file>
--   * الإدارة: نعم.
--   * صاحب السؤال (الطالب): كل مجلدات سؤاله.
--   * المدرّس: فقط المجلد الذي يحمل هويته، وبشرط أنه مُشعَر بهذا السؤال.
-- (تتعامل بأمان مع المسارات غير الصالحة — ترجع false بلا خطأ).
-- -------------------------------------------------------------
create or replace function public.can_access_message_attachment(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  parts text[];
  qid uuid;
  tid text;
begin
  parts := storage.foldername(object_name);
  if parts is null or array_length(parts, 1) < 1 then
    return false;
  end if;
  begin
    qid := parts[1]::uuid;
  exception when others then
    return false;
  end;
  tid := parts[2];

  if public.is_admin() then
    return true;
  end if;
  if public.owns_question(qid) then
    return true;
  end if;
  if tid is not null and tid = auth.uid()::text
     and public.is_notified_teacher(qid) then
    return true;
  end if;
  return false;
end;
$$;

-- -------------------------------------------------------------
-- سياسات storage للمرفقات (قراءة/رفع/حذف) عبر الدالة الآمنة
-- -------------------------------------------------------------
create policy "read message attachments as participant"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'message-attachments'
    and public.can_access_message_attachment(name)
  );

create policy "upload message attachments as participant"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'message-attachments'
    and public.can_access_message_attachment(name)
  );

create policy "delete message attachments as participant"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'message-attachments'
    and public.can_access_message_attachment(name)
  );
