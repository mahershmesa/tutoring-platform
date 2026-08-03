import { requireAdmin } from "@/lib/admin/guard";
import SubjectManager, {
  type AdminSubject,
} from "@/components/admin/SubjectManager";

export const dynamic = "force-dynamic";

export default async function AdminSubjectsPage() {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("subjects")
    .select("id, name, active")
    .order("name");

  return (
    <>
      <h2 className="mb-4 text-lg font-bold text-ink">إدارة المواد</h2>
      <SubjectManager subjects={(data as AdminSubject[]) ?? []} />
    </>
  );
}
