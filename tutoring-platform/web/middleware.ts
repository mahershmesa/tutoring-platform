import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * يحدّث جلسة Supabase (تدوير التوكن) على كل طلب تنقّل.
 * إذا لم تُضبط متغيّرات البيئة، يمرّر الطلب كما هو.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let response = NextResponse.next({ request });

  if (!url || !key) {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // لمس getUser() يجدّد الجلسة عند الحاجة.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // كل المسارات ما عدا الملفات الثابتة والصور وأصول الـ PWA
    // (manifest و service worker والأيقونات يجب أن تُخدَّم بلا معالجة مصادقة)
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
