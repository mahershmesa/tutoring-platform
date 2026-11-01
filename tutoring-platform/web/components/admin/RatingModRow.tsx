"use client";

import { useState, useTransition } from "react";
import { adminUpdateRating, adminDeleteRating } from "@/lib/admin/actions";

export type RatingItem = {
  student_id: string;
  teacher_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export default function RatingModRow({ r }: { r: RatingItem }) {
  const [removed, setRemoved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [stars, setStars] = useState(r.rating);
  const [comment, setComment] = useState(r.comment ?? "");
  const [cur, setCur] = useState({ rating: r.rating, comment: r.comment });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await adminUpdateRating(r.student_id, r.teacher_id, stars, comment);
      if (res.error) setError(res.error);
      else {
        setCur({ rating: stars, comment: comment.trim() || null });
        setEditing(false);
      }
    });
  }

  function del() {
    setError(null);
    startTransition(async () => {
      const res = await adminDeleteRating(r.student_id, r.teacher_id);
      if (res.error) setError(res.error);
      else setRemoved(true);
    });
  }

  if (removed) return null;

  return (
    <li className="rounded-xl border border-border bg-card p-3" dir="rtl">
      {editing ? (
        <div className="space-y-2">
          <div className="flex items-center gap-1" dir="ltr">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setStars(n)}
                aria-label={`${n} نجوم`}
                className="text-xl leading-none"
              >
                <span className={n <= stars ? "text-amber" : "text-border"}>★</span>
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 300))}
            rows={2}
            placeholder="التعليق…"
            className="w-full rounded-lg border border-border bg-card p-2 text-sm"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={pending}
              className="rounded-lg bg-teal px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-dark disabled:opacity-60"
            >
              {pending ? "…" : "حفظ"}
            </button>
            <button
              onClick={() => {
                setStars(cur.rating);
                setComment(cur.comment ?? "");
                setEditing(false);
              }}
              disabled={pending}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-ink-soft"
            >
              إلغاء
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span dir="ltr" className="inline-flex">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={n <= cur.rating ? "text-amber" : "text-border"}>
                  ★
                </span>
              ))}
            </span>
            <span className="text-[11px] text-ink-soft">
              {new Date(r.created_at).toLocaleDateString("ar")}
            </span>
          </div>
          {cur.comment && <p className="mt-1 text-sm text-ink">{cur.comment}</p>}
          <p className="mt-1 text-[11px] text-ink-soft">
            طالب {r.student_id.slice(0, 6)}
          </p>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => setEditing(true)}
              disabled={pending}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-ink-soft hover:border-teal disabled:opacity-60"
            >
              ✎ تعديل
            </button>
            <button
              onClick={del}
              disabled={pending}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              🗑 حذف
            </button>
          </div>
        </>
      )}
    </li>
  );
}
