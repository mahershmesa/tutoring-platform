"use client";

import {
  savePushSubscription,
  removePushSubscription,
  type PushSubJSON,
} from "@/lib/push/actions";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type PushSupport =
  | "ok" // مدعوم
  | "unsupported" // متصفح لا يدعم Push
  | "ios-not-installed"; // آيفون بدون تثبيت PWA

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

export function detectPushSupport(): PushSupport {
  const hasSW = "serviceWorker" in navigator;
  const hasPush = "PushManager" in window;
  if (hasSW && hasPush) return "ok";
  // على iOS يظهر Push فقط بعد تثبيت التطبيق على الشاشة الرئيسية.
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error خاص بـ Safari على iOS
    window.navigator.standalone === true;
  return isIOS && !standalone ? "ios-not-installed" : "unsupported";
}

// هل هذا المتصفح مشترك فعلاً في الدفع؟
export async function isPushEnabled(): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return Boolean(sub);
  } catch {
    return false;
  }
}

// يطلب الإذن، يشترك، ويحفظ الاشتراك للمستخدم الحالي.
export async function enablePush(): Promise<{ ok?: boolean; error?: string }> {
  if (!VAPID_PUBLIC) return { error: "مفتاح الإشعارات غير مضبوط على الخادم." };
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { error: "لم تُمنح صلاحية الإشعارات." };
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToBuffer(VAPID_PUBLIC),
  });
  const res = await savePushSubscription(sub.toJSON() as PushSubJSON);
  if (res.error) return { error: res.error };
  return { ok: true };
}

// يلغي اشتراك هذا المتصفح ويحذفه من الخادم.
export async function disablePush(): Promise<{ ok?: boolean; error?: string }> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await removePushSubscription(sub.endpoint);
    await sub.unsubscribe();
  }
  return { ok: true };
}
