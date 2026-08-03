/**
 * يعقّم رابطاً يزوّده المستخدم قبل استخدامه في href.
 * يسمح فقط بـ http/https (يمنع javascript:, data:, vbscript: ... إلخ التي
 * قد تُنفَّذ كسكربت عند الضغط — ثغرة XSS مخزّنة).
 * يرجّع الرابط الآمن أو null.
 */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim();
  try {
    // يقبل الروابط المطلقة فقط بمخطط آمن
    const u = new URL(v);
    if (u.protocol === "http:" || u.protocol === "https:") return u.href;
    return null;
  } catch {
    // ليس رابطاً مطلقاً صالحاً — نرفضه (لا نخمّن مخططاً)
    return null;
  }
}
