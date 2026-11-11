"use server";

import { createClient } from "@/lib/supabase/server";
import type { ReportState, ReportContext } from "@/lib/reports/constants";
import { LIMITS, asText, isUuid, dbErrorMessage } from "@/lib/validate";

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

  if (!isUuid(reportedId)) return { error: "حساب غير صالح." };
  const clean = asText(reason, LIMITS.comment);
  if (clean === null) return { error: "سبب البلاغ أطول من المسموح." };
  if (!clean) return { error: "اختر سبب البلاغ." };
  const ctxType: ReportContext =
    contextType === "message" || contextType === "question" ? contextType : "user";
  const ctxId = isUuid(contextId) ? contextId : null;
  if (reportedId === user.id)
    return { error: "لا يمكنك الإبلاغ عن نفسك." };

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    reported_id: reportedId,
    context_type: ctxType,
    context_id: ctxId,
    reason: clean,
  });

  if (error) {
    // بلاغ مفتوح مكرر لنفس الشخص
    if (error.code === "23505")
      return { error: "عندك بلاغ مفتوح على هذا الحساب قيد المراجعة." };
    return { error: dbErrorMessage(error, "تعذّر إرسال البلاغ. حاول لاحقاً.") };
  }

  return { ok: true };
}
