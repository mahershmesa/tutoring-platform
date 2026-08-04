-- =============================================================
-- 20260802090022_push_subscriptions.sql
-- اشتراكات Web Push لكل متصفح/جهاز. المستخدم قد يملك أكثر من اشتراك
-- (عدّة أجهزة)، فالمفتاح هو endpoint الفريد عالمياً.
-- المُرسِل (Vercel API route) يقرأ الاشتراكات عبر service role (يتجاوز RLS).
-- =============================================================

create table public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

create index idx_push_subscriptions_user on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- المالك يدير اشتراكاته فقط (إضافة/قراءة/حذف). لا وصول لاشتراكات غيره.
create policy "owner manages own push subscriptions"
  on public.push_subscriptions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
