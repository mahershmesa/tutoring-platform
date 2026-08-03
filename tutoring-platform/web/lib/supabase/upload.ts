import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/images/compress";

export type Bucket = "avatars" | "id-documents";

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
  if (error) throw new Error("فشل رفع الملف: " + error.message);

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
  if (error) throw new Error("فشل رفع الصورة: " + error.message);

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
  if (error) throw new Error("فشل رفع المرفق: " + error.message);

  return { path, mime: toUpload.type || file.type, name: file.name };
}
