import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import PWARegister from "@/components/PWARegister";
import BottomNav from "@/components/BottomNav";
import SplashFader from "@/components/SplashFader";

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
  themeColor: "#1aa6a0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="min-h-screen bg-surface font-sans text-ink antialiased">
        {/* شاشة البداية — مُقدَّمة من الخادم فتظهر فوراً (تمنع الشاشة السوداء) */}
        <div id="dalili-splash">
          <span className="brand">دليلي</span>
        </div>
        <SplashFader />
        {children}
        <BottomNav />
        <PWARegister />
      </body>
    </html>
  );
}
