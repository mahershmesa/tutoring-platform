import type { Metadata } from "next";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "إنشاء حساب — دليلي" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="mb-4 text-xl font-bold text-ink">إنشاء حساب جديد</h1>
      <RegisterForm />
    </>
  );
}
