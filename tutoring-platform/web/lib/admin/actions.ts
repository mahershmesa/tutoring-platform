"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/guard";
import { normalizePhone, isValidPhone } from "@/lib/auth/phone";

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

// ---------- إدارة المدراء (أخطر صلاحية) ----------

// يبحث عن مستخدم برقم هاتفه (بدون منح أي صلاحية) — لعرض هويته في تأكيد الترقية.
export async function findUserByPhone(
  phoneRaw: string,
): Promise<ActionState & { userId?: string; name?: string; already?: boolean }> {
  const supabase = await adminClient();
  if (!supabase) return { error: "غير مصرّح." };
  const phone = normalizePhone(phoneRaw);
  if (!isValidPhone(phone)) return { error: "رقم هاتف غير صحيح." };

  let userId: string | undefined;
  let name: string | undefined;
  const { data: t } = await supabase
    .from("teacher_profiles")
    .select("user_id, full_name")
    .eq("phone", phone)
    .maybeSingle();
  if (t) {
    userId = t.user_id;
    name = t.full_name;
  } else {
    const { data: s } = await supabase
      .from("student_profiles")
      .select("user_id, full_name")
      .eq("phone", phone)
      .maybeSingle();
    if (s) {
      userId = s.user_id;
      name = s.full_name;
    }
  }
  if (!userId) return { error: "لم يُعثر على مستخدم بهذا الرقم." };

  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  return { ok: true, userId, name: name ?? undefined, already: Boolean(role) };
}

export async function grantAdmin(userId: string): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { error: "غير مصرّح." };

  const { error } = await supabase
    .from("user_roles")
    .insert({ user_id: userId, role: "admin" });
  if (error) {
    if (error.code === "23505") return { error: "هذا المستخدم أدمن مسبقاً." };
    return { error: error.message };
  }
  revalidatePath("/admin/admins");
  return { ok: true };
}

export async function revokeAdmin(userId: string): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { error: "غير مصرّح." };

  // منع سحب الصلاحية عن النفس (تفادي الإغلاق الذاتي)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === userId)
    return { error: "لا يمكنك سحب صلاحيتك عن نفسك." };

  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", "admin");
  if (error) return { error: error.message };
  revalidatePath("/admin/admins");
  return { ok: true };
}

export async function addSubjects(
  names: string[],
): Promise<ActionState & { added?: number; skipped?: number }> {
  const supabase = await adminClient();
  if (!supabase) return { error: "غير مصرّح." };

  const clean = Array.from(
    new Set(names.map((n) => n.trim()).filter(Boolean)),
  );
  if (clean.length === 0)
    return { error: "اكتب اسم مادة واحدة على الأقل." };

  const { data, error } = await supabase
    .from("subjects")
    .upsert(clean.map((name) => ({ name })), {
      onConflict: "name",
      ignoreDuplicates: true,
    })
    .select("id");
  if (error) return { error: error.message };

  const added = data?.length ?? 0;
  revalidatePath("/admin/subjects");
  revalidatePath("/");
  return { ok: true, added, skipped: clean.length - added };
}

// ---------- الإعلانات ----------

export async function addAd(
  imageUrl: string,
  caption: string,
  sortOrder: number,
  contactInfo: string,
): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { error: "غير مصرّح." };
  if (!imageUrl) return { error: "ارفع صورة الإعلان." };

  const { error } = await supabase.from("ads").insert({
    image_url: imageUrl,
    caption: caption.trim() || null,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    contact_info: contactInfo.trim() || null,
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
