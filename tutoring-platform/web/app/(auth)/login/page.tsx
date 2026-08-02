import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "تسجيل الدخول — دليلي" };

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-4 text-xl font-bold text-ink">تسجيل الدخول</h1>
      <LoginForm />
    </>
  );
}
