import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "إحصاءاتي — دليلي" };
export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  hint,
  accent = "teal",
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "teal" | "amber";
}) {
  return (
    <div
      className={
        "rounded-2xl border p-4 shadow-sm " +
        (accent === "amber"
          ? "border-amber/40 bg-amber-light"
          : "border-border bg-card")
      }
    >
      <p
        className={
          "text-3xl font-bold " +
          (accent === "amber" ? "text-amber" : "text-teal-dark")
        }
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-ink">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

export default async function StatsPage() {
  const supabase = createClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // لا بدّ أن يكون مدرّساً
  const { data: tp } = await supabase
    .from("teacher_profiles")
    .select("answered_count, featured_until, verification_status, views_base")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!tp) redirect("/profile");

  const now = Date.now();
  const since7 = new Date(now - 7 * 86400000).toISOString();

  const [totalViews, views7, ratings, questions] = await Promise.all([
    supabase
      .from("teacher_views")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", user.id),
    supabase
      .from("teacher_views")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", user.id)
      .gt("created_at", since7),
    supabase
      .from("teacher_ratings")
      .select("rating")
      .eq("teacher_id", user.id),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", user.id),
  ]);

  const ratingRows = (ratings.data ?? []) as { rating: number }[];
  const ratingCount = ratingRows.length;
  const avg =
    ratingCount > 0
      ? (
          ratingRows.reduce((s, r) => s + r.rating, 0) / ratingCount
        ).toFixed(1)
      : "—";

  const featuredActive =
    !!tp.featured_until && new Date(tp.featured_until).getTime() > now;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6" dir="rtl">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-teal-dark">📊 لوحة إحصاءاتي</h1>
        <Link
          href="/profile"
          className="text-sm text-ink-soft hover:text-teal-dark"
        >
          ← البروفايل
        </Link>
      </header>

      {tp.verification_status !== "approved" && (
        <div className="rounded-xl border border-amber bg-amber-light px-4 py-3 text-sm text-ink">
          حسابك قيد المراجعة — ستظهر إحصاءاتك بالكامل بعد التوثيق.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="مشاهدات ملفك"
          value={(totalViews.count ?? 0) + (tp.views_base ?? 0)}
          hint="إجمالي الزيارات"
        />
        <StatCard
          label="مشاهدات آخر ٧ أيام"
          value={views7.count ?? 0}
          hint="هذا الأسبوع"
        />
        <StatCard
          label="أجبت على طلاب"
          value={tp.answered_count ?? 0}
          hint="ردود مؤكّدة"
        />
        <StatCard
          label="أسئلة وصلتك"
          value={questions.count ?? 0}
          hint="إجمالي الإشعارات"
        />
        <StatCard
          label="متوسّط تقييمك"
          value={ratingCount > 0 ? `★ ${avg}` : "—"}
          hint={`${ratingCount} تقييم`}
          accent="amber"
        />
        <StatCard
          label="التمييز"
          value={featuredActive ? "مميّز 👑" : "عادي"}
          hint={
            featuredActive && tp.featured_until
              ? `حتى ${new Date(tp.featured_until).toLocaleDateString("ar")}`
              : "غير مفعّل"
          }
          accent={featuredActive ? "amber" : "teal"}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed text-ink-soft">
        💡 <strong className="text-ink">نصيحة:</strong> كلّما ردّيت على الطلاب
        بسرعة وجمعت تقييمات أعلى، ظهرت أعلى في النتائج ووصلك طلاب أكثر. وللظهور
        في المقدّمة بشارة ذهبية، اسأل الإدارة عن خدمة «المدرّس المميّز».
      </div>
    </main>
  );
}
