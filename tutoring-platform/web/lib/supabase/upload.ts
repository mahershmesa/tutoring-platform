import { createClient } from "@/lib/supabase/client";

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

  const rawExt = file.name.includes(".") ? file.name.split(".").pop()! : "bin";
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  const kind = bucket === "avatars" ? "photo" : "id-document";
  const path = `${userId}/${kind}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
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
