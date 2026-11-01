import { requireAdmin } from "@/lib/admin/guard";
import AnnouncementComposer from "@/components/admin/AnnouncementComposer";
import AnnouncementRow, { type AnnItem } from "@/components/admin/AnnouncementRow";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  const { supabase } = await requireAdmin();

  // الأدمن يقرأ كل التبليغات (RLS يسمح له — للإدارة)
  const { data } = await supabase
    .from("announcements")
    .select("id, audience, kind, title, body, active, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const items = (data ?? []) as AnnItem[];

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-ink">التبليغات</h2>
        <p className="text-sm text-ink-soft">
          يصل التبليغ كإشعار فوري (push) وكبانر داخل التطبيق للجمهور المحدّد.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <AnnouncementComposer
          kind="announcement"
          label="تبليغ للطلاب"
          hint="يصل كل الطلاب."
          fixedAudience="students"
        />
        <AnnouncementComposer
          kind="announcement"
          label="تبليغ للأساتذة"
          hint="يصل كل الأساتذة."
          fixedAudience="teachers"
        />
        <AnnouncementComposer
          kind="tip"
          label="نصيحة اليوم"
          hint="اختر الجمهور."
          fixedAudience="all"
          allowAudienceChoice
          accent="amber"
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-ink">
          التبليغات المُرسَلة{" "}
          <span className="font-normal text-ink-soft">({items.length})</span>
        </h3>
        {items.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-ink-soft">
            لم تُرسل أي تبليغات بعد.
          </p>
        ) : (
          items.map((a) => <AnnouncementRow key={a.id} a={a} />)
        )}
      </div>
    </section>
  );
}
