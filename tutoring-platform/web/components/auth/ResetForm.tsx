"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getResetQuestion, submitReset } from "@/lib/auth/reset-actions";

const input =
  "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-teal";

export default function ResetForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onLookup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await getResetQuestion(phone);
    setBusy(false);
    if (res.error) setErr(res.error);
    else setQuestion(res.question ?? "");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await submitReset(phone, answer, password);
    setBusy(false);
    if (res.error) setErr(res.error);
    else setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <p className="rounded-xl bg-teal-light px-3 py-3 text-sm text-teal-dark">
          ✓ تم تعيين كلمة مرور جديدة بنجاح. تقدر تسجّل الدخول الآن.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="w-full rounded-xl bg-teal px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-dark"
        >
          تسجيل الدخول
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-ink">استرجاع كلمة المرور</h1>

      {err && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>
      )}

      {!question ? (
        <form onSubmit={onLookup} className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm text-ink-soft">رقم الهاتف</label>
            <input className={input + " text-right"} dir="ltr" inputMode="tel" placeholder="07701234567" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-teal px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60">
            {busy ? "…جارٍ" : "متابعة"}
          </button>
        </form>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm text-ink-soft">سؤال الأمان</label>
            <p className="rounded-xl bg-surface px-3 py-2.5 text-sm text-ink">{question}</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-ink-soft">جوابك</label>
            <input className={input} value={answer} onChange={(e) => setAnswer(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-ink-soft">كلمة المرور الجديدة</label>
            <input className={input} type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <p className="text-xs text-ink-soft">٨ أحرف على الأقل</p>
          </div>
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-teal px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60">
            {busy ? "…جارٍ" : "تعيين كلمة المرور"}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-ink-soft">
        <Link href="/login" className="text-teal-dark hover:underline">
          العودة لتسجيل الدخول
        </Link>
      </p>
    </div>
  );
}
