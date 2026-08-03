"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/guard";

export type ActionState = { error?: string; ok?: boolean };

// تحقق إداري داخلي للأفعال (طبقة إضافية فوق RLS الذي يبقى الحاجز الحقيقي).
async function adminClient() {
  const supabase = createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  if (!(await isAdmin(supabase, user.id))) return null;
  return supabase;
}

export async function setTeacherVerification(
  teacherId: string,
  status: "approved" | "rejected",
): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { error: "غير مصرّح." };

  const { error } = await supabase
    .from("teacher_profiles")
    .update({ verification_status: status })
    .eq("user_id", teacherId);
  if (error) return { error: error.message };

  revalidatePath("/admin/teachers");
  revalidatePath("/admin");
  revalidatePath("/"); // الخريطة قد تتغيّر عند القبول
  return { ok: true };
}

export async function addSubject(name: string): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { error: "غير مصرّح." };

  const clean = name.trim();
  if (!clean) return { error: "اكتب اسم المادة." };

  const { error } = await supabase.from("subjects").insert({ name: clean });
  if (error) {
    if (error.code === "23505") return { error: "هذه المادة موجودة مسبقاً." };
    return { error: error.message };
  }

  revalidatePath("/admin/subjects");
  revalidatePath("/");
  return { ok: true };
}

export async function setSubjectActive(
  id: string,
  active: boolean,
): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { error: "غير مصرّح." };

  const { error } = await supabase
    .from("subjects")
    .update({ active })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/subjects");
  revalidatePath("/");
  return { ok: true };
}
