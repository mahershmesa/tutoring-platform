import type { Metadata } from "next";
import ResetForm from "@/components/auth/ResetForm";

export const metadata: Metadata = { title: "استرجاع كلمة المرور — دليلي" };

export default function ResetPage() {
  return <ResetForm />;
}
