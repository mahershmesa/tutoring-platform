import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuizBrowser, {
  type QSubject,
  type QQuiz,
} from "@/components/study/QuizBrowser";

export const metadata: Metadata = { title: "اختبر نفسك — دليلي" };
export const dynamic = "force-dynamic";

export default async function QuizListPage() {
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

  const [{ data: subjectRows }, quizRes] = await Promise.all([
    supabase.from("subjects").select("id, name").eq("active", true).order("name"),
    (async () => {
      let q = supabase
        .from("quizzes")
        .select("id, title, chapter, subject_id, stage_id")
        .order("created_at", { ascending: false });
      if (stageId) q = q.or(`stage_id.eq.${stageId},stage_id.is.null`);
      return q;
    })(),
  ]);

  const subjects = (subjectRows as QSubject[]) ?? [];
  const quizzes: QQuiz[] = (quizRes.data ?? []).map((q) => ({
    id: q.id as string,
    title: q.title as string,
    chapter: q.chapter as string,
    subjectId: q.subject_id as string,
  }));

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-teal-dark">📝 اختبر نفسك</h1>
        <Link href="/" className="text-sm text-ink-soft hover:text-teal-dark">
          ← الرئيسية
        </Link>
      </header>
      <QuizBrowser subjects={subjects} quizzes={quizzes} />
    </main>
  );
}
