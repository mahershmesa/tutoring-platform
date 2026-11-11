import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validate";
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
};
type MsgRow = {
  id: string;
  question_id: string;
  sender_id: string;
  recipient_id: string | null;
  body: string;
  attachment_path: string | null;
  attachment_mime: string | null;
  attachment_name: string | null;
  // حالة المقروء (علاقة 1-إلى-1): كائن أو مصفوفة حسب PostgREST، أو null إن لم تُقرأ
  message_reads: { read_at: string } | { read_at: string }[] | null;
};

const isRead = (m: MsgRow) =>
  Array.isArray(m.message_reads) ? m.message_reads.length > 0 : Boolean(m.message_reads);

export default async function AskPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; q?: string }>;
}) {
  const sp = await searchParams;
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
    .select(
      "id, subject_id, question_text, created_at, attachment_path, attachment_mime, attachment_name",
    )
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });
  const questionRows = (qData ?? []) as {
    id: string;
    subject_id: string;
    question_text: string;
    attachment_path: string | null;
    attachment_mime: string | null;
    attachment_name: string | null;
  }[];
  const qIds = questionRows.map((q) => q.id);

  let notifs: NotifRow[] = [];
  let msgs: MsgRow[] = [];
  if (qIds.length > 0) {
    const [n, m] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, question_id, teacher_id, status")
        .in("question_id", qIds),
      supabase
        .from("messages")
        .select(
          "id, question_id, sender_id, recipient_id, body, attachment_path, attachment_mime, attachment_name, message_reads(read_at)",
        )
        .in("question_id", qIds)
        .order("sent_at", { ascending: true }),
    ]);
    notifs = (n.data as unknown as NotifRow[]) ?? [];
    msgs = (m.data as unknown as MsgRow[]) ?? [];
    if (m.error) {
      // احتياط: إن لم يكن جدول حالة المقروء موجوداً بعد (migration 42 لم تُطبَّق)
      // نجلب الرسائل بدونه حتى لا تختفي المحادثات — وتُعامل كلها كمقروءة.
      const { data: plain } = await supabase
        .from("messages")
        .select(
          "id, question_id, sender_id, recipient_id, body, attachment_path, attachment_mime, attachment_name",
        )
        .in("question_id", qIds)
        .order("sent_at", { ascending: true });
      msgs = ((plain ?? []) as unknown as MsgRow[]).map((r) => ({
        ...r,
        message_reads: { read_at: "" },
      }));
    }
  }

  // أسماء المدرّسين من الدليل العام (أعمدة عامة فقط). جدول teacher_profiles
  // نفسه غير مقروء للطالب (حماية بيانات المدرّسين)، فلا نضمّنه في الاستعلام.
  const teacherInfo = new Map<string, { name: string; answered: number }>();
  const teacherIds = Array.from(new Set(notifs.map((n) => n.teacher_id)));
  if (teacherIds.length > 0) {
    const { data: dir } = await supabase
      .from("teacher_directory")
      .select("user_id, full_name, answered_count")
      .in("user_id", teacherIds);
    (dir ?? []).forEach((d) =>
      teacherInfo.set(d.user_id as string, {
        name: (d.full_name as string) ?? "مدرّس",
        answered: (d.answered_count as number) ?? 0,
      }),
    );
  }

  // روابط موقّتة لمرفقات الرسائل (RLS يضمن وصول الطرفين فقط)
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
    questionRows
      .filter((q) => q.attachment_path)
      .map(async (q) => {
        const { data } = await supabase.storage
          .from("question-attachments")
          .createSignedUrl(q.attachment_path!, 3600);
        if (data?.signedUrl) qSigned.set(q.attachment_path!, data.signedUrl);
      }),
  );

  // تقييمات الطالب الحالية (لملء ويدجت التقييم مسبقاً)
  const { data: ratingRows } = await supabase
    .from("teacher_ratings")
    .select("teacher_id, rating, comment")
    .eq("student_id", user.id);
  const myRatings = new Map<string, { rating: number; comment: string | null }>();
  (ratingRows ?? []).forEach((r) =>
    myRatings.set(r.teacher_id as string, {
      rating: r.rating as number,
      comment: (r.comment as string | null) ?? null,
    }),
  );

  const questions: StudentQuestionVM[] = questionRows.map((q) => {
    const qNotifs = notifs.filter((n) => n.question_id === q.id);
    const teachers = qNotifs.map((n) => ({
      teacherId: n.teacher_id,
      teacherName: teacherInfo.get(n.teacher_id)?.name ?? "مدرّس",
      answeredCount: teacherInfo.get(n.teacher_id)?.answered ?? 0,
      status: n.status,
      // ردود هذا المدرّس التي لم يقرأها الطالب بعد
      unread: msgs.filter(
        (m) =>
          m.question_id === q.id &&
          m.sender_id === n.teacher_id &&
          m.recipient_id === user.id &&
          !isRead(m),
      ).length,
      myRating: myRatings.get(n.teacher_id)?.rating ?? null,
      myComment: myRatings.get(n.teacher_id)?.comment ?? null,
      // محادثة 1-إلى-1 فعلية: بين الطالب وهذا المدرّس تحديداً
      messages: msgs
        .filter(
          (m) =>
            m.question_id === q.id &&
            ((m.sender_id === n.teacher_id && m.recipient_id === user.id) ||
              (m.sender_id === user.id && m.recipient_id === n.teacher_id)),
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
    }));
    return {
      id: q.id,
      subjectId: q.subject_id,
      questionText: q.question_text,
      attachmentUrl: q.attachment_path
        ? qSigned.get(q.attachment_path) ?? null
        : null,
      attachmentMime: q.attachment_mime,
      attachmentName: q.attachment_name,
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

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/quiz"
          className="flex flex-col items-start gap-0.5 rounded-2xl border border-teal/30 bg-teal-light px-4 py-3 transition hover:border-teal"
        >
          <span className="text-sm font-bold text-teal-dark">📝 اختبر نفسك</span>
          <span className="text-xs text-ink-soft">أسئلة وتصحيح فوري</span>
        </Link>
        <Link
          href="/papers"
          className="flex flex-col items-start gap-0.5 rounded-2xl border border-teal/30 bg-teal-light px-4 py-3 transition hover:border-teal"
        >
          <span className="text-sm font-bold text-teal-dark">🏛️ الوزاريات</span>
          <span className="text-xs text-ink-soft">نماذج وأسئلة سابقة</span>
        </Link>
      </div>

      <AskFlow
        profileComplete={profileComplete}
        subjects={subjects}
        questions={questions}
        initialSubjectId={isUuid(sp.subject) ? sp.subject : null}
        focusQuestionId={isUuid(sp.q) ? sp.q : null}
      />
    </main>
  );
}
