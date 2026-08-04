import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Governorate, Stage, Subject } from "@/lib/supabase/types";
import RegisterWizard from "@/components/auth/RegisterWizard";

export const metadata: Metadata = { title: "إنشاء حساب — دليلي" };
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const supabase = createClient();

  let governorates: Governorate[] = [];
  let stages: Stage[] = [];
  let subjects: Subject[] = [];

  if (supabase) {
    const [g, s, sub] = await Promise.all([
      supabase.from("governorates").select("id, name").order("id"),
      supabase.from("stages").select("id, name").order("sort_order"),
      supabase.from("subjects").select("id, name").eq("active", true).order("name"),
    ]);
    governorates = (g.data as Governorate[]) ?? [];
    stages = (s.data as Stage[]) ?? [];
    subjects = (sub.data as Subject[]) ?? [];
  }

  return (
    <RegisterWizard
      governorates={governorates}
      stages={stages}
      subjects={subjects}
    />
  );
}
