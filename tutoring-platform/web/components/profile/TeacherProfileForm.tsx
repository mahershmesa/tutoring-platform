"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Governorate, Stage, Subject } from "@/lib/supabase/types";
import { uploadFile } from "@/lib/supabase/upload";
import { saveTeacherProfile } from "@/lib/profile/actions";
import StatusToast from "./StatusToast";

const inputClass =
  "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-teal";

type Initial = {
  full_name: string;
  phone: string;
  school: string;
  institute: string;
  contact_email: string;
  telegram_url: string;
  instagram_url: string;
  governorate_id: number | null;
  location_visible: boolean;
  photo_url: string | null;
  id_document_url: string | null;
  verification_status: "pending" | "approved" | "rejected";
  subject_ids: string[];
  stage_ids: number[];
};

function VerificationBadge({ status }: { status: Initial["verification_status"] }) {
  const map = {
    pending: { text: "قيد المراجعة", cls: "bg-amber-light text-amber" },
    approved: { text: "موثّق ✓", cls: "bg-teal-light text-teal-dark" },
    rejected: { text: "مرفوض", cls: "bg-red-50 text-red-700" },
  } as const;
  const s = map[status];
  return (
    <span className={"rounded-full px-3 py-1 text-xs font-medium " + s.cls}>
      {s.text}
    </span>
  );
}

