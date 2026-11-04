"use client";

import { useState } from "react";
import Link from "next/link";
import { submitQuiz } from "@/lib/study/actions";
import type { GradeResult } from "@/lib/study/types";

export type RunnerQuestion = { id: string; prompt: string; options: string[] };

export default function QuizRunner({
  quizId,
  subjectId,
  questions,
}: {
  quizId: string;
  subjectId: string;
  questions: RunnerQuestion[];
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);

  const correctOf = (qid: string) =>
    result?.results.find((r) => r.question_id === qid)?.correct_index ?? -1;

  async function submit() {
    setErr(null);
    if (Object.keys(answers).length < questions.length) {
      if (!confirm("فيه أسئلة ما جاوبتها. تريد تسلّم؟")) return;
    }
    setBusy(true);
    try {
      const res = await submitQuiz(quizId, answers);
      if (res.error) {
        setErr(res.error);
        return;
      }
      setResult(res.result ?? null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  }

  const graded = result !== null;
  const pct = result ? Math.round((result.score / result.total) * 100) : 0;

  return (
    <div className="space-y-4">
      {graded && (
        <div className="rounded-2xl border border-teal/30 bg-teal-light p-5 text-center">
          <p className="text-sm text-ink-soft">نتيجتك</p>
          <p className="text-3xl font-bold text-teal-dark">
            {result!.score} / {result!.total}
          </p>
          <p className="mt-1 text-sm font-medium text-teal-dark">{pct}%</p>
          <p className="mt-2 text-xs text-ink-soft">
            {pct >= 50 ? "أحسنت! 🎉 راجع الأخطاء بالأخضر." : "لا تيأس 💪 راجع الإجابات الصحيحة بالأخضر."}
          </p>
        </div>
      )}

      {questions.map((q, i) => {
        const chosen = answers[q.id];
        const correct = correctOf(q.id);
        return (
          <div key={q.id} className="space-y-2 rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-medium text-ink">
              {i + 1}. {q.prompt}
            </p>
            <div className="space-y-1.5">
              {q.options.map((o, oi) => {
                let cls =
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ";
                if (graded) {
                  if (oi === correct) cls += "border-green-500 bg-green-50 text-green-800";
                  else if (oi === chosen) cls += "border-red-400 bg-red-50 text-red-700";
                  else cls += "border-border text-ink-soft";
                } else {
                  cls +=
                    chosen === oi
                      ? "border-teal bg-teal-light text-teal-dark"
                      : "border-border text-ink hover:border-teal";
                }
                return (
                  <label key={oi} className={cls}>
                    <input
                      type="radio"
                      name={q.id}
                      disabled={graded}
                      checked={chosen === oi}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                      className="h-4 w-4 accent-teal"
                    />
                    <span>{o}</span>
                    {graded && oi === correct && <span className="mr-auto">✓</span>}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

      {!graded ? (
        <button
          onClick={submit}
          disabled={busy}
          className="w-full rounded-xl bg-teal px-4 py-3 text-sm font-bold text-white hover:bg-teal-dark disabled:opacity-60"
        >
          {busy ? "…جارٍ التصحيح" : "تسليم ومعرفة النتيجة"}
        </button>
      ) : (
        <div className="flex gap-2">
          <Link href="/quiz" className="flex-1 rounded-xl border border-border px-4 py-3 text-center text-sm text-ink-soft hover:border-teal">
            اختبارات أخرى
          </Link>
          <Link href={`/ask?subject=${subjectId}`} className="flex-1 rounded-xl bg-teal px-4 py-3 text-center text-sm font-bold text-white hover:bg-teal-dark">
            اطلب شرح من مدرّس
          </Link>
        </div>
      )}
    </div>
  );
}
