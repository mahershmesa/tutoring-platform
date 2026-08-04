"use client";

import { useEffect, useState } from "react";
import {
  savePushSubscription,
  removePushSubscription,
  type PushSubJSON,
} from "@/lib/push/actions";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

// تحويل مفتاح VAPID العام (base64url) إلى ArrayBuffer المطلوب في subscribe.
function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return buffer;
}

type Support =
  | "checking"
  | "ok" // مدعوم
  | "unsupported" // متصفح لا يدعم Push
  | "ios-not-installed"; // آيفون بدون تثبيت PWA

export default function NotificationsCard() {
  const [support, setSupport] = useState<Support>("checking");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const hasSW = "serviceWorker" in navigator;
    const hasPush = "PushManager" in window;
    if (!hasSW || !hasPush) {
      // على iOS يظهر Push فقط بعد تثبيت التطبيق على الشاشة الرئيسية.
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        // @ts-expect-error خاص بـ Safari على iOS
        window.navigator.standalone === true;
      setSupport(isIOS && !standalone ? "ios-not-installed" : "unsupported");
      return;
    }
    setSupport("ok");
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEnabled(Boolean(sub)))
      .catch(() => {});
  }, []);

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      if (!VAPID_PUBLIC) {
        setMsg("مفتاح الإشعارات غير مضبوط على الخادم.");
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setMsg("لم تُمنح صلاحية الإشعارات.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(VAPID_PUBLIC),
      });
      const res = await savePushSubscription(sub.toJSON() as PushSubJSON);
      if (res.error) {
        setMsg(res.error);
        return;
      }
      setEnabled(true);
      setMsg("تم تفعيل الإشعارات ✓");
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
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
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
