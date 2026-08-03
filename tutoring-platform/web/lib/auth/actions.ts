"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone, isValidPhone, phoneToEmail } from "@/lib/auth/phone";

export type AuthState = { error?: string };

// ترجمة رسائل أخطاء Supabase الشائعة إلى العربية
function authError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "رقم الهاتف أو كلمة المرور غير صحيحة.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "هذا الرقم مسجّل مسبقاً — جرّب تسجيل الدخول.";
  if (m.includes("password should be at least"))
    return "كلمة المرور قصيرة جداً (٦ أحرف على الأقل).";
  return "صار خطأ غير متوقع. حاول مرة ثانية.";
}

// يحوّل ما أدخله المستخدم إلى بريد صالح لمصادقة Supabase:
// - إن احتوى "@" فهو بريد فعلي (خيار احتياطي للأدمن).
// - وإلا فهو رقم هاتف → بريد صناعي.
function toAuthEmail(identifier: string): string | null {
  if (identifier.includes("@")) return identifier;
  const phone = normalizePhone(identifier);
  if (!isValidPhone(phone)) return null;
  return phoneToEmail(phone);
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = createClient();
  if (!supabase) return { error: "اتصال Supabase غير مضبوط." };

  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!identifier || !password)
    return { error: "عبّي رقم الهاتف وكلمة المرور." };

  const email = toAuthEmail(identifier);
  if (!email) return { error: "رقم الهاتف غير صحيح." };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: authError(error.message) };

  redirect("/");
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = createClient();
  if (!supabase) return { error: "اتصال Supabase غير مضبوط." };

  const phoneRaw = String(formData.get("phone") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  // حاجز أمان: student أو teacher فقط — لا admin (والقاعدة تفرض نفس الشيء).
  const role =
    String(formData.get("role") ?? "student") === "teacher"
      ? "teacher"
      : "student";

  if (!fullName) return { error: "اكتب اسمك." };

  const phone = normalizePhone(phoneRaw);
  if (!isValidPhone(phone)) return { error: "رقم هاتف غير صحيح (مثال: 07701234567)." };
  if (password.length < 6) return { error: "كلمة المرور ٦ أحرف على الأقل." };

  const { error } = await supabase.auth.signUp({
    email: phoneToEmail(phone),
    password,
    options: { data: { role, full_name: fullName, phone } },
  });
  if (error) return { error: authError(error.message) };

  redirect("/");
}

export async function signout() {
  const supabase = createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}
