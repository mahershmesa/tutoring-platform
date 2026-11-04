"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type PSubject = { id: string; name: string };
export type PPaper = {
  id: string;
  title: string;
  year: number | null;
  subjectId: string;
  stageName: string | null;
  url: string;
};

export default function PapersBrowser({
  subjects,
  papers,
}: {
  subjects: PSubject[];
  papers: PPaper[];
}) {
  const [subjectId, setSubjectId] = useState<string | null>(null);

  // عدد الملفات لكل مادة (لإظهار المواد التي فيها محتوى أولاً)
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    papers.forEach((p) => m.set(p.subjectId, (m.get(p.subjectId) ?? 0) + 1));
    return m;
  }, [papers]);

  if (subjectId) {
    const subject = subjects.find((s) => s.id === subjectId);
    const list = papers.filter((p) => p.subjectId === subjectId);
    return (
      <div className="space-y-4">
        <button onClick={() => setSubjectId(null)} className="text-sm text-teal-dark hover:underline">
          ← كل المواد
        </button>
        <h2 className="text-base font-bold text-ink">{subject?.name}</h2>
        {list.length === 0 ? (
          <p className="text-sm text-ink-soft">لا توجد وزاريات لهذه المادة بعد.</p>
        ) : (
          <div className="space-y-2">
            {list.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{p.title}</p>
                  <p className="text-xs text-ink-soft">
                    {p.stageName ?? "كل المراحل"}
                    {p.year ? ` · ${p.year}` : ""}
                  </p>
                </div>
                <a href={p.url} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-dark">
                  فتح / تنزيل
                </a>
              </div>
            ))}
          </div>
        )}
        <Link
          href={`/ask?subject=${subjectId}`}
          className="flex items-center justify-center gap-2 rounded-2xl border border-teal/30 bg-teal-light px-5 py-3 text-sm font-bold text-teal-dark transition hover:border-teal"
        >
          🙋 ما فهمت؟ اطلب شرح من مدرّس بهذه المادة
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">اختر المادة لعرض وزارياتها ونماذجها.</p>
      <div className="grid grid-cols-2 gap-2">
        {subjects.map((s) => {
          const n = counts.get(s.id) ?? 0;
          return (
            <button
              key={s.id}
              onClick={() => setSubjectId(s.id)}
              className="flex flex-col items-start gap-1 rounded-2xl border border-border bg-card px-4 py-3 text-right transition hover:border-teal"
            >
              <span className="text-sm font-medium text-ink">{s.name}</span>
              <span className="text-xs text-ink-soft">
                {n > 0 ? `${n} ملف` : "لا يوجد بعد"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
