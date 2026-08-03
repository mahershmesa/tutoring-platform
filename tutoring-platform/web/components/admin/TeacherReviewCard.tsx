"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setTeacherVerification } from "@/lib/admin/actions";
import { safeExternalUrl } from "@/lib/safe-url";

export type ReviewTeacher = {
  user_id: string;
  full_name: string;
  phone: string | null;
  school: string | null;
  institute: string | null;
  contact_email: string | null;
  telegram_url: string | null;
  instagram_url: string | null;
  photo_url: string | null;
  governorate_name: string | null;
  subjects: string[];
  stages: string[];
  idDocUrl: string | null;
};

export default function TeacherReviewCard({ t }: { t: ReviewTeacher }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "approved" | "rejected">(null);
  const [err, setErr] = useState<string | null>(null);

  async function act(status: "approved" | "rejected") {
    setBusy(status);
    setErr(null);
    const res = await setTeacherVerification(t.user_id, status);
    if (res.error) {
      setErr(res.error);
      setBusy(null);
    } else {
      router.refresh(); // يختفي من الطابور بعد التحديث
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={t.photo_url || "https://placehold.co/56x56?text=%20"}
          alt=""
          className="h-14 w-14 shrink-0 rounded-full border border-border object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink">{t.full_name}</p>
          <p className="text-xs text-ink-soft">
            {t.governorate_name ?? "بلا محافظة"}
            {t.school ? " · " + t.school : ""}
            {t.institute ? " · " + t.institute : ""}
          </p>
        </div>
      </div>

      <dl className="mt-3 space-y-1 text-sm">
        <Row label="المواد" value={t.subjects.join("، ") || "—"} />
        <Row
          label="المراحل"
          value={
            t.stages
              .map((s) => (s === "طالب جامعي" ? s : "الصف " + s))
              .join("، ") || "—"
          }
        />
        <Row label="الهاتف" value={t.phone || "—"} />
        <Row label="البريد" value={t.contact_email || "—"} />
      </dl>

      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        {safeExternalUrl(t.telegram_url) && (
          <a href={safeExternalUrl(t.telegram_url)!} target="_blank" rel="noreferrer" className="text-teal-dark hover:underline">
            تلغرام
          </a>
        )}
        {safeExternalUrl(t.instagram_url) && (
          <a href={safeExternalUrl(t.instagram_url)!} target="_blank" rel="noreferrer" className="text-teal-dark hover:underline">
            انستغرام
          </a>
        )}
        {t.idDocUrl ? (
          <a href={t.idDocUrl} target="_blank" rel="noreferrer" className="font-medium text-teal-dark hover:underline">
            📄 معاينة إثبات الهوية
          </a>
        ) : (
          <span className="text-amber">⚠️ لم يُرفع إثبات هوية</span>
        )}
      </div>

      {err && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => act("approved")}
          disabled={busy !== null}
          className="flex-1 rounded-xl bg-teal px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-dark disabled:opacity-60"
        >
          {busy === "approved" ? "…جارٍ" : "قبول التوثيق"}
        </button>
        <button
          onClick={() => act("rejected")}
          disabled={busy !== null}
          className="flex-1 rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
        >
          {busy === "rejected" ? "…جارٍ" : "رفض"}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-ink-soft">{label}:</dt>
      <dd className="min-w-0 break-words text-ink">{value}</dd>
    </div>
  );
}
