import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/images/compress";

export type Bucket = "avatars" | "id-documents";

const MB = 1024 * 1024;

// يتحقق من حجم الملف قبل الرفع ويرمي رسالة عربية واضحة عند التجاوز،
// ويترجم خطأ الحجم القادم من الخادم أيضاً (احتياط).
function checkSize(file: File, maxMb: number) {
  if (file.size > maxMb * MB) {
    throw new Error(
      `حجم الملف (${(file.size / MB).toFixed(1)} ميجا) أكبر من الحد المسموح (${maxMb} ميجا). اختر ملفاً أصغر.`,
    );
  }
}

function uploadErrorMessage(raw: string, maxMb: number): string {
  const m = raw.toLowerCase();
  if (m.includes("maximum allowed size") || m.includes("payload too large") || m.includes("413")) {
    return `حجم الملف أكبر من الحد المسموح (${maxMb} ميجا). اختر ملفاً أصغر.`;
  }
  if (m.includes("mime") || m.includes("not allowed") || m.includes("invalid")) {
    return "نوع الملف غير مسموح. الرجاء اختيار صورة أو ملف PDF.";
  }
  return "تعذّر رفع الملف: " + raw;
}

/**
 * يرفع ملفاً من المتصفح مباشرة إلى Supabase Storage.
 * المسار يبدأ دائماً بمعرّف المستخدم <user_id>/... لتحترم سياسة RLS.
 *
 * - avatars (عام): يرجّع publicUrl لتخزينه في photo_url.
 * - id-documents (خاص): يرجّع path فقط (يُعرض لاحقاً عبر رابط موقّع).
 */
export async function uploadFile(
  bucket: Bucket,
  userId: string,
  file: File,
): Promise<{ path: string; publicUrl?: string }> {
  const supabase = createClient();

  const maxMb = bucket === "avatars" ? 5 : 10;
  checkSize(file, maxMb);

  // نضغط الصورة الشخصية فقط. إثبات الهوية يُترك كما هو (قد يكون PDF ويجب أن يبقى واضحاً).
  const toUpload =
    bucket === "avatars"
      ? await compressImage(file, { maxDim: 512, quality: 0.8 })
      : file;

  const rawExt = toUpload.name.includes(".")
    ? toUpload.name.split(".").pop()!
    : "bin";
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  const kind = bucket === "avatars" ? "photo" : "id-document";
  const path = `${userId}/${kind}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, toUpload, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(uploadErrorMessage(error.message, maxMb));

  if (bucket === "avatars") {
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return { path, publicUrl: data.publicUrl };
  }
  return { path };
}

/**
 * رفع وسائط إدارية عامة إلى bucket "ads" (إعلانات/أخبار).
 * سياسة الكتابة: bucket_id='ads' AND is_admin() — بلا قيد مجلد المستخدم،
 * فالإدارة ترفع بأي مسار. يرجّع الرابط العام مباشرةً.
 */
export async function uploadPublicMedia(
  kind: "ad" | "news",
  file: File,
): Promise<string> {
  const supabase = createClient();
  checkSize(file, 5);
  // ضغط وتصغير لأقصى عرض 1600px للإعلانات والأخبار
  const toUpload = await compressImage(file, { maxDim: 1600, quality: 0.8 });
  const rawExt = toUpload.name.includes(".")
    ? toUpload.name.split(".").pop()!
    : "bin";
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  const path = `${kind}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("ads").upload(path, toUpload, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(uploadErrorMessage(error.message, 5));

  const { data } = supabase.storage.from("ads").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * يرفع مرفق رسالة إلى bucket خاص بالمسار <question_id>/<teacher_id>/...
 * حيث teacher_id هو المدرّس طرف المحادثة. سياسات RLS تضمن أن يصله فقط
 * الطالب صاحب السؤال والمدرّس صاحب المجلد. يرجّع المسار + النوع + الاسم الأصلي.
 */
export async function uploadMessageAttachment(
  questionId: string,
  teacherId: string,
  file: File,
): Promise<{ path: string; mime: string; name: string }> {
  const supabase = createClient();
  checkSize(file, 10);
  const isImage =
    file.type.startsWith("image/") && file.type !== "image/gif";
  const toUpload = isImage
    ? await compressImage(file, { maxDim: 1600, quality: 0.8 })
    : file;

  const rawExt = toUpload.name.includes(".")
    ? toUpload.name.split(".").pop()!
    : "bin";
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  const path = `${questionId}/${teacherId}/att-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("message-attachments")
    .upload(path, toUpload, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(uploadErrorMessage(error.message, 10));

  return { path, mime: toUpload.type || file.type, name: file.name };
}

/**
 * يرفع مرفق السؤال إلى bucket خاص بالمسار <question_id>/...
 * (يُبَثّ لكل المدرّسين المطابقين — نفس نطاق رؤية السؤال). يجب أن يوجد السؤال
 * أولاً (RLS يتحقق من ملكيته). يرجّع المسار + النوع + الاسم الأصلي.
 */
export async function uploadQuestionAttachment(
  questionId: string,
  file: File,
): Promise<{ path: string; mime: string; name: string }> {
  const supabase = createClient();
  checkSize(file, 10);
  const isImage =
    file.type.startsWith("image/") && file.type !== "image/gif";
  const toUpload = isImage
    ? await compressImage(file, { maxDim: 1600, quality: 0.8 })
    : file;

  const rawExt = toUpload.name.includes(".")
    ? toUpload.name.split(".").pop()!
    : "bin";
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  const path = `${questionId}/att-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("question-attachments")
    .upload(path, toUpload, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(uploadErrorMessage(error.message, 10));

  return { path, mime: toUpload.type || file.type, name: file.name };
}
