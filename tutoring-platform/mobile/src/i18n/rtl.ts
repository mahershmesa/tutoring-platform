import { I18nManager } from "react-native";

/**
 * تفعيل اتجاه الكتابة من اليمين لليسار (RTL) لكامل التطبيق.
 *
 * يُستدعى مرة واحدة عند إقلاع التطبيق (في App.tsx).
 * ملاحظة مهمة على النظامين (iOS/Android): تغيير اتجاه I18nManager لا
 * يُطبَّق بالكامل إلا بعد إعادة تحميل التطبيق (reload)؛ لذلك نتحقق أولاً
 * إن كان الاتجاه مضبوطاً مسبقاً لتفادي إعادة تحميل غير ضرورية.
 *
 * ترجع الدالة true إذا كان RTL مُفعّلاً فعلاً بعد الاستدعاء.
 */
export function enableRTL(): boolean {
  I18nManager.allowRTL(true);

  if (!I18nManager.isRTL) {
    I18nManager.forceRTL(true);
  }

  return I18nManager.isRTL;
}

/** هل التطبيق حالياً باتجاه RTL؟ */
export const isRTL = (): boolean => I18nManager.isRTL;
