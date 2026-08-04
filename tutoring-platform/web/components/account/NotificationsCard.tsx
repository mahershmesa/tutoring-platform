"use client";

import { useEffect, useState } from "react";
import {
  detectPushSupport,
  isPushEnabled,
  enablePush,
  disablePush,
  type PushSupport,
} from "@/lib/push/subscribe";

export default function NotificationsCard() {
  const [support, setSupport] = useState<PushSupport | "checking">("checking");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const s = detectPushSupport();
    setSupport(s);
    if (s === "ok") isPushEnabled().then(setEnabled);
  }, []);

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await enablePush();
      if (res.error) setMsg(res.error);
      else {
        setEnabled(true);
        setMsg("تم تفعيل الإشعارات ✓");
      }
    } catch {
      setMsg("تعذّر تفعيل الإشعارات. حاول مجدداً.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMsg(null);
    try {
      await disablePush();
      setEnabled(false);
      setMsg("تم إيقاف الإشعارات.");
    } catch {
      setMsg("تعذّر إيقاف الإشعارات.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-ink">الإشعارات الفورية</h2>
        {support === "ok" &&
          (enabled ? (
            <span className="text-xs font-medium text-teal-dark">مفعّلة ✓</span>
          ) : (
            <span className="text-xs font-medium text-amber">غير مفعّلة</span>
          ))}
      </div>
      <p className="mt-1 text-xs text-ink-soft">
        تصلك تنبيهات فورية عند وصول سؤال جديد مطابق لتخصصك أو رسالة جديدة.
      </p>

      {msg && (
        <p className="mt-2 rounded-lg bg-teal-light px-3 py-2 text-sm text-teal-dark">
          {msg}
        </p>
      )}

      {support === "checking" && (
        <p className="mt-3 text-sm text-ink-soft">…جارٍ التحقّق</p>
      )}

      {support === "ios-not-installed" && (
        <p className="mt-3 rounded-lg bg-amber-light px-3 py-2 text-sm text-ink">
          لتفعيل الإشعارات على الآيفون: افتح قائمة المشاركة ثم «أضف إلى الشاشة
          الرئيسية»، وشغّل التطبيق من الأيقونة، وبعدها فعّل الإشعارات من هنا.
        </p>
      )}

      {support === "unsupported" && (
        <p className="mt-3 rounded-lg bg-amber-light px-3 py-2 text-sm text-ink">
          متصفحك لا يدعم الإشعارات الفورية.
        </p>
      )}

      {support === "ok" &&
        (enabled ? (
          <button
            onClick={disable}
            disabled={busy}
            className="mt-3 rounded-xl border border-border px-4 py-2 text-sm text-ink-soft hover:border-teal disabled:opacity-60"
          >
            {busy ? "…جارٍ" : "إيقاف الإشعارات"}
          </button>
        ) : (
          <button
            onClick={enable}
            disabled={busy}
            className="mt-3 rounded-xl bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60"
          >
            {busy ? "…جارٍ" : "تفعيل الإشعارات"}
          </button>
        ))}
    </div>
  );
}
