import { createClient } from "@supabase/supabase-js";

/**
 * عميل Supabase بصلاحية الخدمة (service_role) — يتجاوز RLS.
 * ⚠️ للخادم فقط. يعتمد على SUPABASE_SERVICE_ROLE_KEY (بدون NEXT_PUBLIC).
 * لا يُستورد أبداً في مكوّنات العميل. يُستخدم في استرجاع كلمة المرور وإرسال الإشعارات.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
