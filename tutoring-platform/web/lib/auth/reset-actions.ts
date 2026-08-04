"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, isValidPhone } from "@/lib/auth/phone";

// يبحث عن معرّف المستخدم برقم هاتفه (عبر مفتاح الخدمة — يتجاوز RLS).
async function findUserId(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  phone: string,
): Promise<string | null> {
  const { data: t } = await admin
    .from("teacher_profiles")
    .select("user_id")
    .eq("phone", phone)
    .maybeSingle();
  if (t) return t.user_id as string;
  const { data: s } = await admin
    .from("student_profiles")
    .select("user_id")
    .eq("phone", phone)
    .maybeSingle();
  return (s?.user_id as string) ?? null;
}

// الخطوة ١: جلب سؤال الأمان بحسب رقم الهاتف.
export async function getResetQuestion(
  phoneRaw: string,
): Promise<{ error?: string; question?: string }> {
  const admin = createAdminClient();
  if (!admin) return { error: "خدمة الاسترجاع غير مضبوطة. تواصل مع الإدارة." };

  const phone = normalizePhone(phoneRaw);
  if (!isValidPhone(phone)) return { error: "رقم هاتف غير صحيح." };

  const userId = await findUserId(admin, phone);
  if (!userId) return { error: "لا يوجد حساب بهذا الرقم." };

  const { data } = await admin
    .from("security_credentials")
    .select("question")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data)
    return {
      error: "لا يوجد سؤال أمان لهذا الحساب. تواصل مع الإدارة لاسترجاعه.",
    };
  return { question: data.question as string };
}

// الخطوة ٢: التحقق من الجواب وتعيين كلمة مرور جديدة.
export async function submitReset(
  phoneRaw: string,
  answer: string,
  newPassword: string,
): Promise<{ error?: string; ok?: boolean }> {
  const admin = createAdminClient();
  if (!admin) return { error: "خدمة الاسترجاع غير مضبوطة." };

  const phone = normalizePhone(phoneRaw);
  if (!isValidPhone(phone)) return { error: "رقم هاتف غير صحيح." };
  if (newPassword.length < 8) return { error: "كلمة المرور ٨ أحرف على الأقل." };

  const userId = await findUserId(admin, phone);
  if (!userId) return { error: "لا يوجد حساب بهذا الرقم." };

  const { data: status, error: rpcErr } = await admin.rpc(
    "check_security_answer",
    { p_user_id: userId, p_answer: answer },
  );
  if (rpcErr) return { error: "تعذّر التحقق. حاول لاحقاً." };
  if (status === "locked")
    return { error: "محاولات كثيرة خاطئة. انتظر ١٥ دقيقة ثم حاول مجدداً." };
  if (status === "notset")
    return { error: "لا يوجد سؤال أمان لهذا الحساب." };
  if (status !== "ok") return { error: "جواب سؤال الأمان غير صحيح." };

  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });
  if (error) return { error: "تعذّر تعيين كلمة المرور: " + error.message };
  return { ok: true };
}
