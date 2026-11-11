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

/**
 * رابط يوتيوب آمن للعرض: https ومن نطاقات يوتيوب فقط، وإلا null.
 * دفاع بالعمق عند العرض — حتى لو وصلت قيمة غير صالحة للقاعدة بطريق آخر.
 */
export function safeYouTubeUrl(raw: string | null | undefined): string | null {
  const safe = safeExternalUrl(raw);
  if (!safe) return null;
  try {
    const u = new URL(safe);
    if (u.protocol !== "https:") return null;
    const h = u.hostname.toLowerCase().replace(/^www\./, "");
    return h === "youtube.com" || h === "m.youtube.com" || h === "youtu.be"
      ? u.href
      : null;
  } catch {
    return null;
  }
}
