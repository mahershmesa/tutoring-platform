import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeachContentManager, {
  type TSubject,
  type TStage,
  type TPaper,
  type TQuiz,
} from "@/components/study/TeachContentManager";

export const metadata: Metadata = { title: "محتواي الدراسي — دليلي" };
export const dynamic = "force-dynamic";

export default async function TeachPage() {
  const supabase = createClient();
  if (!supabase) redirect("/login");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // لازم يكون مدرّساً معتمداً
  const { data: tp } = await supabase
    .from("teacher_profiles")
    .select("verification_status")
    .eq("user_id", user.id)
    .maybeSingle();
  const approved = tp?.verification_status === "approved";

  const [{ data: tsRows }, { data: stageRows }, { data: paperRows }, { data: quizRows }] =
    await Promise.all([
      supabase
        .from("teacher_subjects")
        .select("subject_id, subjects(id, name)")
        .eq("teacher_id", user.id),
      supabase.from("stages").select("id, name").order("sort_order"),
      supabase
        .from("exam_papers")
        .select("id, title, year, subject_id, stage_id, file_path, subjects(name), stages(name)")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("quizzes")
        .select("id, title, chapter, subject_id, stage_id, subjects(name), stages(name)")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  const subjects: TSubject[] = (tsRows ?? [])
    .map((r) => {
      const raw = (r as { subjects?: unknown }).subjects;
      const s = (Array.isArray(raw) ? raw[0] : raw) as
        | { id: string; name: string }
        | undefined
        | null;
      return s ? { id: s.id, name: s.name } : null;
    })
    .filter((s): s is TSubject => s !== null);
  const stages = (stageRows as TStage[]) ?? [];

  const papers: TPaper[] = (paperRows ?? []).map((p) => ({
    id: p.id as string,
    title: p.title as string,
    year: (p.year as number | null) ?? null,
    subjectName:
      (p as { subjects?: { name?: string } | null }).subjects?.name ?? "—",
    stageName: (p as { stages?: { name?: string } | null }).stages?.name ?? null,
  }));

  const quizzes: TQuiz[] = (quizRows ?? []).map((q) => ({
    id: q.id as string,
    title: q.title as string,
    chapter: q.chapter as string,
    subjectName:
      (q as { subjects?: { name?: string } | null }).subjects?.name ?? "—",
    stageName: (q as { stages?: { name?: string } | null }).stages?.name ?? null,
  }));

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-teal-dark">محتواي الدراسي</h1>
        <Link href="/profile" className="text-sm text-ink-soft hover:text-teal-dark">
          ← بروفايلي
        </Link>
      </header>

      {!approved ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-light px-5 py-4 text-sm text-ink">
          لرفع الوزاريات وإنشاء الاختبارات، لازم يكون حسابك <b>موثّقاً</b> من
          الإدارة أولاً. أكمل بياناتك وارفع إثبات هويتك من البروفايل.
        </div>
      ) : subjects.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-5 py-4 text-sm text-ink-soft">
          أضف موادك من البروفايل أولاً حتى تقدر ترفع محتوى لها.
        </div>
      ) : (
        <TeachContentManager
          subjects={subjects}
          stages={stages}
          papers={papers}
          quizzes={quizzes}
        />
      )}
    </main>
  );
}
