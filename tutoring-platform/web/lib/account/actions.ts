"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SECURITY_QUESTIONS } from "@/lib/auth/security-questions";
import { dbErrorMessage } from "@/lib/validate";

export type AccountState = { error?: string; ok?: boolean };

// يضبط/يحدّث سؤال الأمان للمستخدم الحالي (عبر RPC مُشفّرة).
export async function saveSecurityCredential(
  question: string,
  answer: string,
): Promise<AccountState> {
  const supabase = createClient();
  if (!supabase) return { error: "اتصال Supabase غير مضبوط." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجيل الدخول." };
  if (typeof question !== "string" || typeof answer !== "string")
    return { error: "اختر سؤالاً واكتب الجواب." };
  if (!question.trim() || !answer.trim())
    return { error: "اختر سؤالاً واكتب الجواب." };
  // السؤال من القائمة الجاهزة فقط (يمنع تخزين نص حرّ يُعرض لاحقاً في صفحة الاسترجاع)
  if (!SECURITY_QUESTIONS.includes(question))
    return { error: "اختر سؤالاً من القائمة." };
  if (answer.length > 200) return { error: "الجواب أطول من المسموح." };

  const { error } = await supabase.rpc("set_security_credential", {
    p_question: question,
    p_answer: answer,
  });
  if (error) return { error: dbErrorMessage(error, "تعذّر الحفظ. حاول لاحقاً.") };

  revalidatePath("/profile");
  return { ok: true };
}

// تعطيل/إعادة تفعيل الحساب الحالي.
export async function setDeactivated(
  deactivated: boolean,
): Promise<AccountState> {
  const supabase = createClient();
  if (!supabase) return { error: "اتصال Supabase غير مضبوط." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجيل الدخول." };

  const { error } = await supabase
    .from("account_status")
    .upsert(
      {
        user_id: user.id,
        deactivated: deactivated === true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (error) return { error: dbErrorMessage(error, "تعذّر تحديث حالة الحساب.") };

  revalidatePath("/profile");
  revalidatePath("/");
  return { ok: true };
}
