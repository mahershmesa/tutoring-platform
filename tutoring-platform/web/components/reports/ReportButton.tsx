"use client";

import { useState, useTransition } from "react";
import {
  fileReport,
  REPORT_REASONS,
  type ReportContext,
} from "@/lib/reports/actions";

type Props = {
  reportedId: string;
  reportedName?: string;
  contextType?: ReportContext;
  contextId?: string | null;
  /** عرض كزرّ نصّي صغير (داخل المحادثة) أو أيقونة صغيرة (على الخريطة). */
  variant?: "text" | "icon";
};

export default function ReportButton({
  reportedId,
  reportedName,
  contextType = "user",
  contextId = null,
  variant = "text",
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [detail, setDetail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const finalReason =
      reason === "سبب آخر" && detail.trim()
        ? `سبب آخر: ${detail.trim()}`
        : reason;
    startTransition(async () => {
      const res = await fileReport(reportedId, finalReason, contextType, contextId);
      if (res.error) setError(res.error);
      else setDone(true);
    });
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="إبلاغ"
          title="إبلاغ"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-ink-soft hover:border-red-400 hover:text-red-600"
        >
          🚩
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-ink-soft underline-offset-2 hover:text-red-600 hover:underline"
        >
          🚩 إبلاغ
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl"
          >
            {done ? (
              <div className="space-y-3 text-center">
                <p className="text-2xl">✅</p>
                <p className="text-sm font-medium text-ink">
                  تم استلام بلاغك وسيُراجعه فريق الإشراف.
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="w-full rounded-xl bg-teal py-2 text-sm font-bold text-white hover:bg-teal-dark"
                >
                  تمام
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-ink">
                  إبلاغ عن {reportedName || "هذا الحساب"}
                </h3>
                <p className="text-xs text-ink-soft">
                  اختر سبب البلاغ. تبقى هويتك مخفية عن الطرف الآخر.
                </p>

                <div className="space-y-1.5">
                  {REPORT_REASONS.map((r) => (
                    <label
                      key={r}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-ink hover:border-teal"
                    >
                      <input
                        type="radio"
                        name="report-reason"
                        value={r}
                        checked={reason === r}
                        onChange={() => setReason(r)}
                        className="accent-teal"
                      />
                      {r}
                    </label>
                  ))}
                </div>

                {reason === "سبب آخر" && (
                  <textarea
                    value={detail}
                    onChange={(e) => setDetail(e.target.value.slice(0, 300))}
                    placeholder="وضّح باختصار (اختياري)"
                    rows={2}
                    className="w-full rounded-lg border border-border p-2 text-sm"
                  />
                )}

                {error && <p className="text-xs text-red-600">{error}</p>}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={submit}
                    disabled={pending}
                    className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {pending ? "جارٍ الإرسال…" : "إرسال البلاغ"}
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    disabled={pending}
                    className="rounded-xl border border-border px-4 py-2 text-sm text-ink-soft"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
