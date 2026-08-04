-- =============================================================
-- 20260802090023_push_webhook_trigger.sql
-- بديل عن "Database Webhook" من لوحة Supabase (التي تتطلّب schema
-- supabase_functions قد يكون مفقوداً). ننشئ التريغر مباشرةً ونستدعي
-- pg_net (net.http_post) لإرسال حمولة INSERT إلى مسار /api/push/send.
--
-- الإعدادات (URL + السرّ) تُخزَّن في public.app_config — بعيداً عن كود
-- الدالة وعن الريبو. تُقرأ فقط عبر الدالة (SECURITY DEFINER تتجاوز RLS).
-- =============================================================

create extension if not exists pg_net;

-- جدول إعدادات عامة (مفتاح/قيمة). لا سياسات RLS إطلاقاً:
-- anon/authenticated لا يقرؤونه؛ فقط الدوال SECURITY DEFINER أو service_role.
create table public.app_config (
  key   text primary key,
  value text not null
);
alter table public.app_config enable row level security;

-- يُطلق عند إدراج صف في notifications أو messages، ويطلب مسار الإرسال
-- بشكل غير متزامن (لا يعطّل الإدراج لو تعذّر الطلب).
create or replace function public.notify_push_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url    text;
  v_secret text;
begin
  select value into v_url from public.app_config where key = 'push_webhook_url';
  if v_url is null or v_url = '' then
    return new; -- الويبهوك غير مضبوط بعد: تجاهل بهدوء
  end if;
  select value into v_secret from public.app_config where key = 'push_webhook_secret';

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', tg_table_name,
      'record', to_jsonb(new)
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', coalesce(v_secret, '')
    )
  );
  return new;
end;
$$;

create trigger trg_push_notifications
  after insert on public.notifications
  for each row execute function public.notify_push_on_insert();

create trigger trg_push_messages
  after insert on public.messages
  for each row execute function public.notify_push_on_insert();
