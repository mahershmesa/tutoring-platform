import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const { supabase } = await requireAdmin();

  const [pending, approved, subjects, students, questions] = await Promise.all([
    supabase
      .from("teacher_profiles")
      .select("*", { count: "exact", head: true })
      .eq("verification_status", "pending"),
    supabase
      .from("teacher_profiles")
      .select("*", { count: "exact", head: true })
      .eq("verification_status", "approved"),
    supabase
      .from("subjects")
      .select("*", { count: "exact", head: true })
      .eq("active", true),
    supabase
      .from("student_profiles")
      .select("*", { count: "exact", head: true }),
    supabase.from("questions").select("*", { count: "exact", head: true }),
  ]);

  const cards = [
    {
      label: "مدرّسون قيد المراجعة",
      value: pending.count ?? 0,
      href: "/admin/teachers",
      highlight: (pending.count ?? 0) > 0,
    },
    {
      label: "مدرّسون موثّقون",
      value: approved.count ?? 0,
      href: "/admin/teachers",
      highlight: false,
    },
    {
      label: "مواد مفعّلة",
      value: subjects.count ?? 0,
      href: "/admin/subjects",
      highlight: false,
    },
  ];

  const growth = [
    { label: "طلاب", value: students.count ?? 0 },
    { label: "مدرّسون موثّقون", value: approved.count ?? 0 },
    { label: "أسئلة", value: questions.count ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={
              "rounded-2xl border p-5 shadow-sm transition hover:border-teal " +
              (c.highlight
                ? "border-amber bg-amber-light"
                : "border-border bg-white")
            }
          >
            <p className="text-3xl font-bold text-teal-dark">{c.value}</p>
            <p className="mt-1 text-sm text-ink-soft">{c.label}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-ink">مؤشّرات النمو</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          {growth.map((g) => (
            <div key={g.label}>
              <p className="text-2xl font-bold text-ink">{g.value}</p>
              <p className="text-xs text-ink-soft">{g.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-ink-soft">
          لمراقبة حدود الخطة المجانية: راجع أسبوعياً لوحة{" "}
          <strong>Supabase → Reports/Usage</strong> (خصوصاً <strong>التخزين</strong>)
          ولوحة <strong>Vercel → Usage</strong> (النطاق الترددي). خطّط للترقية إلى
          Supabase Pro قبل الاقتراب من الحد.
        </p>
      </section>
    </div>
  );
}
