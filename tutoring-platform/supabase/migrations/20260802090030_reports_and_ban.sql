-- =============================================================
-- 20260802090030_reports_and_ban.sql — الإبلاغ وحظر الإدارة 🛡️
-- (أ) جدول البلاغات + طابور إشراف للإدارة.
-- (ب) حظر إداري: المحظور يختفي من الدليل ويُمنع من الرسائل/الأسئلة/التقييم.
-- =============================================================


-- ======================================================================
-- (أ) البلاغات
-- ======================================================================
create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references auth.users(id) on delete cascade,
  reported_id  uuid not null references auth.users(id) on delete cascade,
  context_type text check (context_type in ('user', 'message', 'question')),
  context_id   uuid,
  reason       text not null,
  status       text not null default 'open'
    check (status in ('open', 'reviewed', 'dismissed')),
  created_at   timestamptz not null default now()
);
create index if not exists idx_reports_status on public.reports (status, created_at desc);
-- بلاغ مفتوح واحد لكل (مُبلِّغ، مُبلَّغ عنه) — منع التكرار
create unique index if not exists uniq_open_report
  on public.reports (reporter_id, reported_id) where status = 'open';

alter table public.reports enable row level security;

-- المُبلِّغ يُدرج بلاغه فقط (لا عن نفسه)
drop policy if exists "user files a report" on public.reports;
create policy "user files a report"
  on public.reports for insert
  to authenticated
  with check (auth.uid() = reporter_id and reporter_id <> reported_id);

-- الإدارة فقط تقرأ البلاغات وتحدّث حالتها (خصوصية المُبلِّغين)
drop policy if exists "admin reads reports" on public.reports;
create policy "admin reads reports"
  on public.reports for select
  to authenticated
  using (public.is_admin());
drop policy if exists "admin updates reports" on public.reports;
create policy "admin updates reports"
  on public.reports for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update on public.reports to authenticated;


-- ======================================================================
-- (ب) الحظر الإداري
-- ======================================================================
alter table public.account_status
  add column if not exists banned boolean not null default false;

create or replace function public.is_banned(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select banned from public.account_status where user_id = uid), false);
$$;
-- السياسات المقيّدة (invoker) تستدعي is_banned كدور authenticated → يلزم منحها التنفيذ.
-- (الدليل view يعمل بصلاحيات المالك فلا يحتاج منحاً لـ anon.)
revoke all on function public.is_banned(uuid) from public;
grant execute on function public.is_banned(uuid) to authenticated;

-- حماية حقل banned: لا يعدّله إلا الإدارة (المستخدم لا يفكّ حظر نفسه)
create or replace function public.protect_account_ban()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    new.banned := old.banned;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_account_ban on public.account_status;
create trigger trg_protect_account_ban
  before update on public.account_status
  for each row execute function public.protect_account_ban();

-- الإدارة تدير حالة أي مستخدم (لتطبيق الحظر)
drop policy if exists "admin manages account status" on public.account_status;
create policy "admin manages account status"
  on public.account_status for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- إخفاء المحظور من الدليل (نفس الأعمدة — create or replace بلا لمس الدوال)
create or replace view public.teacher_directory as
select
  tp.user_id,
  tp.full_name,
  tp.photo_url,
  tp.school,
  tp.institute,
  tp.bio,
  tp.years_experience,
  tp.gender,
  tp.answered_count,
  coalesce(r.avg_rating, 0)    as avg_rating,
  coalesce(r.rating_count, 0)  as rating_count,
  tp.location_visible,
  tp.governorate_id,
  g.name      as governorate_name,
  g.latitude,
  g.longitude,
  coalesce(array_agg(distinct s.name)  filter (where s.name  is not null), '{}') as subjects,
  coalesce(array_agg(distinct st.name) filter (where st.name is not null), '{}') as stages
from public.teacher_profiles tp
join public.governorates g          on g.id = tp.governorate_id
left join public.teacher_subjects tsub on tsub.teacher_id = tp.user_id
left join public.subjects s          on s.id = tsub.subject_id
left join public.teacher_stages tst  on tst.teacher_id = tp.user_id
left join public.stages st           on st.id = tst.stage_id
left join (
  select teacher_id,
         round(avg(rating)::numeric, 1) as avg_rating,
         count(*)::int                  as rating_count
  from public.teacher_ratings
  group by teacher_id
) r on r.teacher_id = tp.user_id
where tp.verification_status = 'approved'
  and not public.is_account_deactivated(tp.user_id)
  and not public.is_banned(tp.user_id)
group by tp.user_id, g.id, r.avg_rating, r.rating_count;

-- منع المحظور من الإرسال/السؤال/التقييم (سياسات RESTRICTIVE تُضاف كشرط AND)
drop policy if exists "banned cannot send messages" on public.messages;
create policy "banned cannot send messages"
  on public.messages as restrictive for insert
  to authenticated
  with check (not public.is_banned(auth.uid()));

drop policy if exists "banned cannot ask" on public.questions;
create policy "banned cannot ask"
  on public.questions as restrictive for insert
  to authenticated
  with check (not public.is_banned(auth.uid()));

drop policy if exists "banned cannot rate" on public.teacher_ratings;
create policy "banned cannot rate"
  on public.teacher_ratings as restrictive for insert
  to authenticated
  with check (not public.is_banned(auth.uid()));
