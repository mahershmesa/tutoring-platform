"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendMessage, markNotificationRead } from "@/lib/qa/actions";
import { uploadMessageAttachment } from "@/lib/supabase/upload";
import MessageBubble, { type MessageVM } from "@/components/qa/MessageBubble";

export type InboxItem = {
  notificationId: string;
  status: "sent" | "read" | "answered";
  questionId: string;
  studentId: string;
  questionText: string;
  subjectName: string;
  stageName: string;
  govName: string;
  messages: MessageVM[];
};

const statusBadge = {
  sent: { text: "جديد", cls: "bg-amber-light text-amber" },
  read: { text: "مقروء", cls: "bg-surface text-ink-soft" },
  answered: { text: "تم الرد ✓", cls: "bg-teal-light text-teal-dark" },
} as const;

export default function InboxView({
  items,
  currentUserId,
}: {
  items: InboxItem[];
  currentUserId: string;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-white p-6 text-center text-sm text-ink-soft">
        ما وصلك أي سؤال بعد. تأكّد أن حسابك موثّق وأن موادك ومراحلك ومحافظتك
        محدّثة في البروفايل.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <InboxThread key={it.notificationId} it={it} teacherId={currentUserId} />
      ))}
    </div>
  );
}

function InboxThread({ it, teacherId }: { it: InboxItem; teacherId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const badge = statusBadge[it.status];

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && it.status === "sent") {
      await markNotificationRead(it.notificationId);
      router.refresh();
    }
  }

  async function onReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() && !file) return;
    setBusy(true);
    setErr(null);
    try {
      let attachment = null;
      if (file) {
        // المرفق يُرفع لمجلد هذا المدرّس (teacherId) داخل مجلد السؤال
        attachment = await uploadMessageAttachment(it.questionId, teacherId, file);
      }
      // المستقبِل هو الطالب صاحب السؤال
      const res = await sendMessage(it.questionId, it.studentId, reply, attachment);
      if (res.error) setErr(res.error);
      else {
        setReply("");
        setFile(null);
        setFileKey((k) => k + 1);
        router.refresh();
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "صار خطأ.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <button onClick={toggle} className="flex w-full items-start justify-between gap-3 text-right">
        <div className="min-w-0">
          <p className="font-medium text-ink">{it.questionText}</p>
          <p className="mt-1 text-xs text-ink-soft">
            {it.subjectName} ·{" "}
            {it.stageName === "طالب جامعي" ? it.stageName : "الصف " + it.stageName}{" "}
            · {it.govName}
          </p>
        </div>
        <span className={"shrink-0 rounded-full px-2.5 py-1 text-xs font-medium " + badge.cls}>
          {badge.text}
        </span>
      </button>

      {open && (
        <div className="mt-3 border-t border-border pt-3">
          {it.messages.length > 0 && (
            <div className="mb-3 space-y-1.5">
              {it.messages.map((m) => (
                <MessageBubble key={m.id} m={m} />
              ))}
            </div>
          )}
          {err && (
            <p className="mb-2 rounded-lg bg-red-50 px-2 py-1 text-xs text-red-700">
              {err}
            </p>
          )}
          {file && <p className="mb-2 text-xs text-ink-soft">📎 {file.name}</p>}
          <form onSubmit={onReply} className="flex items-center gap-2">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="اكتب ردّك على الطالب…"
              className="flex-1 rounded-lg border border-border bg-white px-3 py-1.5 text-sm outline-none focus:border-teal"
            />
            <label className="cursor-pointer rounded-lg border border-border px-2 py-1.5 text-ink-soft hover:border-teal" title="إرفاق ملف أو صورة">
              📎
              <input
                key={fileKey}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-teal px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60"
            >
              {busy ? "…" : "رد"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
