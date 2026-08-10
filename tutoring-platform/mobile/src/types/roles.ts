/**
 * أدوار المستخدمين في المنصة — تطابق نوع `user_role` (enum) في قاعدة البيانات.
 * مستخدم واحد قد يملك أكثر من دور (مثلاً معلّم + أدمن).
 */
export type UserRole = "student" | "teacher" | "admin";

export const USER_ROLES: readonly UserRole[] = [
  "student",
  "teacher",
  "admin",
] as const;

/** التسميات العربية المعروضة للمستخدم لكل دور. */
export const ROLE_LABELS_AR: Record<UserRole, string> = {
  student: "طالب",
  teacher: "معلّم",
  admin: "مشرف",
};

/** حالة توثيق حساب المعلّم — تطابق نوع `verification_status` في القاعدة. */
export type VerificationStatus = "pending" | "approved" | "rejected";
