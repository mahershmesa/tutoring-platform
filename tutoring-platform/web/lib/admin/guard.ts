import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ServerClient = NonNullable<ReturnType<typeof createClient>>;

/** يتحقق أن المستخدم إداري نشط (الدور active — المُوقَف يفقد صلاحيته). */
export async function isAdmin(
  supabase: ServerClient,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("active")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return Boolean(data?.active);
}

/** مدير أساسي (super)؟ يملك إدارة المدراء. */
export async function isSuperAdmin(
  supabase: ServerClient,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("super, active")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return Boolean(data?.super && data?.active);
}

/** حارس صفحات إدارة المدراء: يتطلّب مديراً أساسياً. */
export async function requireSuperAdmin(): Promise<{
  supabase: ServerClient;
  userId: string;
}> {
  const { supabase, userId } = await requireAdmin();
  if (!(await isSuperAdmin(supabase, userId))) redirect("/admin");
  return { supabase, userId };
}

/**
 * حارس الخادم للوحة الإدارة: يعيد supabase + user إن كان المستخدم إدارياً،
 * وإلا يحوّله (زائر → /login، مستخدم عادي → الرئيسية).
 * ملاحظة: هذا طبقة ثانية؛ الحاجز الحقيقي هو RLS في القاعدة.
 */
export async function requireAdmin(): Promise<{
  supabase: ServerClient;
  userId: string;
}> {
  const supabase = createClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await isAdmin(supabase, user.id))) redirect("/");

  return { supabase, userId: user.id };
}
