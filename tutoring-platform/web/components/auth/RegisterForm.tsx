"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import Link from "next/link";
import { signup, type AuthState } from "@/lib/auth/actions";
import SubmitButton from "./SubmitButton";

const initialState: AuthState = {};
const inputClass =
  "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-teal";

export default function RegisterForm() {
  const [state, formAction] = useFormState(signup, initialState);
  const [role, setRole] = useState<"student" | "teacher">("student");

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      {/* اختيار الدور */}
      <div className="flex gap-2">
        {(["student", "teacher"] as const).map((r) => {
          const active = role === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={
                "flex-1 rounded-xl border px-4 py-2.5 text-sm transition " +
                (active
                  ? "border-teal bg-teal-light font-medium text-teal-dark"
                  : "border-border bg-white text-ink-soft hover:border-teal")
              }
            >
              {r === "student" ? "أنا طالب" : "أنا مدرّس"}
            </button>
          );
        })}
      </div>
      <input type="hidden" name="role" value={role} />

      <div className="space-y-1">
        <label className="text-sm text-ink-soft">الاسم الكامل</label>
        <input name="full_name" type="text" required className={inputClass} />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-ink-soft">رقم الهاتف</label>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="07701234567"
          dir="ltr"
          required
          className={inputClass + " text-right"}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-ink-soft">كلمة المرور</label>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          className={inputClass}
        />
        <p className="text-xs text-ink-soft">٦ أحرف على الأقل</p>
      </div>

      <SubmitButton>إنشاء حساب</SubmitButton>

      {role === "teacher" && (
        <p className="rounded-xl bg-amber-light px-3 py-2 text-xs text-ink">
          حساب المدرّس يبقى «قيد المراجعة» حتى تقبله الإدارة، وتكمّل بياناتك
          وترفع إثبات هويتك من صفحة البروفايل.
        </p>
      )}

      <p className="text-center text-sm text-ink-soft">
        عندك حساب؟{" "}
        <Link href="/login" className="text-teal-dark hover:underline">
          تسجيل الدخول
        </Link>
      </p>
    </form>
  );
}
