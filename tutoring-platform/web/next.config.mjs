/** @type {import('next').NextConfig} */

// نشتقّ مضيف تخزين Supabase من متغيّر البيئة (يعمل لأي مشروع).
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
  } catch {
    return undefined;
  }
})();

const supabaseHttps = supabaseHost ? `https://${supabaseHost}` : "";
const supabaseWss = supabaseHost ? `wss://${supabaseHost}` : "";

// سياسة أمان المحتوى (CSP): مصادر التطبيق المعروفة فقط.
// ملاحظة: script/style يسمحان بـ 'unsafe-inline' لأن Next.js يحقن سكربتات
// الترطيب (hydration) وأنماط Tailwind/Leaflet مضمّنة؛ تبقى بقية التوجيهات
// (frame-ancestors/object-src/connect-src/…) تقدّم تقوية حقيقية.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'", // منع التضمين (clickjacking)
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "worker-src 'self'",
  "manifest-src 'self'",
  `img-src 'self' data: blob: ${supabaseHttps} https://*.tile.openstreetmap.org`,
  `connect-src 'self' ${supabaseHttps} ${supabaseWss}`,
  "upgrade-insecure-requests",
]
  .map((d) => d.replace(/\s+/g, " ").trim())
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
