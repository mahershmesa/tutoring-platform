"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markAllRead } from "@/lib/qa/actions";

export default function MarkAllReadButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await markAllRead();
        setBusy(false);
        window.dispatchEvent(new Event("dalili:notif-refresh"));
        router.refresh();
      }}
      className="rounded-lg border border-teal/40 bg-card px-3 py-1.5 text-xs font-medium text-teal-dark hover:border-teal disabled:opacity-60"
    >
      {busy ? "…" : "تعليم الكل كمقروء"}
    </button>
  );
}
