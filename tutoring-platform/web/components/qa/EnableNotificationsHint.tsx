"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  detectPushSupport,
  isPushEnabled,
  enablePush,
} from "@/lib/push/subscribe";

const DISMISS_KEY = "dalili_push_hint_dismissed";

// تذكير لطيف (قابل للإخفاء) للطالب ليفعّل الإشعارات، حتى يصله رد المدرّس فوراً.
export default function EnableNotificationsHint() {
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    const s = detectPushSupport();
    if (s === "ios-not-installed") {
      setIosHint(true);
      setShow(true);
      return;
    }
    if (s !== "ok") return;
    isPushEnabled().then((on) => {
      if (!on) setShow(true);
    });
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  async function enable() {
    setBusy(true);
    setErr(null);
    try {
      const res = await enablePush();
      if (res.error) setErr(res.error);
      else dismiss();
    } catch {
      setErr("تعذّر التفعيل. جرّب من صفحة البروفايل.");
    } finally {
      setBusy(false);
    }
  }

  if (!show) return null;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-teal/30 bg-teal-light/60 p-3">
      <span className="text-lg" aria-hidden>
        🔔
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">
          فعّل الإشعارات ليصلك رد المدرّس فوراً
        </p>
        {iosHint ? (
          <p className="mt-1 text-xs text-ink-soft">
            على الآيفون: افتح قائمة المشاركة ثم «أضف إلى الشاشة الرئيسية»، وشغّل
            التطبيق من الأيقونة، ثم فعّل الإشعارات من{" "}
            <Link href="/profile" className="text-teal-dark underline">
              البروفايل
            </Link>
            .
          </p>
        ) : (
          <p className="mt-1 text-xs text-ink-soft">
            بدون تفعيل، لن يصلك تنبيه عند رد المدرّس إلا عند فتح الموقع.
          </p>
        )}
        {err && <p className="mt-1 text-xs text-red-700">{err}</p>}
        <div className="mt-2 flex gap-2">
          {!iosHint && (
            <button
              onClick={enable}
              disabled={busy}
              className="rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-dark disabled:opacity-60"
            >
              {busy ? "…جارٍ" : "تفعيل الإشعارات"}
            </button>
          )}
          <button
            onClick={dismiss}
            className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs text-ink-soft hover:border-teal"
          >
            لاحقاً
          </button>
        </div>
      </div>
    </div>
  );
}
