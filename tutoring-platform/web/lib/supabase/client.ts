import { createBrowserClient } from "@supabase/ssr";

/**
 * عميل Supabase للمتصفح (Client Components).
 * يستخدم anon key العام — آمن للمتصفح، وكل الاستعلامات تحترم RLS.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "متغيّرات Supabase غير مضبوطة. انسخ .env.local.example إلى .env.local واملأ القيم.",
    );
  }

  return createBrowserClient(url, key);
}
