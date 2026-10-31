import { createClient } from "@supabase/supabase-js";

/**
 * عميل عام (anon) بلا كوكيز — للقراءات العامة القابلة للتخزين المؤقت
 * (خريطة المدرّسين، المواد، الإعلانات، الأخبار). يحترم RLS كزائر، ولا يقرأ
 * الجلسة، فيمكن تغليفه بـ unstable_cache ومشاركته بين كل الزوّار.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
