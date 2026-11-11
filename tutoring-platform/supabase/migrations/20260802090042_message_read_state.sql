-- =============================================================
-- 20260802090042_message_read_state.sql — حالة «مقروء/غير مقروء» للرسائل
--
-- لإشعار الطالب (والمدرّس) بالردود الجديدة داخل التطبيق: شارة بعدد غير
-- المقروء + قائمة «ردّ عليك الأستاذ فلان».
--
-- التصميم: جدول منفصل message_reads (صفّ لكل رسالة قُرئت) بدل عمود على
-- messages، فتبقى الرسائل غير قابلة للتعديل إطلاقاً (لا سياسة UPDATE عليها).
-- التعليم كمقروء عبر دوال SECURITY DEFINER فقط، وللمستلم فقط.
-- آمن للتكرار. ينتهي بسطر نتيجة للتأكد من نجاح التطبيق.
-- =============================================================

do $$
begin
  if to_regclass('public.message_reads') is null then
    create table public.message_reads (
      message_id uuid primary key references public.messages (id) on delete cascade,
      read_at    timestamptz not null default now()
    );
    -- كل الرسائل الموجودة قبل الميزة تُعتبر مقروءة (حتى لا تظهر شارات قديمة)
    insert into public.message_reads (message_id, read_at)
    select id, sent_at from public.messages
    on conflict (message_id) do nothing;
  end if;
end $$;

alter table public.message_reads enable row level security;

-- القراءة: طرفا الرسالة (المرسِل يرى «قُرئت»، المستلم يرى حالته) أو الإدارة.
-- لا سياسات إدراج/تعديل/حذف: الكتابة عبر الدوال أدناه فقط.
drop policy if exists "participants read message read-state" on public.message_reads;
create policy "participants read message read-state"
  on public.message_reads for select
  to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_reads.message_id
        and (m.recipient_id = auth.uid() or m.sender_id = auth.uid())
    )
    or (select public.is_admin())
  );

create index if not exists idx_messages_recipient_time
  on public.messages (recipient_id, sent_at desc);

-- يعلّم رسائل محادثة واحدة كمقروءة: ما أرسله p_other للمستخدم الحالي في هذا السؤال.
create or replace function public.mark_thread_read(p_question uuid, p_other uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  n     integer;
begin
  if v_uid is null then return 0; end if;
  insert into public.message_reads (message_id)
  select m.id from public.messages m
  where m.question_id = p_question
    and m.sender_id = p_other
    and m.recipient_id = v_uid          -- المستلم فقط يعلّم رسائله
  on conflict (message_id) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- يعلّم كل رسائل المستخدم الحالي الواردة كمقروءة.
create or replace function public.mark_all_messages_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  n     integer;
begin
  if v_uid is null then return 0; end if;
  insert into public.message_reads (message_id)
  select m.id from public.messages m
  where m.recipient_id = v_uid
  on conflict (message_id) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ملخّص الشارة: رسائل غير مقروءة + (للمدرّس) أسئلة جديدة لم تُفتح.
create or replace function public.my_notification_summary()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'unread_messages', (
      select count(*) from public.messages m
      where m.recipient_id = auth.uid()
        and not exists (
          select 1 from public.message_reads r where r.message_id = m.id
        )
    ),
    'new_questions', (
      select count(*) from public.notifications n
      where n.teacher_id = auth.uid() and n.status = 'sent'
    ),
    'is_teacher', exists (
      select 1 from public.teacher_profiles tp where tp.user_id = auth.uid()
    )
  );
$$;

-- للمسجّلين فقط (العروض والدوال تأخذ صلاحيات افتراضية للزائر — نسحبها صراحةً)
revoke execute on function public.mark_thread_read(uuid, uuid) from public, anon;
revoke execute on function public.mark_all_messages_read() from public, anon;
revoke execute on function public.my_notification_summary() from public, anon;
grant execute on function public.mark_thread_read(uuid, uuid) to authenticated;
grant execute on function public.mark_all_messages_read() to authenticated;
grant execute on function public.my_notification_summary() to authenticated;

-- سطر النتيجة: يظهر بعد نجاح التطبيق
select
  'تم ✅' as status,
  (select count(*) from public.messages)      as messages,
  (select count(*) from public.message_reads) as marked_read,
  has_function_privilege('anon', 'public.mark_thread_read(uuid, uuid)', 'EXECUTE') as anon_can_mark_read;
