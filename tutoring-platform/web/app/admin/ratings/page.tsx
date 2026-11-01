import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

type Row = {
  user_id: string;
  full_name: string;
  photo_url: string | null;
  governorates: { name: string } | null;
};

export default async function AdminRatingsSearch({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  let rows: Row[] = [];
  if (query) {
    const { data } = await supabase
      .from("teacher_profiles")
      .select("user_id, full_name, photo_url, governorates(name)")
      .eq("verification_status", "approved")
      .ilike("full_name", `%${query}%`)
      .order("full_name")
      .limit(30);
    rows = (data ?? []) as unknown as Row[];
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-ink">إشراف التقييمات</h2>
      <p className="text-sm text-ink-soft">
        ابحث عن مدرّس لعرض تقييماته وتعديلها أو حذفها.
      </p>

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

      {query && (
        <div className="space-y-2">
          {rows.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-ink-soft">
              لا يوجد مدرّس مطابق.
            </p>
          ) : (
            rows.map((r) => (
              <Link
                key={r.user_id}
                href={`/admin/ratings/${r.user_id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition hover:border-teal"
              >
                {r.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.photo_url}
                    alt={r.full_name}
                    className="h-11 w-11 rounded-full border border-border object-cover"
                  />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal text-sm font-bold text-white">
                    {r.full_name?.trim().charAt(0) || "؟"}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">
                    {r.full_name}
                  </p>
                  <p className="truncate text-xs text-ink-soft">
                    {r.governorates?.name ?? "—"}
                  </p>
                </div>
                <span className="mr-auto text-ink-soft">←</span>
              </Link>
            ))
          )}
        </div>
      )}
    </section>
  );
}
