import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * عميل Supabase للخادم (Server Components / Route Handlers).
 * يقرأ الجلسة من الـ cookies، ويستخدم anon key — فكل الاستعلامات تحترم RLS.
 *
 * يرجع null إذا لم تُضبط متغيّرات البيئة، حتى لا ينهار البناء أو الصفحة
 * قبل ربط مشروع Supabase حقيقي.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  // Next 15: cookies() صارت async — نستدعيها بتكاسل داخل المعالجات
  // (async) حتى تبقى createClient متزامنة ولا نغيّر مواضع الاستدعاء.
  return createServerClient(url, key, {
    cookies: {
      async getAll() {
        return (await cookies()).getAll();
      },
      async setAll(cookiesToSet: CookieToSet[]) {
        try {
          const store = await cookies();
          cookiesToSet.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        } catch {
          // يُستدعى set من Server Component — يتكفّل middleware بتحديث الجلسة.
        }
      },
    },
    // بيانات المنصة تتغيّر باستمرار (توثيق، ظهور، مواد) — نمنع أي تخزين مؤقت
    // على مستوى Next Data Cache حتى تكون كل قراءة حيّة من القاعدة.
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
