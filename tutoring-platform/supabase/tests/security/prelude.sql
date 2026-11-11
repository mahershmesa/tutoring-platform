\set ON_ERROR_STOP on
-- ===== محاكاة بيئة Supabase =====
do $$ begin
  if not exists (select 1 from pg_roles where rolname='postgres') then create role postgres login createrole bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
alter role postgres bypassrls;
grant anon, authenticated, service_role to postgres;
alter schema public owner to postgres;
grant usage on schema public to anon, authenticated, service_role;
-- الصلاحيات الافتراضية كما في Supabase: كل ما ينشئه postgres في public يُمنح للأدوار الثلاثة
alter default privileges for role postgres in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;

create schema extensions; grant usage on schema extensions to public;
create extension pgcrypto schema extensions;

create schema auth; grant usage on schema auth to public;
create table auth.users (id uuid primary key default gen_random_uuid(), email text unique,
  raw_user_meta_data jsonb default '{}', created_at timestamptz default now());
grant all on auth.users to postgres;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(current_setting('request.jwt.claim.sub', true),
    (nullif(current_setting('request.jwt.claims', true),'')::jsonb ->> 'sub')), '')::uuid $$;

create schema storage; grant usage on schema storage to public;
create table storage.buckets (id text primary key, name text, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
alter table storage.buckets owner to postgres; alter table storage.objects owner to postgres;
grant all on storage.objects, storage.buckets to anon, authenticated, service_role;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name,'/'))[1:greatest(array_length(string_to_array(name,'/'),1)-1,0)] $$;

create schema net; grant usage on schema net to public;
create table net.calls (id bigserial primary key, url text, body jsonb, headers jsonb);
grant all on net.calls, net.calls_id_seq to public;
create function net.http_post(url text, body jsonb, headers jsonb) returns bigint language sql as $$
  insert into net.calls(url,body,headers) values (url,body,headers) returning id $$;
