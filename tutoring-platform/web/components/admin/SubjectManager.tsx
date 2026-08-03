"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addSubjects, setSubjectActive } from "@/lib/admin/actions";

export type AdminSubject = { id: string; name: string; active: boolean };

export default function SubjectManager({
  subjects,
}: {
  subjects: AdminSubject[];
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    // فصل بسطر أو فاصلة
    const names = text.split(/[\n,]+/);
    const res = await addSubjects(names);
    setBusy(false);
    if (res.error) setMsg({ text: res.error });
    else {
      setText("");
      setMsg({
        ok: true,
        text: `أُضيفت ${res.added ?? 0} مادة${
          (res.skipped ?? 0) > 0 ? ` (وتُجوهلت ${res.skipped} موجودة مسبقاً)` : ""
        }.`,
      });
      router.refresh();
    }
  }

  async function toggle(id: string, active: boolean) {
    const res = await setSubjectActive(id, active);
    if (res.error) setMsg({ text: res.error });
    else router.refresh();
  }

  return (
    <section className="space-y-4">
      <form onSubmit={onAdd} className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder={"أضف عدة مواد دفعة وحدة — كل مادة بسطر أو مفصولة بفاصلة\nمثلاً:\nجغرافيا\nتاريخ, حاسوب"}
          className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-teal"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-teal px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-dark disabled:opacity-60"
        >
          {busy ? "…جارٍ" : "إضافة المواد"}
        </button>
      </form>

      {msg && (
        <p
          className={
            "rounded-lg px-3 py-2 text-sm " +
            (msg.ok ? "bg-teal-light text-teal-dark" : "bg-red-50 text-red-700")
          }
        >
          {msg.text}
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