export default function TeacherProfileForm({
  userId,
  governorates,
  stages,
  subjects,
  initial,
  idDocSignedUrl,
}: {
  userId: string;
  governorates: Governorate[];
  stages: Stage[];
  subjects: Subject[];
  initial: Initial;
  idDocSignedUrl: string | null;
}) {
  const router = useRouter();
  const [f, setF] = useState({
    full_name: initial.full_name ?? "",
    phone: initial.phone ?? "",
    school: initial.school ?? "",
    institute: initial.institute ?? "",
    contact_email: initial.contact_email ?? "",
    telegram_url: initial.telegram_url ?? "",
    instagram_url: initial.instagram_url ?? "",
  });
  const [govId, setGovId] = useState<number | null>(initial.governorate_id);
  const [locationVisible, setLocationVisible] = useState(
    initial.location_visible,
  );
  const [subjectIds, setSubjectIds] = useState<Set<string>>(
    new Set(initial.subject_ids),
  );
  const [stageIds, setStageIds] = useState<Set<number>>(
    new Set(initial.stage_ids),
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);

  const upd = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });

  const toggle = <T,>(set: Set<T>, val: T): Set<T> => {
    const next = new Set(set);
    next.has(val) ? next.delete(val) : next.add(val);
    return next;
  };

  const hasIdDoc = Boolean(initial.id_document_url) || Boolean(idFile);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      let photoUrl = initial.photo_url;
      if (photoFile) {
        const res = await uploadFile("avatars", userId, photoFile);
        photoUrl = res.publicUrl ?? null;
      }
      let idPath = initial.id_document_url;
      if (idFile) {
        const res = await uploadFile("id-documents", userId, idFile);
        idPath = res.path;
      }
      const result = await saveTeacherProfile({
        ...f,
        governorate_id: govId,
        location_visible: locationVisible,
        photo_url: photoUrl,
        id_document_url: idPath,
        subject_ids: Array.from(subjectIds),
        stage_ids: Array.from(stageIds),
      });
      if (result.error) setMsg({ text: result.error });
      else {
        setMsg({ ok: true, text: "تم الحفظ بنجاح." });
        // اعرض التأكيد لحظة ثم حدّث البيانات من الخادم وأخفِ الرسالة
        setTimeout(() => {
          setMsg(null);
          router.refresh();
        }, 2500);
      }
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "صار خطأ." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* حالة التوثيق (عرض فقط) */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5">
        <span className="text-sm text-ink-soft">حالة التوثيق</span>
        <VerificationBadge status={initial.verification_status} />
      </div>

      <StatusToast status={msg} />

      <div className="space-y-1">
        <label className="text-sm text-ink-soft">الاسم الكامل</label>
        <input className={inputClass} value={f.full_name} onChange={upd("full_name")} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm text-ink-soft">الهاتف</label>
          <input className={inputClass} value={f.phone} onChange={upd("phone")} inputMode="tel" />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-ink-soft">البريد للتواصل</label>
          <input className={inputClass} value={f.contact_email} onChange={upd("contact_email")} type="email" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm text-ink-soft">المدرسة (اختياري)</label>
          <input className={inputClass} value={f.school} onChange={upd("school")} />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-ink-soft">المعهد (اختياري)</label>
          <input className={inputClass} value={f.institute} onChange={upd("institute")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm text-ink-soft">رابط تلغرام</label>
          <input className={inputClass} value={f.telegram_url} onChange={upd("telegram_url")} dir="ltr" />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-ink-soft">رابط انستغرام</label>
          <input className={inputClass} value={f.instagram_url} onChange={upd("instagram_url")} dir="ltr" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm text-ink-soft">المحافظة</label>
        <select
          className={inputClass}
          value={govId ?? ""}
          onChange={(e) => setGovId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">— اختر —</option>
          {governorates.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>

      {/* المواد */}
      <div className="space-y-1.5">
        <label className="text-sm text-ink-soft">المواد التي تدرّسها</label>
        <div className="flex flex-wrap gap-2">
          {subjects.map((s) => {
            const active = subjectIds.has(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSubjectIds(toggle(subjectIds, s.id))}
                className={
                  "rounded-full border px-3 py-1.5 text-sm transition " +
                  (active
                    ? "border-teal bg-teal-light font-medium text-teal-dark"
                    : "border-border bg-white text-ink-soft hover:border-teal")
                }
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* المراحل */}
      <div className="space-y-1.5">
        <label className="text-sm text-ink-soft">المراحل التي تغطّيها</label>
        <div className="flex flex-wrap gap-2">
          {stages.map((s) => {
            const active = stageIds.has(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStageIds(toggle(stageIds, s.id))}
                className={
                  "rounded-full border px-3 py-1.5 text-sm transition " +
                  (active
                    ? "border-teal bg-teal-light font-medium text-teal-dark"
                    : "border-border bg-white text-ink-soft hover:border-teal")
                }
              >
                {s.name === "طالب جامعي" ? s.name : "الصف " + s.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* الصورة الشخصية */}
      <div className="space-y-1">
        <label className="text-sm text-ink-soft">الصورة الشخصية</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-teal-light file:px-3 file:py-1.5 file:text-teal-dark"
        />
        {initial.photo_url && !photoFile && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={initial.photo_url}
            alt="الصورة الحالية"
            className="mt-2 h-16 w-16 rounded-full object-cover"
          />
        )}
      </div>

      {/* إثبات الهوية */}
      <div className="space-y-1">
        <label className="text-sm text-ink-soft">
          إثبات هوية تعليمية (اختياري الآن)
        </label>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-teal-light file:px-3 file:py-1.5 file:text-teal-dark"
        />
        {idDocSignedUrl && !idFile && (
          <a href={idDocSignedUrl} target="_blank" rel="noreferrer" className="text-xs text-teal-dark hover:underline">
            عرض الملف المرفوع حالياً
          </a>
        )}
        {!hasIdDoc && (
          <p className="rounded-xl bg-amber-light px-3 py-2 text-xs text-ink">
            ⚠️ إثبات الهوية مطلوب حتى تقبل الإدارة توثيق حسابك وتظهر على الخريطة.
          </p>
        )}
      </div>

      {/* إظهار الموقع */}
      <label className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5">
        <span className="text-sm text-ink">إظهار موقعي على الخريطة</span>
        <input
          type="checkbox"
          checked={locationVisible}
          onChange={(e) => setLocationVisible(e.target.checked)}
          className="h-5 w-5 accent-teal"
        />
      </label>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-teal px-4 py-2.5 font-medium text-white transition hover:bg-teal-dark disabled:opacity-60"
      >
        {saving ? "جاري الحفظ..." : "حفظ"}
      </button>
    </form>
  );
}
