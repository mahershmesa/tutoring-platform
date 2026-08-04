"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setDeactivated } from "@/lib/account/actions";

export default function DeactivateCard({
  deactivated,
}: {
  deactivated: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function apply(value: boolean) {
    setBusy(true);
    const res = await setDeactivated(value);
    setBusy(false);
    if (!res.error) {
      setConfirming(false);
      router.refresh();
    }
  }

  if (deactivated) {
    return (
      <div className="rounded-2xl border border-amber bg-amber-light p-5 shadow-sm">
        <h2 className="font-bold text-ink">حسابك معطّل</h2>
        <p className="mt-1 text-sm text-ink-soft">
          حسابك مخفيّ حالياً (المدرّس لا يظهر على الخريطة). يمكنك إعادة تفعيله في
          أي وقت.
        </p>
        <button
          onClick={() => apply(false)}
          disabled={busy}
          className="mt-3 rounded-xl bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60"
        >
          {busy ? "…جارٍ" : "إعادة تفعيل الحساب"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <h2 className="font-bold text-ink">تعطيل الحساب</h2>
      <p className="mt-1 text-sm text-ink-soft">
        عند التعطيل يختفي حسابك من المنصة (المدرّس لا يظهر على الخريطة). لا يُحذف
        شيء، وتقدر تعيد التفعيل لاحقاً.
      </p>
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="mt-3 rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          تعطيل حسابي
        </button>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => apply(true)}
            disabled={busy}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {busy ? "…جارٍ" : "تأكيد التعطيل"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="rounded-xl border border-border px-4 py-2 text-sm text-ink-soft hover:border-teal"
          >
            إلغاء
          </button>
        </div>
      )}
    </div>
  );
}
