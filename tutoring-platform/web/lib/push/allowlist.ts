// قائمة السماح لنقاط خدمات الدفع — وحدة عادية مشتركة بين فعل الاشتراك ومسار
// الإرسال (دفاع بالعمق مع تريغر القاعدة). تقبل فقط مضيفات خدمات الدفع المعروفة
// وتمنع SSRF عبر endpoint مُلفَّق.
export function isAllowedPushEndpoint(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    return (
      h === "fcm.googleapis.com" ||
      h === "web.push.apple.com" ||
      h.endsWith(".push.apple.com") ||
      h.endsWith(".push.services.mozilla.com") ||
      h.endsWith(".notify.windows.com")
    );
  } catch {
    return false;
  }
}
