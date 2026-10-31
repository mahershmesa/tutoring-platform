/** @type {import('next').NextConfig} */

// نشتقّ مضيف تخزين Supabase من متغيّر البيئة (يعمل لأي مشروع).
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
  } catch {
    return undefined;
  }
})();

const nextConfig = {
  reactStrictMode: true,
  images: {
    // نسمح فقط بصور تخزين Supabase العامة (الإعلانات/الأخبار/الصور).
    // SVG يبقى محظوراً (الافتراضي) لتفادي ثغرات معالج الصور.
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
