// تطبيع أرقام الهاتف العراقية إلى صيغة دولية موحّدة (بدون +) لتفادي التكرار،
// وبناء "بريد صناعي" داخلي حتى نستخدم مصادقة البريد+كلمة المرور في Supabase
// بدون أي بريد حقيقي ولا OTP.

export function normalizePhone(raw: string): string {
  let d = (raw || "").replace(/\D/g, ""); // أرقام فقط
  if (d.startsWith("00")) d = d.slice(2);
  // نوحّد إلى صيغة دولية تبدأ بـ 964 بلا صفر زائد
  if (d.startsWith("964")) d = "964" + d.slice(3).replace(/^0+/, "");
  else if (d.startsWith("0")) d = "964" + d.replace(/^0+/, "");
  else if (d) d = "964" + d;
  return d;
}

// رقم عراقي دولي = 964 + 10 أرقام = 13
export function isValidPhone(canonical: string): boolean {
  return /^964\d{9,10}$/.test(canonical);
}

// نطاق عادي مقبول من Supabase (نتجنّب النطاقات المحجوزة مثل .local).
// لا يُرسَل أي بريد فعلاً — هو معرّف داخلي فقط.
export function phoneToEmail(canonicalPhone: string): string {
  return `p${canonicalPhone}@dalili.app`;
}
