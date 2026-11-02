-- =============================================================
-- 20260802090039_referrals.sql — دعوة الأصدقاء (Referrals)
-- لكل مستخدم رمز دعوة فريد. من يسجّل عبر الرابط يُسجَّل كإحالة للداعي.
-- التسجيل عبر دوال SECURITY DEFINER فقط (لا إدراج مباشر — يمنع التلاعب).
-- =============================================================

create table if not exists public.referral_codes (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  code       text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id          uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_id uuid not null unique references auth.users(id) on delete cascade, -- مرّة واحدة لكل مدعوّ
  code        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_referrals_referrer on public.referrals (referrer_id);

alter table public.referral_codes enable row level security;
alter table public.referrals      enable row level security;

-- referral_codes: لا وصول مباشر للعميل (الرمز يُقرأ عبر دالة definer).
-- referrals: الداعي يقرأ إحالاته فقط (للعدّاد).
drop policy if exists "referrer reads own referrals" on public.referrals;
create policy "referrer reads own referrals"
  on public.referrals for select
  to authenticated
  using (auth.uid() = referrer_id);
grant select on public.referrals to authenticated;

-- رمز الدعوة للمستخدم الحالي (يُنشأ عند أوّل طلب).
create or replace function public.my_referral_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then return null; end if;
  select code into v_code from public.referral_codes where user_id = v_uid;
  if v_code is not null then return v_code; end if;
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 7));
    begin
      insert into public.referral_codes (user_id, code) values (v_uid, v_code);
      return v_code;
    exception when unique_violation then
      select code into v_code from public.referral_codes where user_id = v_uid;
      if v_code is not null then return v_code; end if;
      -- تصادم رمز نادر: أعد المحاولة
    end;
  end loop;
end;
$$;
revoke all on function public.my_referral_code() from public;
grant execute on function public.my_referral_code() to authenticated;

-- تسجيل إحالة: المستخدم الحالي (المدعوّ) وصل عبر رمز داعٍ.
create or replace function public.record_referral(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_referrer uuid;
begin
  if v_uid is null or coalesce(p_code, '') = '' then return; end if;
  select user_id into v_referrer from public.referral_codes where code = upper(p_code);
  if v_referrer is null or v_referrer = v_uid then return; end if;  -- لا إحالة للنفس
  insert into public.referrals (referrer_id, referred_id, code)
  values (v_referrer, v_uid, upper(p_code))
  on conflict (referred_id) do nothing;  -- لا يُحال المدعوّ مرّتين
end;
$$;
revoke all on function public.record_referral(text) from public;
grant execute on function public.record_referral(text) to authenticated;
