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
    attachment_path: string | null;
    attachment_mime: string | null;
    attachment_name: string | null;
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
  attachment_path: string | null;
  attachment_mime: string | null;
  attachment_name: string | null;
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
      "id, status, question_id, questions(question_text, student_id, attachment_path, attachment_mime, attachment_name, subjects(name), stages(name), governorates(name))",
    )
    .eq("teacher_id", user.id)
    .order("sent_at", { ascending: false });
  const notifs = (nData as unknown as NotifRow[]) ?? [];

  const qIds = notifs.map((n) => n.question_id);
  let msgs: MsgRow[] = [];
  if (qIds.length > 0) {
    const { data: mData } = await supabase
      .from("messages")
      .select(
        "id, question_id, sender_id, body, attachment_path, attachment_mime, attachment_name",
      )
      .in("question_id", qIds)
      .order("sent_at", { ascending: true });
    msgs = (mData as unknown as MsgRow[]) ?? [];
  }

  // روابط موقّتة للمرفقات (RLS يقيّد الوصول لهذا المدرّس والطالب فقط)
  const signed = new Map<string, string>();
  await Promise.all(
    msgs
      .filter((m) => m.attachment_path)
      .map(async (m) => {
        const { data } = await supabase.storage
          .from("message-attachments")
          .createSignedUrl(m.attachment_path!, 3600);
        if (data?.signedUrl) signed.set(m.attachment_path!, data.signedUrl);
      }),
  );

  // روابط موقّتة لمرفقات الأسئلة
  const qSigned = new Map<string, string>();
  await Promise.all(
    notifs
      .filter((n) => n.questions?.attachment_path)
      .map(async (n) => {
        const p = n.questions!.attachment_path!;
        if (qSigned.has(p)) return;
        const { data } = await supabase.storage
          .from("question-attachments")
          .createSignedUrl(p, 3600);
        if (data?.signedUrl) qSigned.set(p, data.signedUrl);
      }),
  );

  const items: InboxItem[] = notifs.map((n) => {
    const q = n.questions;
    const studentId = q?.student_id ?? "";
    return {
      notificationId: n.id,
      status: n.status,
      questionId: n.question_id,
      studentId,
      questionText: q?.question_text ?? "",
      subjectName: q?.subjects?.name ?? "—",
      stageName: q?.stages?.name ?? "—",
      govName: q?.governorates?.name ?? "—",
      attachmentUrl: q?.attachment_path
        ? qSigned.get(q.attachment_path) ?? null
        : null,
      attachmentMime: q?.attachment_mime ?? null,
      attachmentName: q?.attachment_name ?? null,
      // RLS يعيد فقط رسائل هذا المدرّس (مرسِلاً أو مستقبِلاً)
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
          attachmentUrl: m.attachment_path
            ? signed.get(m.attachment_path) ?? null
            : null,
          attachmentMime: m.attachment_mime,
          attachmentName: m.attachment_name,
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
      <InboxView items={items} currentUserId={user.id} />
    </main>
  );
}
