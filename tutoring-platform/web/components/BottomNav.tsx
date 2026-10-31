"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// مسارات نُخفي فيها الشريط (الدخول/التسجيل/الاسترجاع + لوحة الإدارة لها تنقّلها).
const HIDDEN = ["/login", "/register", "/reset", "/admin"];

type Item = { href: string; label: string; icon: React.ReactNode; match: (p: string) => boolean };

const iconCls = "h-6 w-6";

const items: Item[] = [
  {
    href: "/ask",
    label: "الأقسام",
    match: (p) => p.startsWith("/ask"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={iconCls} stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/#news-section",
    label: "الأخبار",
    match: () => false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={iconCls} stroke="currentColor" strokeWidth="1.8">
        <path d="M4 5h13v14H5a1 1 0 0 1-1-1V5Z" strokeLinejoin="round" />
        <path d="M17 8h3v9a2 2 0 0 1-2 2M7 8h7M7 12h7M7 16h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "الملف الشخصي",
    match: (p) => p.startsWith("/profile"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className={iconCls} stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname() || "/";
  if (HIDDEN.some((h) => pathname === h || pathname.startsWith(h + "/"))) return null;

  return (
    <>
      {/* فاصل بنفس ارتفاع الشريط حتى لا يختفي المحتوى خلفه */}
      <div aria-hidden className="h-16" />
      <nav
        className="fixed inset-x-0 bottom-0 z-[900] border-t border-border bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-3xl">
          {items.map((it) => {
            const active = it.match(pathname);
            return (
              <Link
                key={it.label}
                href={it.href}
                className={
                  "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition " +
                  (active ? "text-teal-dark" : "text-ink-soft hover:text-teal-dark")
                }
              >
                {it.icon}
                <span>{it.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
