"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone, isValidPhone, phoneToEmail } from "@/lib/auth/phone";
import { authError } from "@/lib/auth/errors";

export type AuthState = { error?: string };

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
  if (identifier.length > 200 || password.length > 200)
    return { error: "رقم الهاتف أو كلمة المرور غير صحيحة." };

  const email = toAuthEmail(identifier);
  if (!email) return { error: "رقم الهاتف غير صحيح." };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: authError(error.message) };

  redirect("/");
}

export async function signout() {
  const supabase = createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}
