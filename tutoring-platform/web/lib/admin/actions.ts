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

// ---------- الإعلانات ----------

export async function addAd(
  imageUrl: string,
  caption: string,
  sortOrder: number,
): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { error: "غير مصرّح." };
  if (!imageUrl) return { error: "ارفع صورة الإعلان." };

  const { error } = await supabase.from("ads").insert({
    image_url: imageUrl,
    caption: caption.trim() || null,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/ads");
  revalidatePath("/");
  return { ok: true };
}

export async function setAdActive(
  id: string,
  active: boolean,
): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { error: "غير مصرّح." };

  const { error } = await supabase.from("ads").update({ active }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/ads");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteAd(id: string): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { error: "غير مصرّح." };

  const { error } = await supabase.from("ads").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/ads");
  revalidatePath("/");
  return { ok: true };
}

// ---------- الأخبار ----------

export async function addNews(
  caption: string,
  imageUrl: string | null,
): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { error: "غير مصرّح." };
  const clean = caption.trim();
  if (!clean) return { error: "اكتب نص الخبر." };

  const { error } = await supabase
    .from("news")
    .insert({ caption: clean, image_url: imageUrl });
  if (error) return { error: error.message };

  revalidatePath("/admin/news");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteNews(id: string): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { error: "غير مصرّح." };

  const { error } = await supabase.from("news").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/news");
  revalidatePath("/");
  return { ok: true };
}
