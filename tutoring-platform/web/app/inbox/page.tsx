import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InboxView, { type InboxItem } from "@/components/qa/InboxView";

export const metadata: Metadata = { title: "الوارد — دليلي" };
export const dynamic = "force-dynamic";

type NotifRow = {
  id: string;
  status: "sent" | "read" | "answered";
  question_id: string;
  questions: {
    question_text: string;
    student_id: string;
    subjects: { name: string } | null;
    stages: { name: string } | null;
    governorates: { name: string } | null;
  } | null;
};
type MsgRow = {
  id: string;
  question_id: string;
  sender_id: string;
  body: string;
};

export default async function InboxPage() {
  const supabase = createClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: nData } = await supabase
    .from("notifications")
    .select(
      "id, status, question_id, questions(question_text, student_id, subjects(name), stages(name), governorates(name))",
    )
    .eq("teacher_id", user.id)
    .order("sent_at", { ascending: false });
  const notifs = (nData as unknown as NotifRow[]) ?? [];

  const qIds = notifs.map((n) => n.question_id);
  let msgs: MsgRow[] = [];
  if (qIds.length > 0) {
    const { data: mData } = await supabase
      .from("messages")
      .select("id, question_id, sender_id, body")
      .in("question_id", qIds)
      .order("sent_at", { ascending: true });
    msgs = (mData as unknown as MsgRow[]) ?? [];
  }

  const items: InboxItem[] = notifs.map((n) => {
    const q = n.questions;
    const studentId = q?.student_id ?? "";
    return {
      notificationId: n.id,
      status: n.status,
      questionId: n.question_id,
      questionText: q?.question_text ?? "",
      subjectName: q?.subjects?.name ?? "—",
      stageName: q?.stages?.name ?? "—",
      govName: q?.governorates?.name ?? "—",
      // عرض 1-إلى-1: رسائل الطالب + رسائلي فقط
      messages: msgs
        .filter(
          (m) =>
            m.question_id === n.question_id &&
            (m.sender_id === user.id || m.sender_id === studentId),
        )
        .map((m) => ({
          id: m.id,
          fromMe: m.sender_id === user.id,
          body: m.body,
        })),
    };
  });

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-teal-dark">الوارد</h1>
        <Link href="/" className="text-sm text-ink-soft hover:text-teal-dark">
          ← الرئيسية
        </Link>
      </header>
      <InboxView items={items} />
    </main>
  );
}
