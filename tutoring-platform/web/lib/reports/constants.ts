// ثوابت وأنواع البلاغات — ملف عادي (ليس "use server") حتى يُستورد في مكوّنات
// العميل بأمان. (ملفات "use server" لا يجوز أن تُصدّر إلا دوالّ async؛ تصدير ثابت
// منها يصل معطوباً للعميل → TypeError عند الاستخدام.)

export type ReportState = { error?: string; ok?: boolean };

export type ReportContext = "user" | "message" | "question";

// أسباب البلاغ المعروضة في الواجهة (قيمة = نص يُخزَّن).
export const REPORT_REASONS = [
  "محتوى غير لائق",
  "احتيال أو نصب",
  "انتحال شخصية",
  "تحرّش أو إساءة",
  "معلومات مضلّلة",
  "سبب آخر",
] as const;
