import { requireAdmin } from "@/lib/admin/guard";
import TeacherReviewCard, {
  type ReviewTeacher,
} from "@/components/admin/TeacherReviewCard";

export const dynamic = "force-dynamic";

type Row = {
  user_id: string;
  full_name: string;
  phone: string | null;
  school: string | null;
  institute: string | null;
  contact_email: string | null;
  telegram_url: string | null;
  instagram_url: string | null;
  photo_url: string | null;
  id_document_url: string | null;
  governorates: { name: string } | null;
  teacher_subjects: { subjects: { name: string } | null }[];
  teacher_stages: { stages: { name: string } | null }[];
};

export default async function AdminTeachersPage() {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("teacher_profiles")
    .select(
      "user_id, full_name, phone, school, institute, contact_email, telegram_url, instagram_url, photo_url, id_document_url, governorates(name), teacher_subjects(subjects(name)), teacher_stages(stages(name))",
    )
    .eq("verification_status", "pending")
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as unknown as Row[];

  const teachers: ReviewTeacher[] = await Promise.all(
    rows.map(async (r) => {
      let idDocUrl: string | null = null;
      if (r.id_document_url) {
        const { data: signed } = await supabase.storage
          .from("id-documents")
          .createSignedUrl(r.id_document_url, 3600);
        idDocUrl = signed?.signedUrl ?? null;
      }
      return {
        user_id: r.user_id,
        full_name: r.full_name,
        phone: r.phone,
        school: r.school,
        institute: r.institute,
        contact_email: r.contact_email,
        telegram_url: r.telegram_url,
        instagram_url: r.instagram_url,
        photo_url: r.photo_url,
        governorate_name: r.governorates?.name ?? null,
        subjects: r.teacher_subjects
          .map((x) => x.subjects?.name)
          .filter((n): n is string => Boolean(n)),
        stages: r.teacher_stages
          .map((x) => x.stages?.name)
          .filter((n): n is string => Boolean(n)),
        idDocUrl,
      };
    }),
  );

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-ink">
        قيد المراجعة{" "}
        <span className="text-sm font-normal text-ink-soft">
          ({teachers.length})
        </span>
      </h2>

      {teachers.length === 0 ? (
        <p className="rounded-2xl border border-border bg-white p-6 text-center text-sm text-ink-soft">
          لا يوجد مدرّسون بانتظار المراجعة حالياً. 🎉
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {teachers.map((t) => (
            <TeacherReviewCard key={t.user_id} t={t} />
          ))}
        </div>
      )}
    </section>
  );
}
