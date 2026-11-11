"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * يسجّل أن المستخدم الحالي (المدعوّ، حديث التسجيل) وصل عبر رمز داعٍ.
 * آمنة: التحقق كله في القاعدة (دالة SECURITY DEFINER record_referral) —
 * ترفض الإحالة للنفس، وتضمن مرّة واحدة لكل مدعوّ، وتتجاهل الرمز غير الصالح.
 * best-effort: أي خطأ لا يُفشل إنشاء الحساب.
 */
export async function recordReferral(code: string): Promise<void> {
  if (typeof code !== "string") return;
  const c = code.trim();
  if (!/^[A-Za-z0-9]{4,16}$/.test(c)) return;
  const supabase = createClient();
  if (!supabase) return;
  try {
    await supabase.rpc("record_referral", { p_code: c });
  } catch {
    /* تجاهل — الدعوة ميزة إضافية لا تمنع التسجيل */
  }
}
