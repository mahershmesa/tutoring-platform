/**
 * قراءة متغيّرات البيئة العامة لتطبيق Expo.
 *
 * في Expo، أي متغيّر يبدأ بـ `EXPO_PUBLIC_` يُدمج داخل حزمة التطبيق
 * ويكون متاحاً في الكود عبر `process.env`. المفتاح المستخدم هنا هو
 * المفتاح العام القابل للنشر (Publishable / anon key) الذي يحترم
 * سياسات RLS في قاعدة البيانات — آمن للاستخدام في العميل.
 *
 * لا تضع هنا أبداً مفتاح الخدمة (service_role / secret key).
 */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "متغيّرات Supabase غير مضبوطة.\n" +
      "انسخ ملف .env.example إلى .env واملأ القيم من لوحة مشروع Supabase " +
      "(Project Settings → API): EXPO_PUBLIC_SUPABASE_URL و " +
      "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY، ثم أعد تشغيل الخادم عبر `npx expo start -c`.",
  );
}

export const env = {
  supabaseUrl,
  supabasePublishableKey,
} as const;
