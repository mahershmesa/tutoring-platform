"use client";

import { useEffect, useState } from "react";

export type BannerItem = {
  id: string;
  kind: string;
  title: string | null;
  body: string;
};

const KEY = "dalili-dismissed-ann";

function readDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export default function AnnouncementsBanner({ items }: { items: BannerItem[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDismissed(readDismissed());
    setReady(true);
  }, []);

  function dismiss(id: string) {
    const next = Array.from(new Set([...dismissed, id]));
    setDismissed(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* وضع خاص قد يمنع */
    }
  }

  // قبل قراءة localStorage لا نعرض شيئاً (نتجنّب وميضاً ثم إخفاء)
  if (!ready) return null;

  const visible = items.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-2" dir="rtl">
      {visible.map((a) => {
        const tip = a.kind === "tip";
        return (
          <div
            key={a.id}
            className={
              "relative rounded-2xl border p-4 pe-10 " +
              (tip
                ? "border-amber/40 bg-amber-light"
                : "border-teal/30 bg-teal-light")
            }
          >
            <p className="text-sm font-bold text-ink">
              {tip ? "💡 نصيحة اليوم" : "📣 " + (a.title || "تبليغ")}
            </p>
            {tip && a.title && (
              <p className="text-sm font-bold text-ink">{a.title}</p>
            )}
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{a.body}</p>
            <button
              onClick={() => dismiss(a.id)}
              aria-label="إخفاء"
              className="absolute left-2 top-2 rounded-lg px-2 py-0.5 text-ink-soft hover:text-ink"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
