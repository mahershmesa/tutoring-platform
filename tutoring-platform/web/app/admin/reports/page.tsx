import { requireAdmin } from "@/lib/admin/guard";
import ReportRow, { type ReportItem } from "@/components/admin/ReportRow";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  context_type: string | null;
  created_at: string;
};

export default async function AdminReportsPage() {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("reports")
    .select("id, reporter_id, reported_id, reason, context_type, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as Row[];

  // حلّ الأسماء وحالة الحظر للأطراف المذكورة
  const ids = Array.from(
    new Set(rows.flatMap((r) => [r.reporter_id, r.reported_id])),
  );

  const names = new Map<string, string>();
  if (ids.length) {
    const [{ data: tps }, { data: sps }] = await Promise.all([
      supabase.from("teacher_profiles").select("user_id, full_name").in("user_id", ids),
      supabase.from("student_profiles").select("user_id, full_name").in("user_id", ids),
    ]);
    (tps ?? []).forEach((t: { user_id: string; full_name: string | null }) => {
      if (t.full_name) names.set(t.user_id, t.full_name);
    });
    (sps ?? []).forEach((s: { user_id: string; full_name: string | null }) => {
      if (s.full_name && !names.has(s.user_id)) names.set(s.user_id, s.full_name);
    });
  }

  const reportedIds = Array.from(new Set(rows.map((r) => r.reported_id)));
  const bannedSet = new Set<string>();
  if (reportedIds.length) {
    const { data: statuses } = await supabase
      .from("account_status")
      .select("user_id, banned")
      .in("user_id", reportedIds);
    (statuses ?? []).forEach((s: { user_id: string; banned: boolean }) => {
      if (s.banned) bannedSet.add(s.user_id);
    });
  }

  const shortId = (id: string) => `مستخدم ${id.slice(0, 6)}`;

  const items: ReportItem[] = rows.map((r) => ({
    id: r.id,
    reported_id: r.reported_id,
    reporter_name: names.get(r.reporter_id) ?? shortId(r.reporter_id),
    reported_name: names.get(r.reported_id) ?? shortId(r.reported_id),
    reason: r.reason,
    context_type: r.context_type,
    created_at: r.created_at,
    reported_banned: bannedSet.has(r.reported_id),
  }));

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-ink">
        البلاغات المفتوحة{" "}
        <span className="text-sm font-normal text-ink-soft">
          ({items.length})
        </span>
      </h2>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-ink-soft">
          لا توجد بلاغات مفتوحة حالياً. 🎉
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <ReportRow key={r.id} r={r} />
          ))}
        </div>
      )}
    </section>
  );
}
