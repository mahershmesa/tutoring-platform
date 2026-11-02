"use client";

import { useState, useTransition } from "react";
import { setTeacherFeatured } from "@/lib/admin/actions";

export type FeaturedItem = {
  user_id: string;
  full_name: string;
  photo_url: string | null;
  governorate_name: string | null;
  featured_until: string | null;
};

function isActive(until: string | null): boolean {
  return !!until && new Date(until).getTime() > Date.now();
}

export default function FeaturedRow({ t }: { t: FeaturedItem }) {
  const [until, setUntil] = useState<string | null>(t.featured_until);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function apply(days: number) {
    setError(null);
    startTransition(async () => {
      const res = await setTeacherFeatured(t.user_id, days);
      if (res.error) setError(res.error);
      else
        setUntil(
          days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null,
        );
    });
  }

  const active = isActive(until);

  return (
    <div
      className={
        "space-y-2 rounded-2xl border bg-card p-3 " +
        (active ? "border-amber ring-1 ring-amber/40" : "border-border")
      }
      dir="rtl"
    >
      <div className="flex items-center gap-3">
        {t.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={t.photo_url}
            alt={t.full_name}
            className="h-11 w-11 rounded-full border border-border object-cover"
          />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal text-sm font-bold text-white">
            {t.full_name?.trim().charAt(0) || "؟"}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-bold text-ink">
            {t.full_name}
            {active && (
              <span className="rounded-full bg-amber-light px-1.5 py-0.5 text-[10px] font-bold text-amber">
                👑 مميّز
              </span>
            )}
          </p>
          <p className="truncate text-xs text-ink-soft">
            {t.governorate_name ?? "—"}
            {active && until && (
              <span className="text-amber">
                {" "}
                · حتى {new Date(until).toLocaleDateString("ar")}
              </span>
            )}
          </p>
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          disabled={pending}
          onClick={() => apply(30)}
          className="rounded-lg bg-amber px-3 py-1.5 text-xs font-bold text-white hover:brightness-105 disabled:opacity-60"
        >
          تمييز ٣٠ يوم
        </button>
        <button
          disabled={pending}
          onClick={() => apply(90)}
          className="rounded-lg border border-amber px-3 py-1.5 text-xs font-bold text-amber hover:bg-amber-light disabled:opacity-60"
        >
          ٩٠ يوم
        </button>
        {active && (
          <button
            disabled={pending}
            onClick={() => apply(0)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-ink-soft hover:border-teal disabled:opacity-60"
          >
            إلغاء التمييز
          </button>
        )}
      </div>
    </div>
  );
}
