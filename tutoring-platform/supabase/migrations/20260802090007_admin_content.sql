-- =============================================================
-- 20260802090007_admin_content.sql
-- محتوى تديره الإدارة: لوحة الإعلانات + قسم الأخبار
-- =============================================================

-- -------------------------------------------------------------
-- الإعلانات — صور متبدلة تلقائياً حسب sort_order، مع تفعيل/تعطيل
-- -------------------------------------------------------------
create table public.ads (
  id         uuid primary key default gen_random_uuid(),
  image_url  text not null,
  caption    text,
  sort_order integer not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.ads is 'لوحة الإعلانات (سلايدر). تُدار من الإدارة فقط.';
create index idx_ads_active_order on public.ads (active, sort_order);

-- -------------------------------------------------------------
-- الأخبار — صورة + تعليق
-- -------------------------------------------------------------
create table public.news (
  id         uuid primary key default gen_random_uuid(),
  image_url  text,
  caption    text not null,
  created_at timestamptz not null default now()
);

comment on table public.news is 'قسم الأخبار (صورة + تعليق). يُدار من الإدارة فقط.';
create index idx_news_created on public.news (created_at desc);

-- =============================================================
-- RLS
-- =============================================================

-- ---------- ads ----------
alter table public.ads enable row level security;

-- العامة يشوفون الإعلانات المفعّلة فقط.
create policy "active ads readable by everyone"
  on public.ads for select
  to anon, authenticated
  using (active = true);

-- الإدارة تشوف الكل (مفعّل وغير مفعّل).
create policy "admin reads all ads"
  on public.ads for select
  to authenticated
  using (public.is_admin());

create policy "only admin writes ads"
  on public.ads for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- news ----------
alter table public.news enable row level security;

create policy "news readable by everyone"
  on public.news for select
  to anon, authenticated
  using (true);

create policy "only admin writes news"
  on public.news for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
