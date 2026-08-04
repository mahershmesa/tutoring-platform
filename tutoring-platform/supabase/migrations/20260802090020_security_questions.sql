-- =============================================================
-- 20260802090020_security_questions.sql
-- استرجاع كلمة المرور عبر "سؤال أمان" (لا بريد/OTP).
-- الجواب يُخزَّن مُشفّراً (bcrypt عبر pgcrypto). كل الوصول عبر دوال
-- SECURITY DEFINER — لا وصول مباشر للجدول.
-- =============================================================

create table public.security_credentials (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  question        text not null,
  answer_hash     text not null,
  failed_attempts int not null default 0,
  locked_until    timestamptz,
  updated_at      timestamptz not null default now()
);

alter table public.security_credentials enable row level security;
-- لا سياسات مباشرة: الوصول حصراً عبر الدوال أدناه.

-- تطبيع الجواب (تجاهل حالة الأحرف والمسافات الزائدة)
create or replace function public.norm_answer(a text)
returns text
language sql
immutable
as $$ select lower(btrim(regexp_replace(coalesce(a, ''), '\s+', ' ', 'g'))); $$;

-- يضبط/يحدّث سؤال الأمان للمستخدم الحالي
create or replace function public.set_security_credential(p_question text, p_answer text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;
  if coalesce(btrim(p_question), '') = '' or coalesce(btrim(p_answer), '') = '' then
    raise exception 'question and answer are required';
  end if;
  insert into public.security_credentials (user_id, question, answer_hash, failed_attempts, locked_until, updated_at)
  values (auth.uid(), p_question, crypt(public.norm_answer(p_answer), gen_salt('bf')), 0, null, now())
  on conflict (user_id) do update
    set question = excluded.question,
        answer_hash = excluded.answer_hash,
        failed_attempts = 0,
        locked_until = null,
        updated_at = now();
end;
$$;

-- هل ضبط المستخدم الحالي سؤال أمان؟
create or replace function public.has_security_credential()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.security_credentials where user_id = auth.uid());
$$;

-- تحقّق الجواب (يُستدعى من الخادم بمفتاح الخدمة فقط).
-- يرجّع: 'ok' | 'wrong' | 'locked' | 'notset'. مع قفل بعد ٥ محاولات خاطئة.
create or replace function public.check_security_answer(p_user_id uuid, p_answer text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  rec public.security_credentials;
begin
  select * into rec from public.security_credentials where user_id = p_user_id;
  if not found then
    return 'notset';
  end if;
  if rec.locked_until is not null and rec.locked_until > now() then
    return 'locked';
  end if;
  if rec.answer_hash = crypt(public.norm_answer(p_answer), rec.answer_hash) then
    update public.security_credentials
      set failed_attempts = 0, locked_until = null where user_id = p_user_id;
    return 'ok';
  else
    update public.security_credentials
      set failed_attempts = failed_attempts + 1,
          locked_until = case when failed_attempts + 1 >= 5
                              then now() + interval '15 minutes' else locked_until end
      where user_id = p_user_id;
    return 'wrong';
  end if;
end;
$$;

-- تقييد الاستدعاء: مفتاح الخدمة فقط (يمنع التخمين من العميل)
revoke all on function public.check_security_answer(uuid, text) from public;
grant execute on function public.check_security_answer(uuid, text) to service_role;
