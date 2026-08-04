"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  sendQuestion,
  sendMessage,
  confirmAnswer,
  setQuestionAttachment,
} from "@/lib/qa/actions";
import {
  uploadMessageAttachment,
  uploadQuestionAttachment,
} from "@/lib/supabase/upload";
import StatusToast from "@/components/profile/StatusToast";
import MessageBubble, { type MessageVM } from "@/components/qa/MessageBubble";
import AttachmentView from "@/components/qa/AttachmentView";

export type StudentTeacherThread = {
  teacherId: string;
  teacherName: string;
  answeredCount: number;
  status: "sent" | "read" | "answered";
  messages: MessageVM[];
};
export type StudentQuestionVM = {
  id: string;
  subjectId: string;
  questionText: string;
  attachmentUrl: string | null;
  attachmentMime: string | null;
  attachmentName: string | null;
  teachers: StudentTeacherThread[];
};
export type SubjectVM = { id: string; name: string };

type Toast = { ok?: boolean; text: string } | null;

export default function AskFlow({
  profileComplete,
  subjects,
  questions,
}: {
  profileComplete: boolean;
  subjects: SubjectVM[];
  questions: StudentQuestionVM[];
}) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  if (!profileComplete) {
    return (
      <div className="rounded-2xl border border-amber bg-amber-light p-6 text-sm text-ink">
        لازم تحدّد <strong>محافظتك ومرحلتك الدراسية</strong> قبل ما ترسل أسئلة،
        حتى توصل للمدرّسين المناسبين.{" "}
        <Link href="/profile" className="font-medium text-teal-dark underline">
          أكمل بروفايلك
        </Link>
      </div>
    );
  }

  // شاشة اختيار المادة
  if (!subjectId) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-soft">اختر المادة لتبدأ جلسة أسئلة:</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => setSubjectId(s.id)}
              className="rounded-2xl border border-border bg-white px-4 py-6 text-center font-medium text-ink shadow-sm transition hover:border-teal hover:bg-teal-light"
            >
              {s.name}
            </button>
          ))}
          {subjects.length === 0 && (
            <p className="col-span-full text-sm text-ink-soft">
              لا توجد مواد متاحة حالياً.
            </p>
          )}
        </div>
      </div>
    );
  }

  const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? "";
  const sessionQuestions = questions.filter((q) => q.subjectId === subjectId);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && !file) return;
    setSending(true);
    setToast(null);
    try {
      const res = await sendQuestion(subjectId!, text);
      if (res.error) {
        setToast({ text: res.error });
        return;
      }
      // المرفق يُرفع بعد إنشاء السؤال (RLS يحتاج وجود السؤال)
      if (file && res.questionId) {
        const att = await uploadQuestionAttachment(res.questionId, file);
        await setQuestionAttachment(res.questionId, att);
      }
      setText("");
      setFile(null);
      setFileKey((k) => k + 1);
      setToast({
        ok: true,
        text: `تم إرسال سؤالك لـ ${res.matched ?? 0} مدرّس مطابق.`,
      });
      setTimeout(() => setToast(null), 3000);
      router.refresh();
    } catch (e2) {
      setToast({ text: e2 instanceof Error ? e2.message : "صار خطأ." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-5">
      <StatusToast status={toast} />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">
          جلسة أسئلة: <span className="text-teal-dark">{subjectName}</span>
        </h2>
        <button
          onClick={() => setSubjectId(null)}
          className="rounded-xl border border-border px-3 py-1.5 text-sm text-ink-soft hover:border-teal"
        >
          إنهاء
        </button>
      </div>

      {/* مربّع كتابة السؤال — يبقى مفتوحاً لإرسال أكثر من سؤال */}
      <form onSubmit={onSend} className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="اكتب سؤالك بهذه المادة…"
          className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-teal"
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={sending}
            className="rounded-xl bg-teal px-5 py-2 text-sm font-medium text-white transition hover:bg-teal-dark disabled:opacity-60"
          >
            {sending ? "…جارٍ الإرسال" : "إرسال السؤال"}
          </button>
          <label className="cursor-pointer rounded-xl border border-border px-3 py-2 text-sm text-ink-soft hover:border-teal" title="إرفاق ملف أو صورة مع السؤال">
            📎 إرفاق
            <input
              key={fileKey}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {file && (
            <span className="truncate text-xs text-ink-soft">{file.name}</span>
          )}
        </div>
      </form>

      {/* أسئلة هذه الجلسة/المادة مع ردود المدرّسين */}
      <div className="space-y-4">
        {sessionQuestions.length === 0 && (
          <p className="text-sm text-ink-soft">
            ما أرسلت أي سؤال بهذه المادة بعد.
          </p>
        )}
        {sessionQuestions.map((q) => (
          <div
            key={q.id}
            className="rounded-2xl border border-border bg-white p-4 shadow-sm"
          >
            <p className="font-medium text-ink">{q.questionText}</p>
            {q.attachmentUrl && (
              <div className="mt-2">
                <AttachmentView
                  url={q.attachmentUrl}
                  mime={q.attachmentMime}
                  name={q.attachmentName}
                />
              </div>
            )}
            {q.teachers.length === 0 ? (
              <p className="mt-2 text-xs text-ink-soft">
                ما في مدرّس مطابق حالياً لهذا السؤال.
              </p>
            ) : (
              <p className="mt-1 text-xs text-ink-soft">
                وصل لـ {q.teachers.length} مدرّس
              </p>
            )}
            <div className="mt-3 space-y-3">
              {q.teachers.map((t) => (
                <TeacherThread key={t.teacherId} questionId={q.id} t={t} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeacherThread({
  questionId,
  t,
}: {
  questionId: string;
  t: StudentTeacherThread;
}) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const hasTeacherReply = t.messages.some((m) => !m.fromMe);

  async function onReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() && !file) return;
    setBusy(true);
    setErr(null);
    try {
      let attachment = null;
      if (file) {
        // المرفق يُرفع لمجلد هذا المدرّس تحديداً
        attachment = await uploadMessageAttachment(questionId, t.teacherId, file);
      }
      const res = await sendMessage(questionId, t.teacherId, reply, attachment);
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

  async function onConfirm() {
    setBusy(true);
    await confirmAnswer(questionId, t.teacherId);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          {t.teacherName}
          <span className="text-xs font-normal text-ink-soft">
            (أجاب على {t.answeredCount})
          </span>
        </span>
        {t.status === "answered" ? (
          <span className="text-xs font-medium text-teal-dark">✓ مؤكّد</span>
        ) : (
          hasTeacherReply && (
            <button
              onClick={onConfirm}
              disabled={busy}
              className="rounded-lg bg-teal-light px-2.5 py-1 text-xs font-medium text-teal-dark hover:bg-teal hover:text-white disabled:opacity-60"
            >
              أكّد استلام الرد
            </button>
          )
        )}
      </div>

      {t.messages.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {t.messages.map((m) => (
            <MessageBubble key={m.id} m={m} />
          ))}
        </div>
      )}

      {err && (
        <p className="mt-2 rounded-lg bg-red-50 px-2 py-1 text-xs text-red-700">
          {err}
        </p>
      )}
      {file && (
        <p className="mt-2 text-xs text-ink-soft">📎 {file.name}</p>
      )}

      <form onSubmit={onReply} className="mt-2 flex items-center gap-2">
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="رسالة للمدرّس…"
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
          className="rounded-lg bg-teal px-3 py-1.5 text-sm text-white hover:bg-teal-dark disabled:opacity-60"
        >
          {busy ? "…" : "إرسال"}
        </button>
      </form>
    </div>
  );
}
