// ضغط وتصغير الصور في المتصفح قبل الرفع (بدون أي مكتبة خارجية).
// يصغّر لأقصى بُعد محدّد ويعيد الترميز إلى WebP (مع fallback لـ JPEG).

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImage(
  file: File,
  opts: { maxDim: number; quality?: number },
): Promise<File> {
  // لا نلمس غير الصور، ولا الصور المتحركة (gif)
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;

  const quality = opts.quality ?? 0.8;

  let bitmap: ImageBitmap;
  try {
    // imageOrientation يعالج دوران EXIF تلقائياً
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // لو فشل فك الترميز، نرفع الأصل
  }

  const { width, height } = bitmap;
  const scale = Math.min(1, opts.maxDim / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  let blob = await canvasToBlob(canvas, "image/webp", quality);
  if (!blob) blob = await canvasToBlob(canvas, "image/jpeg", quality);
  if (!blob || blob.size >= file.size) return file; // ما نفعنا الضغط → نرفع الأصل

  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${base}.${ext}`, { type: blob.type });
}
