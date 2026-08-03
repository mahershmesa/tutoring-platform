import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const { supabase } = await requireAdmin();

  const [pending, approved, subjects] = await Promise.all([
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

  return (
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
  );
}
