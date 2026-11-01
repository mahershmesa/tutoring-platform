"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

// يقرأ الوضع الحالي من <html data-theme> (ضبطه سكربت no-flash قبل الرسم).
function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

export default function ThemeToggle({
  className = "",
}: {
  className?: string;
}) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(currentTheme());
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("dalili-theme", next);
    } catch {
      /* وضع التصفّح الخاص قد يمنع الكتابة */
    }
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي"}
      title={isDark ? "الوضع النهاري" : "الوضع الليلي"}
      className={className}
    >
      {/* قبل التثبيت نعرض رمزاً محايداً لتفادي اختلاف الـ hydration */}
      <span className="text-xl leading-none" suppressHydrationWarning>
        {mounted ? (isDark ? "☀️" : "🌙") : "🌙"}
      </span>
      <span className="text-[11px]" suppressHydrationWarning>
        {mounted ? (isDark ? "نهاري" : "ليلي") : "ليلي"}
      </span>
    </button>
  );
}
