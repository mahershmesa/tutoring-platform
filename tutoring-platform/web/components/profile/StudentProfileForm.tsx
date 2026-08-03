"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Governorate, Stage } from "@/lib/supabase/types";
import { uploadFile } from "@/lib/supabase/upload";
import { saveStudentProfile } from "@/lib/profile/actions";
import StatusToast from "./StatusToast";

const inputClass =
  "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-teal";

type Initial = {
  full_name: string;
  phone: string;
  governorate_id: number | null;
  stage_id: number | null;
  id_document_url: string | null;
};

export default function StudentProfileForm({
  userId,
  governorates,
  stages,
  initial,
  idDocSignedUrl,
}: {
  userId: string;
  governorates: Governorate[];
  stages: Stage[];
  initial: Initial;
  idDocSignedUrl: string | null;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initial.full_name ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [govId, setGovId] = useState<number | null>(initial.governorate_id);
  const [stageId, setStageId] = useState<number | null>(initial.stage_id);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      let idPath = initial.id_document_url;
      if (idFile) {
        const res = await uploadFile("id-documents", userId, idFile);
        idPath = res.path;
      }
      const result = await saveStudentProfile({
        full_name: fullName,
        phone,
        governorate_id: govId,
        stage_id: stageId,
        id_document_url: idPath,
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
    <form onSubmit={onSubmit} className="space-y-4">
      <StatusToast status={msg} />

      <div className="space-y-1">
        <label className="text-sm text-ink-soft">الاسم الكامل</label>
        <input
          className={inputClass}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-ink-soft">رقم الهاتف</label>
        <input
          className={inputClass}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-ink-soft">المحافظة</label>
        <select
          className={inputClass}
          value={govId ?? ""}
          onChange={(e) =>
            setGovId(e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">— اختر —</option>
          {governorates.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm text-ink-soft">المرحلة الدراسية</label>
        <select
          className={inputClass}
          value={stageId ?? ""}
          onChange={(e) =>
            setStageId(e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">— اختر —</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name === "طالب جامعي" ? s.name : "الصف " + s.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-amber">
          تنبيه: تغيير المرحلة لاحقاً يمسح كل أسئلتك السابقة.
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-sm text-ink-soft">
          بطاقة طلابية (اختياري)
        </label>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-teal-light file:px-3 file:py-1.5 file:text-teal-dark"
        />
        {idDocSignedUrl && !idFile && (
          <a
            href={idDocSignedUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-teal-dark hover:underline"
          >
            عرض الملف المرفوع حالياً
          </a>
        )}
      </div>

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
