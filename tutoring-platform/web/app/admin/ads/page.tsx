import { requireAdmin } from "@/lib/admin/guard";
import AdsManager, { type AdminAd } from "@/components/admin/AdsManager";

export const dynamic = "force-dynamic";

export default async function AdminAdsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("ads")
    .select("id, image_url, caption, sort_order, active")
    .order("sort_order", { ascending: true });

  return (
    <>
      <h2 className="mb-4 text-lg font-bold text-ink">لوحة الإعلانات</h2>
      <AdsManager ads={(data as AdminAd[]) ?? []} />
    </>
  );
}
