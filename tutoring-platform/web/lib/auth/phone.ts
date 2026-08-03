// تطبيع أرقام الهاتف العراقية إلى صيغة دولية موحّدة (بدون +) لتفادي التكرار،
// وبناء "بريد صناعي" داخلي حتى نستخدم مصادقة البريد+كلمة المرور في Supabase
// بدون أي بريد حقيقي ولا OTP.

export function normalizePhone(raw: string): string {
  let d = (raw || "").replace(/\D/g, ""); // أرقام فقط
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("964")) return d;
  if (d.startsWith("0")) return "964" + d.slice(1); // محلي 07xx → دولي
  return d ? "964" + d : "";
}

// رقم عراقي دولي = 964 + 10 أرقام = 13
export function isValidPhone(canonical: string): boolean {
  return /^964\d{9,10}$/.test(canonical);
}

export function phoneToEmail(canonicalPhone: string): string {
  return `p${canonicalPhone}@phone.dalili.local`;
}
