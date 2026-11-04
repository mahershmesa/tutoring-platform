"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type QSubject = { id: string; name: string };
export type QQuiz = { id: string; title: string; chapter: string; subjectId: string };

export default function QuizBrowser({
  subjects,
  quizzes,
}: {
  subjects: QSubject[];
  quizzes: QQuiz[];
}) {
  const [subjectId, setSubjectId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    quizzes.forEach((q) => m.set(q.subjectId, (m.get(q.subjectId) ?? 0) + 1));
    return m;
  }, [quizzes]);

  if (subjectId) {
    const subject = subjects.find((s) => s.id === subjectId);
    const list = quizzes.filter((q) => q.subjectId === subjectId);
    // تجميع حسب الفصل/الوحدة
    const byChapter = new Map<string, QQuiz[]>();
    list.forEach((q) => {
      const arr = byChapter.get(q.chapter) ?? [];
      arr.push(q);
      byChapter.set(q.chapter, arr);
    });

    return (
      <div className="space-y-4">
        <button onClick={() => setSubjectId(null)} className="text-sm text-teal-dark hover:underline">
          ← كل المواد
        </button>
        <h2 className="text-base font-bold text-ink">{subject?.name}</h2>
        {list.length === 0 ? (
          <p className="text-sm text-ink-soft">لا توجد اختبارات لهذه المادة بعد.</p>
        ) : (
          [...byChapter.entries()].map(([chapter, qs]) => (
            <div key={chapter} className="space-y-2">
              <h3 className="text-sm font-bold text-teal-dark">{chapter}</h3>
              {qs.map((q) => (
                <Link
                  key={q.id}
                  href={`/quiz/${q.id}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 transition hover:border-teal"
                >
                  <span className="text-sm font-medium text-ink">{q.title}</span>
                  <span className="text-teal-dark">←</span>
                </Link>
              ))}
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">اختر المادة، بعدها اختر الاختبار حسب الفصل.</p>
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
                {n > 0 ? `${n} اختبار` : "لا يوجد بعد"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
