"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string };

// ترجمة رسائل أخطاء Supabase الشائعة إلى العربية
function authError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "البريد أو كلمة المرور غير صحيحة.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "هذا البريد مسجّل مسبقاً — جرّب تسجيل الدخول.";
  if (m.includes("password should be at least"))
    return "كلمة المرور قصيرة جداً (٦ أحرف على الأقل).";
  if (m.includes("unable to validate email") || m.includes("invalid email"))
    return "صيغة البريد غير صحيحة.";
  if (m.includes("email not confirmed"))
    return "لازم تأكيد البريد أولاً قبل الدخول.";
  return "صار خطأ غير متوقع. حاول مرة ثانية.";
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = createClient();
  if (!supabase) return { error: "اتصال Supabase غير مضبوط." };

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "عبّي البريد وكلمة المرور." };

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

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  // حاجز أمان: نقبل student أو teacher فقط — لا admin إطلاقاً.
  // (التريغر في القاعدة يفرض نفس القاعدة كطبقة ثانية.)
  const role = String(formData.get("role") ?? "student") === "teacher"
    ? "teacher"
    : "student";

  if (!fullName) return { error: "اكتب اسمك." };
  if (!email || !password) return { error: "عبّي البريد وكلمة المرور." };
  if (password.length < 6)
    return { error: "كلمة المرور ٦ أحرف على الأقل." };

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role, full_name: fullName } },
  });
  if (error) return { error: authError(error.message) };

  // مع تعطيل تأكيد البريد: signUp يُنشئ الجلسة مباشرةً.
  // مع تفعيله: تُنشأ الجلسة بعد ضغط رابط التأكيد (لا يضر التوجيه هنا).
  redirect("/");
}

export async function signout() {
  const supabase = createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}
