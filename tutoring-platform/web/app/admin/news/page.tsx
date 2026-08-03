import { requireAdmin } from "@/lib/admin/guard";
import NewsManager, { type AdminNews } from "@/components/admin/NewsManager";

export const dynamic = "force-dynamic";

export default async function AdminNewsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("news")
    .select("id, image_url, caption, created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <h2 className="mb-4 text-lg font-bold text-ink">قسم الأخبار</h2>
      <NewsManager news={(data as AdminNews[]) ?? []} />
    </>
  );
}
