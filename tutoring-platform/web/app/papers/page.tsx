import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PapersBrowser, {
  type PSubject,
  type PPaper,
} from "@/components/study/PapersBrowser";

export const metadata: Metadata = { title: "الوزاريات — دليلي" };
export const dynamic = "force-dynamic";

export default async function PapersPage() {
  const supabase = createClient();
  if (!supabase) redirect("/login");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sp } = await supabase
    .from("student_profiles")
    .select("stage_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const stageId = sp?.stage_id ?? null;

  const [{ data: subjectRows }, paperRes] = await Promise.all([
    supabase.from("subjects").select("id, name").eq("active", true).order("name"),
    (async () => {
      let q = supabase
        .from("exam_papers")
        .select("id, title, year, subject_id, stage_id, file_path, stages(name)")
        .order("created_at", { ascending: false });
      // المرحلة المطابقة للطالب + المحتوى العام (stage_id null)
      if (stageId) q = q.or(`stage_id.eq.${stageId},stage_id.is.null`);
      return q;
    })(),
  ]);

  const subjects = (subjectRows as PSubject[]) ?? [];
  const papers: PPaper[] = (paperRes.data ?? []).map((p) => {
    const { data } = supabase.storage
      .from("study-resources")
      .getPublicUrl(p.file_path as string);
    return {
      id: p.id as string,
      title: p.title as string,
      year: (p.year as number | null) ?? null,
      subjectId: p.subject_id as string,
      stageName: (p as { stages?: { name?: string } | null }).stages?.name ?? null,
      url: data.publicUrl,
    };
  });

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-teal-dark">🏛️ الوزاريات والنماذج</h1>
        <Link href="/" className="text-sm text-ink-soft hover:text-teal-dark">
          ← الرئيسية
        </Link>
      </header>
      <PapersBrowser subjects={subjects} papers={papers} />
    </main>
  );
}
