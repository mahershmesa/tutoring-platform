"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LIMITS, asInt, asOptionalText, isUuid, dbErrorMessage } from "@/lib/validate";

export type SaveState = { error?: string; ok?: boolean };

// يقبل رابط قناة/فيديو يوتيوب فقط (https) — يمنع روابط ضارّة (javascript:, …).
// يعيد الرابط النظيف أو null (فارغ)، أو false إن كان غير صالح.
function cleanYouTube(v: unknown): string | null | false {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return false;
  const t = v.trim();
  if (t === "") return null;
  if (t.length > LIMITS.url) return false;
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

  if (!input || typeof input !== "object") return { error: "بيانات غير صالحة." };
  const fullName = asOptionalText(input.full_name, LIMITS.name);
  const phone = asOptionalText(input.phone, LIMITS.phone);
  const idDoc = asOptionalText(input.id_document_url, LIMITS.url);
  if (!fullName) return { error: "اكتب اسمك (١٥٠ حرفاً كحدّ أقصى)." };
  if (phone === false || idDoc === false) return { error: "قيمة أطول من المسموح." };
  const govId = input.governorate_id === null ? null : asInt(input.governorate_id, 1, 1000);
  const stageId = input.stage_id === null ? null : asInt(input.stage_id, 1, 1000);
  if ((input.governorate_id !== null && govId === null) ||
      (input.stage_id !== null && stageId === null))
    return { error: "محافظة أو مرحلة غير صالحة." };
  // وثيقة الهوية يجب أن تكون داخل مجلد المستخدم نفسه
  if (idDoc && !idDoc.startsWith(user.id + "/"))
    return { error: "ملف غير صالح." };

  const { error } = await supabase
    .from("student_profiles")
    .update({
      full_name: fullName,
      phone,
      governorate_id: govId,
      stage_id: stageId,
      id_document_url: idDoc,
    })
    .eq("user_id", user.id);

  if (error) return { error: dbErrorMessage(error, "تعذّر الحفظ. حاول لاحقاً.") };

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

  if (!input || typeof input !== "object") return { error: "بيانات غير صالحة." };
  const fullName = asOptionalText(input.full_name, LIMITS.name);
  if (!fullName) return { error: "اكتب اسمك (١٥٠ حرفاً كحدّ أقصى)." };

  const youtube = cleanYouTube(input.youtube_url);
  if (youtube === false)
    return { error: "رابط يوتيوب غير صالح (يجب أن يبدأ بـ https ومن يوتيوب)." };

  const phone = asOptionalText(input.phone, LIMITS.phone);
  const school = asOptionalText(input.school, LIMITS.short);
  const institute = asOptionalText(input.institute, LIMITS.short);
  const contactEmail = asOptionalText(input.contact_email, LIMITS.short);
  const telegram = asOptionalText(input.telegram_url, LIMITS.url);
  const instagram = asOptionalText(input.instagram_url, LIMITS.url);
  const bio = asOptionalText(input.bio, LIMITS.bio);
  const photoUrl = asOptionalText(input.photo_url, LIMITS.url);
  const idDoc = asOptionalText(input.id_document_url, LIMITS.url);
  if ([phone, school, institute, contactEmail, telegram, instagram, photoUrl, idDoc].includes(false))
    return { error: "أحد الحقول أطول من الحدّ المسموح." };
  if (bio === false)
    return { error: `النبذة أطول من الحدّ المسموح (${LIMITS.bio} حرف).` };
  // روابط التواصل: لا مخططات تنفيذية (javascript:/data:…)
  for (const link of [telegram, instagram]) {
    if (link && /^\s*(javascript|data|vbscript|file|blob):/i.test(link.replace(/[\s\u0000-\u0020]+/g, "")))
      return { error: "رابط تواصل غير صالح." };
  }
  // الصورة الشخصية: من تخزين المنصّة حصراً (https + مجلد المستخدم في avatars)
  if (photoUrl) {
    let okPhoto = false;
    try {
      const u = new URL(photoUrl);
      const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
      okPhoto =
        u.protocol === "https:" &&
        u.host === base.host &&
        u.pathname.startsWith(`/storage/v1/object/public/avatars/${user.id}/`);
    } catch {
      okPhoto = false;
    }
    if (!okPhoto) return { error: "صورة شخصية غير صالحة — ارفعها من الصفحة." };
  }
  if (idDoc && !idDoc.startsWith(user.id + "/")) return { error: "ملف غير صالح." };

  const years =
    input.years_experience === null || input.years_experience === undefined
      ? null
      : asInt(input.years_experience, 0, 80);
  if (input.years_experience != null && years === null)
    return { error: "سنوات الخبرة غير صالحة (٠–٨٠)." };
  const gender =
    input.gender === "male" || input.gender === "female" ? input.gender : null;
  const govId =
    input.governorate_id === null ? null : asInt(input.governorate_id, 1, 1000);
  if (input.governorate_id !== null && govId === null)
    return { error: "محافظة غير صالحة." };

  // تحقّق من القوائم قبل أي حذف (حتى لا يفقد المدرّس مواده بسبب إدخال تالف)
  const subjectIds = Array.isArray(input.subject_ids)
    ? Array.from(new Set(input.subject_ids))
    : null;
  const stageIds = Array.isArray(input.stage_ids)
    ? Array.from(new Set(input.stage_ids))
    : null;
  if (!subjectIds || subjectIds.length > 50 || !subjectIds.every(isUuid))
    return { error: "قائمة المواد غير صالحة." };
  if (!stageIds || stageIds.length > 50 || stageIds.some((s) => asInt(s, 1, 1000) === null))
    return { error: "قائمة المراحل غير صالحة." };

  // ملاحظة: لا نلمس verification_status ولا answered_count — محميّان بالقاعدة.
  const { error: upErr } = await supabase
    .from("teacher_profiles")
    .update({
      full_name: fullName,
      phone,
      school,
      institute,
      youtube_url: youtube,
      contact_email: contactEmail,
      telegram_url: telegram,
      instagram_url: instagram,
      bio,
      years_experience: years,
      gender,
      governorate_id: govId,
      location_visible: input.location_visible === true,
      photo_url: photoUrl,
      id_document_url: idDoc,
    })
    .eq("user_id", user.id);

  if (upErr) return { error: dbErrorMessage(upErr, "تعذّر الحفظ. حاول لاحقاً.") };

  // مزامنة المواد: احذف الكل ثم أدخل المختارة
  await supabase.from("teacher_subjects").delete().eq("teacher_id", user.id);
  if (subjectIds.length > 0) {
    const { error } = await supabase.from("teacher_subjects").insert(
      subjectIds.map((subject_id) => ({
        teacher_id: user.id,
        subject_id,
      })),
    );
    if (error) return { error: dbErrorMessage(error, "تعذّر حفظ المواد.") };
  }

  // مزامنة المراحل
  await supabase.from("teacher_stages").delete().eq("teacher_id", user.id);
  if (stageIds.length > 0) {
    const { error } = await supabase.from("teacher_stages").insert(
      stageIds.map((stage_id) => ({ teacher_id: user.id, stage_id })),
    );
    if (error) return { error: dbErrorMessage(error, "تعذّر حفظ المراحل.") };
  }

  revalidatePath("/profile");
  revalidatePath("/"); // تحديث الخريطة لو تغيّر الظهور/المحافظة
  return { ok: true };
}
