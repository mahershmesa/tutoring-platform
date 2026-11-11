import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MarkAllReadButton from "@/components/notifications/MarkAllReadButton";

export const metadata: Metadata = { title: "الإشعارات — دليلي" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  question_id: string;
  sender_id: string;
  body: string;
  attachment_name: string | null;
  sent_at: string;
  message_reads: { read_at: string } | { read_at: string }[] | null;
  questions: { subject_id: string; subjects: { name: string } | null } | null;
};

const isRead = (m: Row) =>
  Array.isArray(m.message_reads) ? m.message_reads.length > 0 : Boolean(m.message_reads);

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "الآن";
  if (s < 3600) return `قبل ${Math.floor(s / 60)} د`;
  if (s < 86400) return `قبل ${Math.floor(s / 3600)} س`;
  if (s < 86400 * 30) return `قبل ${Math.floor(s / 86400)} يوم`;
  return new Date(iso).toLocaleDateString("ar");
}

export default async function NotificationsPage() {
  const supabase = createClient();
  if (!supabase) redirect("/login");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // آخر الرسائل الواردة لي (RLS: رسائلي فقط) مع حالة المقروء والمادة
  const { data, error } = await supabase
    .from("messages")
    .select(
      "id, question_id, sender_id, body, attachment_name, sent_at, message_reads(read_at), questions(subject_id, subjects(name))",
    )
    .eq("recipient_id", user.id)
    .order("sent_at", { ascending: false })
    .limit(40);
  const rows = (error ? [] : ((data ?? []) as unknown as Row[]));

  // هل أنا مدرّس؟ (رسائلي الواردة حينها من طلاب → تُفتح من «الوارد»)
  const { data: myTeacher } = await supabase
    .from("teacher_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const iAmTeacher = Boolean(myTeacher);

  // أسماء المدرّسين المرسِلين من الدليل العام (لا نقرأ جدول البروفايلات مباشرةً)
  const names = new Map<string, { name: string; gender: string | null }>();
  const senderIds = Array.from(new Set(rows.map((r) => r.sender_id)));
  if (senderIds.length > 0) {
    const { data: dir } = await supabase
      .from("teacher_directory")
      .select("user_id, full_name, gender")
      .in("user_id", senderIds);
    (dir ?? []).forEach((d) =>
      names.set(d.user_id as string, {
        name: d.full_name as string,
        gender: (d.gender as string | null) ?? null,
      }),
    );
  }

  const unreadCount = rows.filter((r) => !isRead(r)).length;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-teal-dark">🔔 الإشعارات</h1>
        <Link href="/" className="text-sm text-ink-soft hover:text-teal-dark">
          ← الرئيسية
        </Link>
      </header>

      {unreadCount > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-teal/30 bg-teal-light px-4 py-3">
          <span className="text-sm font-medium text-teal-dark">
            عندك {unreadCount} {unreadCount === 1 ? "ردّ جديد" : "ردود جديدة"}
          </span>
          <MarkAllReadButton />
        </div>
      )}

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-ink-soft">
          لا توجد إشعارات بعد. لمّا يردّ عليك مدرّس، يظهر ردّه هنا.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const t = names.get(r.sender_id);
            const unread = !isRead(r);
            const subject = r.questions?.subjects?.name ?? "";
            const subjectId = r.questions?.subject_id ?? "";
            const who = t
              ? `${t.gender === "female" ? "الأستاذة" : "الأستاذ"} ${t.name}`
              : iAmTeacher
                ? "طالب"
                : "مدرّس";
            const href = t
              ? `/ask?subject=${subjectId}&q=${r.question_id}`
              : iAmTeacher
                ? "/inbox"
                : `/ask?subject=${subjectId}&q=${r.question_id}`;
            const snippet =
              r.body?.trim() ||
              (r.attachment_name ? "📎 أرسل مرفقاً" : "رسالة");
            return (
              <li key={r.id}>
                <Link
                  href={href}
                  className={
                    "flex items-start gap-3 rounded-2xl border p-4 transition hover:border-teal " +
                    (unread
                      ? "border-red-300 bg-card shadow-sm"
                      : "border-border bg-card/60")
                  }
                >
                  <span
                    className={
                      "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full " +
                      (unread ? "bg-red-500" : "bg-border")
                    }
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span
                        className={
                          "truncate text-sm " +
                          (unread ? "font-bold text-ink" : "font-medium text-ink-soft")
                        }
                      >
                        {t ? `ردّ عليك ${who}` : `رسالة من ${who}`}
                      </span>
                      <span className="shrink-0 text-[11px] text-ink-soft">
                        {timeAgo(r.sent_at)}
                      </span>
                    </span>
                    {subject && (
                      <span className="mt-0.5 block text-xs text-teal-dark">
                        مادة {subject}
                      </span>
                    )}
                    <span className="mt-1 block truncate text-sm text-ink-soft">
                      {snippet.length > 90 ? snippet.slice(0, 90) + "…" : snippet}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
