import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuizRunner, { type RunnerQuestion } from "@/components/study/QuizRunner";

export const metadata: Metadata = { title: "اختبار — دليلي" };
export const dynamic = "force-dynamic";

export default async function QuizRunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createClient();
  if (!supabase) redirect("/login");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, title, chapter, subject_id, subjects(name)")
    .eq("id", id)
    .maybeSingle();
  if (!quiz) notFound();

  // الأسئلة من العرض العام (بلا الإجابة الصحيحة)
  const { data: qRows } = await supabase
    .from("quiz_questions_public")
    .select("id, prompt, options, sort_order")
    .eq("quiz_id", id)
    .order("sort_order");

  const questions: RunnerQuestion[] = (qRows ?? []).map((q) => ({
    id: q.id as string,
    prompt: q.prompt as string,
    options: (q.options as string[]) ?? [],
  }));

  const subjectName =
    (quiz as { subjects?: { name?: string } | null }).subjects?.name ?? "";

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <Link href="/quiz" className="text-sm text-ink-soft hover:text-teal-dark">
          → كل الاختبارات
        </Link>
      </header>
      <div>
        <h1 className="text-xl font-bold text-teal-dark">{quiz.title as string}</h1>
        <p className="text-sm text-ink-soft">
          {subjectName} · {quiz.chapter as string} · {questions.length} سؤال
        </p>
      </div>
      {questions.length === 0 ? (
        <p className="text-sm text-ink-soft">لا توجد أسئلة في هذا الاختبار.</p>
      ) : (
        <QuizRunner quizId={id} subjectId={quiz.subject_id as string} questions={questions} />
      )}
    </main>
  );
}
