import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import RatingModRow, { type RatingItem } from "@/components/admin/RatingModRow";

export const dynamic = "force-dynamic";

export default async function AdminTeacherRatings({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { id } = await params;

  const [{ data: teacher }, { data: ratings }] = await Promise.all([
    supabase
      .from("teacher_profiles")
      .select("full_name, photo_url")
      .eq("user_id", id)
      .maybeSingle(),
    supabase
      .from("teacher_ratings")
      .select("student_id, teacher_id, rating, comment, created_at")
      .eq("teacher_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const items = (ratings ?? []) as RatingItem[];
  const avg =
    items.length > 0
      ? (items.reduce((s, r) => s + r.rating, 0) / items.length).toFixed(1)
      : "0";

  return (
    <section className="space-y-4">
      <Link
        href="/admin/ratings"
        className="text-sm text-ink-soft hover:text-teal-dark"
      >
        ← بحث التقييمات
      </Link>

      <div className="flex items-center gap-3">
        {teacher?.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={teacher.photo_url}
            alt={teacher.full_name ?? ""}
            className="h-12 w-12 rounded-full border border-border object-cover"
          />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal text-lg font-bold text-white">
            {teacher?.full_name?.trim().charAt(0) || "؟"}
          </span>
        )}
        <div>
          <h2 className="text-lg font-bold text-ink">
            {teacher?.full_name ?? "مدرّس"}
          </h2>
          <p className="text-xs text-ink-soft">
            {items.length} تقييم · متوسّط ★ {avg}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-ink-soft">
          لا توجد تقييمات لهذا المدرّس.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => (
            <RatingModRow key={r.student_id} r={r} />
          ))}
        </ul>
      )}
    </section>
  );
}
