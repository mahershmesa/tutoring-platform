"use client";

import { useState, useTransition } from "react";
import {
  setReportStatus,
  banUser,
  unbanUser,
} from "@/lib/admin/actions";

export type ReportItem = {
  id: string;
  reported_id: string;
  reporter_name: string;
  reported_name: string;
  reason: string;
  context_type: string | null;
  created_at: string;
  reported_banned: boolean;
};

export default function ReportRow({ r }: { r: ReportItem }) {
  const [hidden, setHidden] = useState(false);
  const [banned, setBanned] = useState(r.reported_banned);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function act(fn: () => Promise<{ error?: string; ok?: boolean }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else after?.();
    });
  }

  if (hidden) return null;

  return (
    <div className="space-y-2 rounded-2xl border border-border bg-white p-4" dir="rtl">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">
            ضدّ: {r.reported_name}{" "}
            {banned && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                محظور
              </span>
            )}
          </p>
          <p className="text-xs text-ink-soft">
            المُبلِّغ: {r.reporter_name} ·{" "}
            {new Date(r.created_at).toLocaleDateString("ar")}
          </p>
        </div>
      </div>

      <p className="rounded-lg bg-surface px-3 py-2 text-sm text-ink">
        {r.reason}
      </p>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2 pt-1">
        {banned ? (
          <button
            disabled={pending}
            onClick={() => act(() => unbanUser(r.reported_id), () => setBanned(false))}
            className="rounded-xl border border-border px-3 py-1.5 text-sm text-ink-soft hover:border-teal disabled:opacity-60"
          >
            رفع الحظر
          </button>
        ) : (
          <button
            disabled={pending}
            onClick={() => act(() => banUser(r.reported_id), () => setBanned(true))}
            className="rounded-xl bg-red-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
          >
            🚫 حظر الحساب
          </button>
        )}
        <button
          disabled={pending}
          onClick={() => act(() => setReportStatus(r.id, "reviewed"), () => setHidden(true))}
          className="rounded-xl border border-border px-3 py-1.5 text-sm text-ink-soft hover:border-teal disabled:opacity-60"
        >
          ✓ تمّت المراجعة
        </button>
        <button
          disabled={pending}
          onClick={() => act(() => setReportStatus(r.id, "dismissed"), () => setHidden(true))}
          className="rounded-xl border border-border px-3 py-1.5 text-sm text-ink-soft hover:border-teal disabled:opacity-60"
        >
          تجاهل
        </button>
      </div>
    </div>
  );
}
