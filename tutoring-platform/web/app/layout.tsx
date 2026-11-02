import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import PWARegister from "@/components/PWARegister";
import BottomNav from "@/components/BottomNav";
import SplashFader from "@/components/SplashFader";
import ReferralCapture from "@/components/ReferralCapture";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "دليلي — ربط الطلاب بالمدرّسين",
  description:
    "منصة تربط الطلاب بمدرّسين موثّقين حسب المحافظة والمادة والمرحلة الدراسية في العراق.",
  applicationName: "دليلي",
  appleWebApp: {
    capable: true,
    title: "دليلي",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  // يمنع تكبير/تصغير الشاشة بالأصابع أو تلقائياً عند فتح حقل كتابة (مشكلة
  // توسّع الشاشة التي قد يعلق فيها الطالب). الخريطة (Leaflet) تبقى تتكبّر
  // بأصابعها لأنها تدير التكبير داخلياً لا عبر زوم المتصفّح.
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1aa6a0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable} suppressHydrationWarning>
      <head>
        {/* no-flash: يضبط الوضع المحفوظ قبل أول رسم (الافتراضي فاتح) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('dalili-theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-surface font-sans text-ink antialiased">
        {/* شاشة البداية — مُقدَّمة من الخادم فتظهر فوراً (تمنع الشاشة السوداء) */}
        <div id="dalili-splash">
          <div className="splash-inner">
            <div className="splash-logo">
              {/* رمز أكاديمي (قبّعة تخرّج) */}
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.5 1 8.25l11 5.75 9-4.705V15.5h2V8.25L12 2.5Zm0 13.2-5.5-2.877v2.823L12 18.5l5.5-2.854v-2.823L12 15.7Z" />
              </svg>
            </div>
            <span className="brand">دليلي</span>
            <span className="splash-tag">مدرّسك الموثّق… أقرب إليك</span>
            <div className="splash-dots" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
        <SplashFader />
        <ReferralCapture />
        {children}
        <BottomNav />
        <PWARegister />
      </body>
    </html>
  );
}
