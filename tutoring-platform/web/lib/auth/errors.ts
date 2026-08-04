// ترجمة رسائل أخطاء Supabase Auth الشائعة إلى العربية (تُستخدم من الخادم والعميل).
export function authError(message: string): string {
  const m = (message || "").toLowerCase();
  if (m.includes("invalid login credentials"))
    return "رقم الهاتف أو كلمة المرور غير صحيحة.";
  if (
    m.includes("already registered") ||
    m.includes("already been registered") ||
    m.includes("user already exists")
  )
    return "هذا الرقم مسجّل مسبقاً — جرّب تسجيل الدخول.";
  if (m.includes("password should be at least") || m.includes("password"))
    return "كلمة المرور قصيرة جداً (٨ أحرف على الأقل).";
  if (m.includes("email") && (m.includes("invalid") || m.includes("valid")))
    return "تعذّر إنشاء الحساب — صيغة الحساب الداخلي مرفوضة من الخادم.";
  if (m.includes("signups not allowed") || m.includes("signup is disabled"))
    return "التسجيل معطّل حالياً من إعدادات Supabase.";
  return "تعذّر: " + message;
}
