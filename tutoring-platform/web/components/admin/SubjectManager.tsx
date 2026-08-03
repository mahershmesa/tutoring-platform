"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addSubject, setSubjectActive } from "@/lib/admin/actions";

export type AdminSubject = { id: string; name: string; active: boolean };

export default function SubjectManager({
  subjects,
}: {
  subjects: AdminSubject[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await addSubject(name);
    setBusy(false);
    if (res.error) setErr(res.error);
    else {
      setName("");
      router.refresh();
    }
  }

  async function toggle(id: string, active: boolean) {
    const res = await setSubjectActive(id, active);
    if (res.error) setErr(res.error);
    else router.refresh();
  }

  return (
    <section className="space-y-4">
      <form onSubmit={onAdd} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثلاً: جغرافيا"
          className="flex-1 rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-teal"
        />
        <button
          type="submit"
          disabled={busy}
          className="whitespace-nowrap rounded-xl bg-teal px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-dark disabled:opacity-60"
        >
          {busy ? "…جارٍ" : "إضافة"}
        </button>
      </form>

      {err && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </p>
      )}

      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
        {subjects.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            <span
              className={s.active ? "text-ink" : "text-ink-soft line-through"}
            >
              {s.name}
            </span>
            <button
              onClick={() => toggle(s.id, !s.active)}
              className={
                "rounded-lg px-3 py-1 text-xs font-medium transition " +
                (s.active
                  ? "border border-border text-ink-soft hover:border-red-300 hover:text-red-700"
                  : "bg-teal-light text-teal-dark hover:bg-teal hover:text-white")
              }
            >
              {s.active ? "تعطيل" : "تفعيل"}
            </button>
          </li>
        ))}
        {subjects.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-ink-soft">
            لا توجد مواد بعد.
          </li>
        )}
      </ul>
    </section>
  );
}
