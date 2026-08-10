/**
 * نوع قاعدة البيانات المستخدَم مع عميل Supabase.
 *
 * هذا نوع مبدئي مبسّط يعرّف الـ enums المعروفة فقط، ويترك الجداول والدوال
 * فارغة مؤقتاً حتى لا نمنع الكتابة عليها قبل توليد الأنواع الكاملة.
 *
 * لتوليد الأنواع الكاملة تلقائياً من مشروع Supabase لاحقاً:
 *   npx supabase gen types typescript --project-id <PROJECT_REF> > src/types/database.ts
 *
 * (الـ backend مشترك مع تطبيق الويب — نفس المشروع والمخطط.)
 */
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: "student" | "teacher" | "admin";
      verification_status: "pending" | "approved" | "rejected";
      question_status: "open" | "closed";
      notification_status: "sent" | "read" | "answered";
    };
  };
};
