"use client";

import { useState, useTransition } from "react";
import { sendAnnouncement } from "@/lib/admin/actions";

type Audience = "students" | "teachers" | "all";

export default function AnnouncementComposer({
  kind,
  label,
  hint,
  fixedAudience,
  allowAudienceChoice = false,
  accent = "teal",
}: {
  kind: "announcement" | "tip";
  label: string;
  hint: string;
  fixedAudience: Audience;
  allowAudienceChoice?: boolean;
  accent?: "teal" | "amber";
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>(fixedAudience);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    setError(null);
    setDone(false);
    if (!body.trim()) {
      setError("اكتب نص التبليغ.");
      return;
    }
    startTransition(async () => {
      const res = await sendAnnouncement(audience, kind, title, body);
      if (res.error) setError(res.error);
      else {
        setDone(true);
        setTitle("");
        setBody("");
        setTimeout(() => setDone(false), 3000);
      }
    });
  }

  const btn =
    accent === "amber"
      ? "bg-amber hover:brightness-105"
      : "bg-teal hover:bg-teal-dark";

  return (
    <div className="space-y-2 rounded-2xl border border-border bg-card p-4" dir="rtl">
      <h3 className="text-sm font-bold text-ink">{label}</h3>
      <p className="text-xs text-ink-soft">{hint}</p>

      {allowAudienceChoice && (
        <div className="flex gap-2 pt-1">
          {(
            [
              { k: "all", t: "الطلاب والأساتذة" },
              { k: "students", t: "الطلاب فقط" },
            ] as { k: Audience; t: string }[]
          ).map((o) => (
            <button
              key={o.k}
              type="button"
              onClick={() => setAudience(o.k)}
              className={
                "rounded-full border px-3 py-1 text-xs transition " +
                (audience === o.k
                  ? "border-teal bg-teal-light font-medium text-teal-dark"
                  : "border-border text-ink-soft hover:border-teal")
              }
            >
              {o.t}
            </button>
          ))}
        </div>
      )}

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, 80))}
        placeholder="عنوان (اختياري)"
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-teal"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 500))}
        placeholder="نص التبليغ…"
        rows={3}
        className="w-full rounded-lg border border-border bg-card p-2 text-sm outline-none focus:border-teal"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {done && <p className="text-xs text-teal-dark">تم الإرسال ✓</p>}
      <button
        onClick={send}
        disabled={pending}
        className={`w-full rounded-xl py-2 text-sm font-bold text-white disabled:opacity-60 ${btn}`}
      >
        {pending ? "جارٍ الإرسال…" : "إرسال"}
      </button>
    </div>
  );
}
