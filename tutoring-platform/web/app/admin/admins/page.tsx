import { requireAdmin } from "@/lib/admin/guard";
import AdminManager, { type AdminRow } from "@/components/admin/AdminManager";

export const dynamic = "force-dynamic";

export default async function AdminAdminsPage() {
  const { supabase, userId } = await requireAdmin();

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  const ids = (roleRows ?? []).map((r) => r.user_id as string);

  // أسماء/هواتف المدراء من البروفايلات (مدرّس أو طالب)
  const nameMap = new Map<string, { name: string; phone: string | null }>();
  if (ids.length > 0) {
    const [tp, sp] = await Promise.all([
      supabase.from("teacher_profiles").select("user_id, full_name, phone").in("user_id", ids),
      supabase.from("student_profiles").select("user_id, full_name, phone").in("user_id", ids),
    ]);
    (tp.data ?? []).forEach((r) =>
      nameMap.set(r.user_id as string, {
        name: (r.full_name as string) ?? "—",
        phone: (r.phone as string) ?? null,
      }),
    );
    (sp.data ?? []).forEach((r) => {
      if (!nameMap.has(r.user_id as string))
        nameMap.set(r.user_id as string, {
          name: (r.full_name as string) ?? "—",
          phone: (r.phone as string) ?? null,
        });
    });
  }

  const admins: AdminRow[] = ids.map((id) => ({
    userId: id,
    name: nameMap.get(id)?.name ?? "—",
    phone: nameMap.get(id)?.phone ?? null,
    isSelf: id === userId,
  }));

  return (
    <>
      <h2 className="mb-4 text-lg font-bold text-ink">إدارة المدراء</h2>
      <AdminManager admins={admins} />
    </>
  );
}
