"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendMessage, markNotificationRead } from "@/lib/qa/actions";

export type InboxItem = {
  notificationId: string;
  status: "sent" | "read" | "answered";
  questionId: string;
  questionText: string;
  subjectName: string;
  stageName: string;
  govName: string;
  messages: { id: string; fromMe: boolean; body: string }[];
};

const statusBadge = {
  sent: { text: "جديد", cls: "bg-amber-light text-amber" },
  read: { text: "مقروء", cls: "bg-surface text-ink-soft" },
  answered: { text: "تم الرد ✓", cls: "bg-teal-light text-teal-dark" },
} as const;

export default function InboxView({ items }: { items: InboxItem[] }) {
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
        <InboxThread key={it.notificationId} it={it} />
      ))}
    </div>
  );
}

function InboxThread({ it }: { it: InboxItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
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
    if (!reply.trim()) return;
    setBusy(true);
    await sendMessage(it.questionId, reply);
    setReply("");
    setBusy(false);
    router.refresh();
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
                <div
                  key={m.id}
                  className={
                    "max-w-[85%] rounded-lg px-3 py-1.5 text-sm " +
                    (m.fromMe
                      ? "ml-auto bg-teal-light text-ink"
                      : "bg-surface text-ink")
                  }
                >
                  {m.body}
                </div>
              ))}
            </div>
          )}
          <form onSubmit={onReply} className="flex gap-2">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="اكتب ردّك على الطالب…"
              className="flex-1 rounded-lg border border-border bg-white px-3 py-1.5 text-sm outline-none focus:border-teal"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-teal px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60"
            >
              رد
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
