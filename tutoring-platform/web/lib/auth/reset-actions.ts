"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, isValidPhone } from "@/lib/auth/phone";
import { SECURITY_QUESTIONS } from "@/lib/auth/security-questions";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

function clientIp(): string {
  const h = headers();
  const xff = h.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

// حدّ معدّل لكل IP (يفشل مغلقاً عند الخطأ).
async function withinRate(admin: Admin): Promise<boolean> {
  const { data, error } = await admin.rpc("check_reset_rate_limit", {
    p_ip: clientIp(),
  });
  if (error) return false;
  return data === true;
}

// سؤال وهمي ثابت مشتقّ من الرقم — يُعاد لغير المسجّل حتى لا يكشف الرد وجود الحساب.
function decoyQuestion(phone: string): string {
  let h = 0;
  for (let i = 0; i < phone.length; i++) h = (h * 31 + phone.charCodeAt(i)) | 0;
  return SECURITY_QUESTIONS[Math.abs(h) % SECURITY_QUESTIONS.length];
}

// يبحث عن معرّف المستخدم برقم هاتفه (عبر مفتاح الخدمة — يتجاوز RLS).
async function findUserId(admin: Admin, phone: string): Promise<string | null> {
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

// الخطوة ١: جلب سؤال الأمان. لا يكشف وجود الحساب (سؤال وهمي ثابت لغير المسجّل).
export async function getResetQuestion(
  phoneRaw: string,
): Promise<{ error?: string; question?: string }> {
  const admin = createAdminClient();
  if (!admin) return { error: "خدمة الاسترجاع غير مضبوطة. تواصل مع الإدارة." };

  const phone = normalizePhone(phoneRaw);
  if (!isValidPhone(phone)) return { error: "رقم هاتف غير صحيح." };
  if (!(await withinRate(admin)))
    return { error: "محاولات كثيرة. انتظر قليلاً ثم حاول مجدداً." };

  const userId = await findUserId(admin, phone);
  if (userId) {
    const { data } = await admin
      .from("security_credentials")
      .select("question")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) return { question: data.question as string };
  }
  // غير مسجّل أو بلا سؤال: نعيد سؤالاً وهمياً ثابتاً (لا نكشف الحالة).
  return { question: decoyQuestion(phone) };
}

// الخطوة ٢: التحقق من الجواب وتعيين كلمة مرور جديدة. ردود موحّدة (لا تعداد).
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
  if (!(await withinRate(admin)))
    return { error: "محاولات كثيرة. انتظر قليلاً ثم حاول مجدداً." };

  // ردّ موحّد لكل الحالات التي لا يجب أن تكشف وجود/حالة الحساب.
  const GENERIC_WRONG = { error: "جواب سؤال الأمان غير صحيح." };

  const userId = await findUserId(admin, phone);
  if (!userId) return GENERIC_WRONG;

  const { data: status, error: rpcErr } = await admin.rpc(
    "check_security_answer",
    { p_user_id: userId, p_answer: answer },
  );
  if (rpcErr) return { error: "تعذّر التحقق. حاول لاحقاً." };
  if (status === "locked")
    return { error: "محاولات كثيرة خاطئة. انتظر ١٥ دقيقة ثم حاول مجدداً." };
  if (status !== "ok") return GENERIC_WRONG; // notset / wrong موحّدان

  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });
  if (error) return { error: "تعذّر تعيين كلمة المرور. حاول لاحقاً." };
  return { ok: true };
}
