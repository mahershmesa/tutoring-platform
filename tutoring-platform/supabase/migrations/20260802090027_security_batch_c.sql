-- =============================================================
-- 20260802090027_security_batch_c.sql — دفعة الأمان (ج، تحصينات)
-- (#12) منع إعادة توجيه مفاتيح الإشعار (teacher_id/question_id) من العميل.
-- (#13) استثناء المدرّس المعطّل من توزيع الإشعارات أيضاً.
-- (#14) تقييد تنفيذ is_account_deactivated (لا حاجة للعموم).
-- (#15) تثبيت search_path لدالة norm_answer.
--
-- ملاحظة: البند (#11) أُسقِط — حارس migration 24 يعتمد على auth.uid()
-- (يقرأ الـ JWT، موثوق داخل SECURITY DEFINER حيث current_user = المالك)،
-- وهو الصحيح؛ تغييره لـ current_user كان سيعطّله.
-- =============================================================


-- ---------- (#12) منع تعديل مفاتيح الإشعار من العميل ----------
create or replace function public.guard_notification_keys()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- أدوار التطبيق لا تقدر تعيد توجيه الإشعار لسؤال/مدرّس آخر.
  if current_user in ('authenticated', 'anon') then
    new.teacher_id  := old.teacher_id;
    new.question_id := old.question_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_notification_keys on public.notifications;
create trigger trg_guard_notification_keys
  before update on public.notifications
  for each row execute function public.guard_notification_keys();


-- ---------- (#13) استثناء المعطّلين من التوزيع ----------
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
    and not public.is_account_deactivated(tp.user_id)
  on conflict (question_id, teacher_id) do nothing;
  return new;
end;
$$;


-- ---------- (#14) تقييد تنفيذ is_account_deactivated ----------
-- يُستدعى داخلياً فقط (العرض/الدوال definer تملك الصلاحية بحكم مالكها).
revoke all on function public.is_account_deactivated(uuid) from public;


-- ---------- (#15) تثبيت search_path لـ norm_answer ----------
create or replace function public.norm_answer(a text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$ select lower(btrim(regexp_replace(coalesce(a, ''), '\s+', ' ', 'g'))); $$;
