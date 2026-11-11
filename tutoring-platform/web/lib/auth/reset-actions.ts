"use server";

import { headers } from "next/headers";
import { createHmac } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, isValidPhone, phoneToEmail } from "@/lib/auth/phone";
import { SECURITY_QUESTIONS } from "@/lib/auth/security-questions";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

async function clientIp(): Promise<string> {
  const h = await headers(); // Next 15: headers() صارت async
  const xff = h.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

// حدّ معدّل لكل IP (يفشل مغلقاً عند الخطأ).
async function withinRate(admin: Admin): Promise<boolean> {
  const { data, error } = await admin.rpc("check_reset_rate_limit", {
    p_ip: await clientIp(),
  });
  if (error) return false;
  return data === true;
}

// سؤال وهمي ثابت لكل رقم — يُعاد لغير المسجّل حتى لا يكشف الرد وجود الحساب.
// مشتقّ بـ HMAC بسرّ الخادم: لا يمكن لمهاجم حسابه مسبقاً (الخوارزمية علنية في
// الريبو)، وإلا لقارن السؤال المُعاد بالوهمي المتوقّع وعرف أن الحساب موجود.
function decoyQuestion(phone: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const digest = createHmac("sha256", secret).update("decoy:" + phone).digest();
  return SECURITY_QUESTIONS[digest.readUInt32BE(0) % SECURITY_QUESTIONS.length];
}

// يبحث عن معرّف المستخدم برقم هاتفه (عبر مفتاح الخدمة — يتجاوز RLS).
// المصدر الأساسي هوية المصادقة (البريد الصناعي المشتقّ من الرقم — لا يعدّله
// المستخدم). هاتف البروفايل قابل للتعديل من صاحبه، فلا نعتمده إلا احتياطاً
// للحسابات القديمة التي لا تملك هوية هاتفية.
async function findUserId(admin: Admin, phone: string): Promise<string | null> {
  const { data: byAuth, error: lookupErr } = await admin.rpc("reset_lookup_user", {
    p_email: phoneToEmail(phone),
  });
  if (!lookupErr && typeof byAuth === "string" && byAuth) return byAuth;

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

  if (typeof phoneRaw !== "string" || phoneRaw.length > 40)
    return { error: "رقم هاتف غير صحيح." };
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

  if (
    typeof phoneRaw !== "string" ||
    typeof answer !== "string" ||
    typeof newPassword !== "string" ||
    phoneRaw.length > 40 ||
    answer.length > 200
  )
    return { error: "بيانات غير صالحة." };
  const phone = normalizePhone(phoneRaw);
  if (!isValidPhone(phone)) return { error: "رقم هاتف غير صحيح." };
  if (newPassword.length < 8) return { error: "كلمة المرور ٨ أحرف على الأقل." };
  if (newPassword.length > 72)
    return { error: "كلمة المرور طويلة جداً (٧٢ حرفاً كحدّ أقصى)." };
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
