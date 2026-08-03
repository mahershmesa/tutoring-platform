import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AskFlow, {
  type StudentQuestionVM,
  type SubjectVM,
} from "@/components/qa/AskFlow";

export const metadata: Metadata = { title: "اسأل — دليلي" };
export const dynamic = "force-dynamic";

type NotifRow = {
  id: string;
  question_id: string;
  teacher_id: string;
  status: "sent" | "read" | "answered";
  teacher_profiles: { full_name: string; answered_count: number } | null;
};
type MsgRow = {
  id: string;
  question_id: string;
  sender_id: string;
  body: string;
};

export default async function AskPage() {
  const supabase = createClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("student_profiles")
    .select("governorate_id, stage_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const profileComplete = Boolean(
    profile?.governorate_id && profile?.stage_id,
  );

  const { data: subjectsData } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("active", true)
    .order("name");
  const subjects = (subjectsData as SubjectVM[]) ?? [];

  const { data: qData } = await supabase
    .from("questions")
    .select("id, subject_id, question_text, created_at")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });
  const questionRows = qData ?? [];
  const qIds = questionRows.map((q) => q.id);

  let notifs: NotifRow[] = [];
  let msgs: MsgRow[] = [];
  if (qIds.length > 0) {
    const [n, m] = await Promise.all([
      supabase
        .from("notifications")
        .select(
          "id, question_id, teacher_id, status, teacher_profiles(full_name, answered_count)",
        )
        .in("question_id", qIds),
      supabase
        .from("messages")
        .select("id, question_id, sender_id, body")
        .in("question_id", qIds)
        .order("sent_at", { ascending: true }),
    ]);
    notifs = (n.data as unknown as NotifRow[]) ?? [];
    msgs = (m.data as unknown as MsgRow[]) ?? [];
  }

  const questions: StudentQuestionVM[] = questionRows.map((q) => {
    const qNotifs = notifs.filter((n) => n.question_id === q.id);
    const teachers = qNotifs.map((n) => ({
      teacherId: n.teacher_id,
      teacherName: n.teacher_profiles?.full_name ?? "مدرّس",
      answeredCount: n.teacher_profiles?.answered_count ?? 0,
      status: n.status,
      messages: msgs
        .filter(
          (m) =>
            m.question_id === q.id &&
            (m.sender_id === n.teacher_id || m.sender_id === user.id),
        )
        .map((m) => ({
          id: m.id,
          fromMe: m.sender_id === user.id,
          body: m.body,
        })),
    }));
    return {
      id: q.id,
      subjectId: q.subject_id,
      questionText: q.question_text,
      teachers,
    };
  });

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-teal-dark">اسأل مدرّساً</h1>
        <Link href="/" className="text-sm text-ink-soft hover:text-teal-dark">
          ← الرئيسية
        </Link>
      </header>

      <AskFlow
        profileComplete={profileComplete}
        subjects={subjects}
        questions={questions}
      />
    </main>
  );
}
