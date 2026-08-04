"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSecurityCredential } from "@/lib/account/actions";
import { SECURITY_QUESTIONS } from "@/lib/auth/security-questions";

const input =
  "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-teal";

export default function SecurityQuestionCard({
  hasCredential,
}: {
  hasCredential: boolean;
}) {
  const router = useRouter();
  const [question, setQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(!hasCredential);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim()) {
      setMsg({ text: "اكتب الجواب." });
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await saveSecurityCredential(question, answer);
    setBusy(false);
    if (res.error) setMsg({ text: res.error });
    else {
      setAnswer("");
      setOpen(false);
      setMsg({ ok: true, text: "تم حفظ سؤال الأمان." });
      router.refresh();
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-ink">سؤال الأمان</h2>
        {hasCredential ? (
          <span className="text-xs font-medium text-teal-dark">مضبوط ✓</span>
        ) : (
          <span className="text-xs font-medium text-amber">غير مضبوط</span>
        )}
      </div>
      <p className="mt-1 text-xs text-ink-soft">
        يُستخدم لاسترجاع حسابك إذا نسيت كلمة المرور.
        {!hasCredential && " اضبطه الآن للأمان."}
      </p>

      {msg && (
        <p
          className={
            "mt-2 rounded-lg px-3 py-2 text-sm " +
            (msg.ok ? "bg-teal-light text-teal-dark" : "bg-red-50 text-red-700")
          }
        >
          {msg.text}
        </p>
      )}

      {open ? (
        <form onSubmit={save} className="mt-3 space-y-2">
          <select className={input} value={question} onChange={(e) => setQuestion(e.target.value)}>
            {SECURITY_QUESTIONS.map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
          <input className={input} placeholder="جوابك" value={answer} onChange={(e) => setAnswer(e.target.value)} />
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="rounded-xl bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60">
              {busy ? "…جارٍ" : "حفظ"}
            </button>
            {hasCredential && (
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-border px-4 py-2 text-sm text-ink-soft hover:border-teal">
                إلغاء
              </button>
            )}
          </div>
        </form>
      ) : (
        <button onClick={() => setOpen(true)} className="mt-3 rounded-xl border border-border px-4 py-2 text-sm text-ink-soft hover:border-teal">
          {hasCredential ? "تحديث سؤال الأمان" : "ضبط سؤال الأمان"}
        </button>
      )}
    </div>
  );
}
