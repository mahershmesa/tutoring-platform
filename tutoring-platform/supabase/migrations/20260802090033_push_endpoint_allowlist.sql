-- =============================================================
-- 20260802090033_push_endpoint_allowlist.sql — إغلاق ثغرة SSRF
-- قائمة السماح لنقاط الدفع كانت مفروضة في كود التطبيق فقط، لكن RLS يسمح
-- للمستخدم بإدراج صفّ مباشرةً عبر REST بـ endpoint ملفّق. نفرض القائمة هنا
-- (تريغر BEFORE INSERT/UPDATE) فتُرفض أي نقطة خارج خدمات الدفع المعروفة
-- مهما كان مسار الإدراج.
-- =============================================================

create or replace function public.is_allowed_push_endpoint(ep text)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  host text;
begin
  if ep is null then
    return false;
  end if;
  -- يجب أن يكون https، ونستخرج المضيف (قبل أول '/').
  if ep !~* '^https://' then
    return false;
  end if;
  host := lower(substring(ep from '^https://([^/]+)'));
  if host is null or host = '' then
    return false;
  end if;
  -- خدمات الدفع المعروفة فقط (مطابقة لمنطق التطبيق).
  return
       host = 'fcm.googleapis.com'
    or host = 'web.push.apple.com'
    or host like '%.push.apple.com'
    or host like '%.push.services.mozilla.com'
    or host like '%.notify.windows.com';
end;
$$;

create or replace function public.guard_push_endpoint()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_allowed_push_endpoint(new.endpoint) then
    raise exception 'نقطة دفع غير مسموحة.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_push_endpoint on public.push_subscriptions;
create trigger trg_guard_push_endpoint
  before insert or update on public.push_subscriptions
  for each row execute function public.guard_push_endpoint();
