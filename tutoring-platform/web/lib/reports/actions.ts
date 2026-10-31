"use server";

import { createClient } from "@/lib/supabase/server";

export type ReportState = { error?: string; ok?: boolean };

// أسباب البلاغ المعروضة في الواجهة (قيمة = نص يُخزَّن).
export const REPORT_REASONS = [
  "محتوى غير لائق",
  "احتيال أو نصب",
  "انتحال شخصية",
  "تحرّش أو إساءة",
  "معلومات مضلّلة",
  "سبب آخر",
] as const;

export type ReportContext = "user" | "message" | "question";

// المستخدم يُبلّغ عن مستخدم آخر (القاعدة تفرض: المُبلِّغ = الحساب، ولا بلاغ عن النفس،
// وبلاغ مفتوح واحد لكل زوج عبر الفهرس الفريد).
export async function fileReport(
  reportedId: string,
  reason: string,
  contextType: ReportContext = "user",
  contextId?: string | null,
): Promise<ReportState> {
  const supabase = createClient();
  if (!supabase) return { error: "اتصال Supabase غير مضبوط." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجيل الدخول." };

  const clean = reason.trim();
  if (!clean) return { error: "اختر سبب البلاغ." };
  if (reportedId === user.id)
    return { error: "لا يمكنك الإبلاغ عن نفسك." };

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    reported_id: reportedId,
    context_type: contextType,
    context_id: contextId ?? null,
    reason: clean,
  });

  if (error) {
    // بلاغ مفتوح مكرر لنفس الشخص
    if (error.code === "23505")
      return { error: "عندك بلاغ مفتوح على هذا الحساب قيد المراجعة." };
    return { error: error.message };
  }

  return { ok: true };
}
