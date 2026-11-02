import { requireAdmin } from "@/lib/admin/guard";
import FeaturedRow, { type FeaturedItem } from "@/components/admin/FeaturedRow";

export const dynamic = "force-dynamic";

type Row = {
  user_id: string;
  full_name: string;
  photo_url: string | null;
  featured_until: string | null;
  views_base: number;
  governorates: { name: string } | null;
};

export default async function AdminFeaturedPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  // المميّزون حالياً + نتائج البحث (من المدرّسين المقبولين).
  const nowIso = new Date().toISOString();
  const { data: current } = await supabase
    .from("teacher_profiles")
    .select("user_id, full_name, photo_url, featured_until, views_base, governorates(name)")
    .eq("verification_status", "approved")
    .gt("featured_until", nowIso)
    .order("featured_until", { ascending: true });

  let results: Row[] = [];
  if (query) {
    const { data } = await supabase
      .from("teacher_profiles")
      .select("user_id, full_name, photo_url, featured_until, views_base, governorates(name)")
      .eq("verification_status", "approved")
      .ilike("full_name", `%${query}%`)
      .order("full_name")
      .limit(30);
    results = (data ?? []) as unknown as Row[];
  }

  const toItem = (r: Row): FeaturedItem => ({
    user_id: r.user_id,
    full_name: r.full_name,
    photo_url: r.photo_url,
    governorate_name: r.governorates?.name ?? null,
    featured_until: r.featured_until,
    views_base: r.views_base ?? 0,
  });

  const currentItems = ((current ?? []) as unknown as Row[]).map(toItem);

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-ink">المدرّس المميّز 👑</h2>
        <p className="text-sm text-ink-soft">
          المدرّس المميّز يظهر أولاً في النتائج وبشارة ذهبية. استخدمها للباقات المدفوعة.
        </p>
      </div>

      {/* المميّزون حالياً */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-ink">
          المميّزون حالياً{" "}
          <span className="font-normal text-ink-soft">({currentItems.length})</span>
        </h3>
        {currentItems.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-5 text-center text-sm text-ink-soft">
            لا يوجد مدرّسون مميّزون حالياً.
          </p>
        ) : (
          currentItems.map((t) => <FeaturedRow key={t.user_id} t={t} />)
        )}
      </div>

      {/* بحث لتمييز مدرّس */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-ink">تمييز مدرّس</h3>
        <form method="get" className="flex gap-2">
          <input
            name="q"
            defaultValue={query}
            placeholder="اسم المدرّس…"
            className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-teal"
          />
          <button className="rounded-xl bg-teal px-5 py-2 text-sm font-bold text-white hover:bg-teal-dark">
            بحث
          </button>
        </form>

        {query &&
          (results.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-5 text-center text-sm text-ink-soft">
              لا يوجد مدرّس مطابق.
            </p>
          ) : (
            <div className="space-y-2">
              {results.map((r) => (
                <FeaturedRow key={r.user_id} t={toItem(r)} />
              ))}
            </div>
          ))}
      </div>
    </section>
  );
}
