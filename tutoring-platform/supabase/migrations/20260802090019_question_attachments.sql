-- =============================================================
-- 20260802090019_question_attachments.sql
-- مرفق يُرسَل مع السؤال الأول. بخلاف مرفق الرسالة (1-إلى-1)، مرفق السؤال
-- يُبَثّ لكل المدرّسين المطابقين — بنفس نطاق رؤية السؤال نفسه.
-- =============================================================

-- أعمدة المرفق على السؤال
alter table public.questions
  add column if not exists attachment_path text,
  add column if not exists attachment_mime text,
  add column if not exists attachment_name text;

-- bucket خاص لمرفقات الأسئلة، مسار <question_id>/<file>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'question-attachments', 'question-attachments', false, 10485760, -- 10MB
  array['image/png','image/jpeg','image/webp','image/gif','application/pdf']
)
on conflict (id) do nothing;

-- دالة تحكّم آمنة: يصل لمرفق السؤال الطالب صاحبه أو أي مدرّس مُشعَر (أو الإدارة).
-- المسار: <question_id>/<file>
create or replace function public.can_access_question_attachment(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  parts text[];
  qid uuid;
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
  return public.is_admin()
      or public.owns_question(qid)
      or public.is_notified_teacher(qid);
end;
$$;

create policy "read question attachments as participant"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'question-attachments'
    and public.can_access_question_attachment(name)
  );

-- الرفع: صاحب السؤال فقط (الطالب) — يرفع في مجلد سؤاله.
create policy "student uploads own question attachment"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'question-attachments'
    and public.owns_question((storage.foldername(name))[1]::uuid)
  );

create policy "owner or admin deletes question attachment"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'question-attachments'
    and (
      public.is_admin()
      or public.owns_question((storage.foldername(name))[1]::uuid)
    )
  );
