// أدوات تحقّق مشتركة لأفعال الخادم (Server Actions).
// مهم: معاملات الفعل تأتي من العميل كما هي — أنواع TypeScript لا تُفرض وقت
// التشغيل، فأي مستدعٍ يستطيع إرسال أي قيمة. لذلك نتحقّق من النوع والحجم هنا،
// والقاعدة (RLS + القيود) تبقى الحاجز الأخير.

// حدود الحجم — مطابقة لقيود القاعدة (migration 41) أو أضيق منها.
export const LIMITS = {
  name: 150,
  phone: 30,
  short: 200, // مدرسة/معهد/عنوان/فصل
  url: 500,
  bio: 3000,
  text: 5000, // سؤال/رسالة
  comment: 1000, // تعليق تقييم/سبب بلاغ
  fileName: 300,
  mime: 100,
} as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

/** نص مُشذَّب ضمن الحدّ، أو null إن لم يكن نصاً أو تجاوز الحدّ. */
export function asText(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length <= max ? t : null;
}

/** نص اختياري: فارغ/غير موجود → null (مقبول)، تجاوز الحدّ أو نوع خاطئ → false. */
export function asOptionalText(v: unknown, max: number): string | null | false {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return false;
  const t = v.trim();
  if (t === "") return null;
  return t.length <= max ? t : false;
}

export function asInt(v: unknown, min: number, max: number): number | null {
  if (typeof v !== "number" || !Number.isInteger(v)) return null;
  return v >= min && v <= max ? v : null;
}

type DbError = { code?: string; message?: string } | null | undefined;

/**
 * رسالة خطأ آمنة للمستخدم: لا نعرض نص خطأ القاعدة الخام (يكشف أسماء الجداول
 * والقيود). نمرّر فقط رسائلنا العربية المرفوعة من تريغرات القاعدة (حدود المعدّل…).
 */
export function dbErrorMessage(error: DbError, fallback: string): string {
  const msg = error?.message ?? "";
  if (/[؀-ۿ]/.test(msg)) return msg; // رسالة عربية من تريغراتنا
  if (error?.code === "23514")
    return "القيمة المدخلة غير مقبولة (قد تكون أطول من الحدّ المسموح).";
  if (error?.code === "42501") return "غير مصرّح بهذا الإجراء.";
  return fallback;
}
