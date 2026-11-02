"use client";

import { useEffect } from "react";

export const REF_STORAGE_KEY = "dalili-ref";

/**
 * يلتقط رمز الدعوة من الرابط (?ref=CODE) ويحفظه محلياً،
 * ليُسجَّل لاحقاً عند إتمام التسجيل (في RegisterWizard).
 * خفيف: يقرأ window.location مرّة واحدة عند التحميل (بلا Suspense).
 */
export default function ReferralCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = (params.get("ref") ?? "").trim();
      if (ref && /^[A-Za-z0-9]{4,16}$/.test(ref)) {
        localStorage.setItem(REF_STORAGE_KEY, ref.toUpperCase());
      }
    } catch {
      /* الوضع الخاص قد يمنع التخزين */
    }
  }, []);
  return null;
}
