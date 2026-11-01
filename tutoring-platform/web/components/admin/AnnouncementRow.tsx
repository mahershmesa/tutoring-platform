"use client";

import { useState, useTransition } from "react";
import { setAnnouncementActive, deleteAnnouncement } from "@/lib/admin/actions";

export type AnnItem = {
  id: string;
  audience: string;
  kind: string;
  title: string | null;
  body: string;
  active: boolean;
  created_at: string;
};

const audienceLabel: Record<string, string> = {
  students: "الطلاب",
  teachers: "الأساتذة",
  all: "الجميع",
  user: "شخصي",
};

export default function AnnouncementRow({ a }: { a: AnnItem }) {
  const [active, setActive] = useState(a.active);
  const [removed, setRemoved] = useState(false);
  const [pending, startTransition] = useTransition();

  if (removed) return null;

  return (
    <div
      className="space-y-1 rounded-xl border border-border bg-card p-3 text-sm"
      dir="rtl"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs">
          <span className="rounded-full bg-surface px-2 py-0.5 text-ink-soft">
            {audienceLabel[a.audience] ?? a.audience}
          </span>
          {a.kind === "tip" && (
            <span className="rounded-full bg-amber-light px-2 py-0.5 text-ink-soft">
              نصيحة
            </span>
          )}
          {!active && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700">
              معطّل
            </span>
          )}
        </span>
        <span className="text-[11px] text-ink-soft">
          {new Date(a.created_at).toLocaleDateString("ar")}
        </span>
      </div>
      {a.title && <p className="font-bold text-ink">{a.title}</p>}
      <p className="whitespace-pre-wrap text-ink">{a.body}</p>
      <div className="flex gap-2 pt-1">
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await setAnnouncementActive(a.id, !active);
              if (!res.error) setActive(!active);
            })
          }
          className="rounded-lg border border-border px-3 py-1 text-xs text-ink-soft hover:border-teal disabled:opacity-60"
        >
          {active ? "تعطيل" : "تفعيل"}
        </button>
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await deleteAnnouncement(a.id);
              if (!res.error) setRemoved(true);
            })
          }
          className="rounded-lg border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          حذف
        </button>
      </div>
    </div>
  );
}
