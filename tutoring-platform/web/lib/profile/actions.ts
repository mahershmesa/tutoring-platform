"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SaveState = { error?: string; ok?: boolean };

const clean = (v: string | null | undefined) => {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
};

// يقبل رابط قناة/فيديو يوتيوب فقط (https) — يمنع روابط ضارّة (javascript:, …).
// يعيد الرابط النظيف أو null (فارغ)، أو false إن كان غير صالح.
function cleanYouTube(v: string | null | undefined): string | null | false {
  const t = (v ?? "").trim();
  if (t === "") return null;
  try {
    const u = new URL(t);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase().replace(/^www\./, "");
    if (h === "youtube.com" || h === "m.youtube.com" || h === "youtu.be")
      return u.toString();
    return false;
  } catch {
    return false;
  }
}

export type StudentInput = {
  full_name: string;
  phone: string;
  governorate_id: number | null;
  stage_id: number | null;
  id_document_url: string | null;
};

export async function saveStudentProfile(
  input: StudentInput,
): Promise<SaveState> {
  const supabase = createClient();
  if (!supabase) return { error: "اتصال Supabase غير مضبوط." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجيل الدخول." };

  if (!clean(input.full_name)) return { error: "اكتب اسمك." };

  const { error } = await supabase
    .from("student_profiles")
    .update({
      full_name: clean(input.full_name),
      phone: clean(input.phone),
      governorate_id: input.governorate_id,
      stage_id: input.stage_id,
      id_document_url: clean(input.id_document_url),
    })
    .eq("user_id", user.id);

  if (error) return { error: "تعذّر الحفظ: " + error.message };

  revalidatePath("/profile");
  return { ok: true };
}

export type TeacherInput = {
  full_name: string;
  phone: string;
  school: string;
  institute: string;
  contact_email: string;
  telegram_url: string;
  instagram_url: string;
  youtube_url: string;
  bio: string;
  years_experience: number | null;
  gender: "male" | "female" | null;
  governorate_id: number | null;
  location_visible: boolean;
  photo_url: string | null;
  id_document_url: string | null;
  subject_ids: string[];
  stage_ids: number[];
};

export async function saveTeacherProfile(
  input: TeacherInput,
): Promise<SaveState> {
  const supabase = createClient();
  if (!supabase) return { error: "اتصال Supabase غير مضبوط." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجيل الدخول." };

  if (!clean(input.full_name)) return { error: "اكتب اسمك." };

  const youtube = cleanYouTube(input.youtube_url);
  if (youtube === false)
    return { error: "رابط يوتيوب غير صالح (يجب أن يبدأ بـ https ومن يوتيوب)." };

  // ملاحظة: لا نلمس verification_status ولا answered_count — محميّان بالقاعدة.
  const { error: upErr } = await supabase
    .from("teacher_profiles")
    .update({
      full_name: clean(input.full_name),
      phone: clean(input.phone),
      school: clean(input.school),
      institute: clean(input.institute),
      youtube_url: youtube,
      contact_email: clean(input.contact_email),
      telegram_url: clean(input.telegram_url),
      instagram_url: clean(input.instagram_url),
      bio: clean(input.bio),
      years_experience: input.years_experience,
      gender: input.gender,
      governorate_id: input.governorate_id,
      location_visible: input.location_visible,
      photo_url: clean(input.photo_url),
      id_document_url: clean(input.id_document_url),
    })
    .eq("user_id", user.id);

  if (upErr) return { error: "تعذّر الحفظ: " + upErr.message };

  // مزامنة المواد: احذف الكل ثم أدخل المختارة
  await supabase.from("teacher_subjects").delete().eq("teacher_id", user.id);
  if (input.subject_ids.length > 0) {
    const { error } = await supabase.from("teacher_subjects").insert(
      input.subject_ids.map((subject_id) => ({
        teacher_id: user.id,
        subject_id,
      })),
    );
    if (error) return { error: "تعذّر حفظ المواد: " + error.message };
  }

  // مزامنة المراحل
  await supabase.from("teacher_stages").delete().eq("teacher_id", user.id);
  if (input.stage_ids.length > 0) {
    const { error } = await supabase.from("teacher_stages").insert(
      input.stage_ids.map((stage_id) => ({ teacher_id: user.id, stage_id })),
    );
    if (error) return { error: "تعذّر حفظ المراحل: " + error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/"); // تحديث الخريطة لو تغيّر الظهور/المحافظة
  return { ok: true };
}
