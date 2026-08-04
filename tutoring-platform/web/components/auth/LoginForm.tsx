"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { login, type AuthState } from "@/lib/auth/actions";
import SubmitButton from "./SubmitButton";

const initialState: AuthState = {};
const inputClass =
  "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-teal";

export default function LoginForm() {
  const [state, formAction] = useFormState(login, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="space-y-1">
        <label className="text-sm text-ink-soft">رقم الهاتف</label>
        <input
          name="identifier"
          type="text"
          inputMode="tel"
          autoComplete="username"
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
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>

      <SubmitButton>دخول</SubmitButton>

      <p className="text-center text-sm">
        <Link href="/reset" className="text-teal-dark hover:underline">
          نسيت كلمة المرور؟
        </Link>
      </p>

      <p className="text-center text-sm text-ink-soft">
        ما عندك حساب؟{" "}
        <Link href="/register" className="text-teal-dark hover:underline">
          سجّل الآن
        </Link>
      </p>
    </form>
  );
}
