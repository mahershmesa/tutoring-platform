"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone, isValidPhone, phoneToEmail } from "@/lib/auth/phone";
import { authError } from "@/lib/auth/errors";
import { uploadFile } from "@/lib/supabase/upload";
import { saveStudentProfile, saveTeacherProfile } from "@/lib/profile/actions";
import type { Governorate, Stage, Subject } from "@/lib/supabase/types";

const input =
  "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-teal";
const chip = (active: boolean) =>
  "rounded-full border px-3 py-1.5 text-sm transition " +
  (active
    ? "border-teal bg-teal-light font-medium text-teal-dark"
    : "border-border bg-white text-ink-soft hover:border-teal");

export default function RegisterWizard({
  governorates,
  stages,
  subjects,
}: {
  governorates: Governorate[];
  stages: Stage[];
  subjects: Subject[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // account
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  // common
  const [govId, setGovId] = useState<number | null>(null);
  // student
  const [stageId, setStageId] = useState<number | null>(null);
  const [studentIdFile, setStudentIdFile] = useState<File | null>(null);
  // teacher
  const [subjectIds, setSubjectIds] = useState<Set<string>>(new Set());
  const [stageIds, setStageIds] = useState<Set<number>>(new Set());
  const [school, setSchool] = useState("");
  const [institute, setInstitute] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [telegramUrl, setTelegramUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [idDocFile, setIdDocFile] = useState<File | null>(null);
  const [locationVisible, setLocationVisible] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const totalSteps = role === "teacher" ? 4 : 3;

  const toggle = <T,>(set: Set<T>, v: T): Set<T> => {
    const n = new Set(set);
    n.has(v) ? n.delete(v) : n.add(v);
    return n;
  };

  function validateStep(): string | null {
    if (step === 2) {
      if (!fullName.trim()) return "اكتب اسمك.";
      if (!isValidPhone(normalizePhone(phone)))
        return "رقم هاتف غير صحيح (مثال: 07701234567).";
      if (password.length < 8) return "كلمة المرور ٨ أحرف على الأقل.";
    }
    if (step === 3) {
      if (!govId) return "اختر محافظتك.";
      if (role === "student" && !stageId) return "اختر مرحلتك الدراسية.";
      if (role === "teacher" && subjectIds.size === 0)
        return "اختر مادة واحدة على الأقل.";
      if (role === "teacher" && stageIds.size === 0)
        return "اختر مرحلة واحدة على الأقل.";
    }
    return null;
  }

  function next() {
    const v = validateStep();
    if (v) {
      setErr(v);
      return;
    }
    setErr(null);
    setStep((s) => s + 1);
  }
  function back() {
    setErr(null);
    setStep((s) => s - 1);
  }

  async function finish() {
    if (!agreed) {
      setErr("يجب الموافقة على سياسة الخصوصية وشروط الاستخدام.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const supabase = createClient();
      const canonical = normalizePhone(phone);
      const { data, error } = await supabase.auth.signUp({
        email: phoneToEmail(canonical),
        password,
        options: { data: { role, full_name: fullName.trim(), phone: canonical } },
      });
      if (error) {
        setErr(authError(error.message));
        return;
      }
      const userId = data.user?.id;
      if (!userId) {
        setErr("تعذّر إنشاء الحساب. تأكّد أن تأكيد البريد معطّل في Supabase.");
        return;
      }

      if (role === "student") {
        let idUrl: string | null = null;
        if (studentIdFile)
          idUrl = (await uploadFile("id-documents", userId, studentIdFile)).path;
        const res = await saveStudentProfile({
          full_name: fullName,
          phone: canonical,
          governorate_id: govId,
          stage_id: stageId,
          id_document_url: idUrl,
        });
        if (res.error) {
          setErr(res.error);
          return;
        }
      } else {
        let photoUrl: string | null = null;
        let idPath: string | null = null;
        if (photoFile)
          photoUrl = (await uploadFile("avatars", userId, photoFile)).publicUrl ?? null;
        if (idDocFile)
          idPath = (await uploadFile("id-documents", userId, idDocFile)).path;
        const res = await saveTeacherProfile({
          full_name: fullName,
          phone: canonical,
          school,
          institute,
          contact_email: contactEmail,
          telegram_url: telegramUrl,
          instagram_url: instagramUrl,
          governorate_id: govId,
          location_visible: locationVisible,
          photo_url: photoUrl,
          id_document_url: idPath,
          subject_ids: Array.from(subjectIds),
          stage_ids: Array.from(stageIds),
        });
        if (res.error) {
          setErr(res.error);
          return;
        }
      }
      router.push("/");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "صار خطأ غير متوقع.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">إنشاء حساب</h1>
        <span className="text-xs text-ink-soft">
          خطوة {step} من {totalSteps}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full bg-teal transition-all"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      {err && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>
      )}

      {/* الخطوة 1: الدور */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-ink-soft">اختر نوع حسابك:</p>
          <div className="flex gap-2">
            {(["student", "teacher"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={
                  "flex-1 rounded-xl border px-4 py-3 text-sm transition " +
                  (role === r
                    ? "border-teal bg-teal-light font-medium text-teal-dark"
                    : "border-border bg-white text-ink-soft hover:border-teal")
                }
              >
                {r === "student" ? "أنا طالب" : "أنا مدرّس"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* الخطوة 2: الحساب */}
      {step === 2 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm text-ink-soft">الاسم الكامل</label>
            <input className={input} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-ink-soft">رقم الهاتف</label>
            <input className={input + " text-right"} dir="ltr" inputMode="tel" placeholder="07701234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-ink-soft">كلمة المرور</label>
            <input className={input} type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="text-xs text-ink-soft">٨ أحرف على الأقل</p>
          </div>
        </div>
      )}

      {/* الخطوة 3: الأساسي */}
      {step === 3 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm text-ink-soft">المحافظة</label>
            <select className={input} value={govId ?? ""} onChange={(e) => setGovId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">— اختر —</option>
              {governorates.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {role === "student" ? (
            <>
              <div className="space-y-1">
                <label className="text-sm text-ink-soft">المرحلة الدراسية</label>
                <select className={input} value={stageId ?? ""} onChange={(e) => setStageId(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">— اختر —</option>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>{s.name === "طالب جامعي" ? s.name : "الصف " + s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-ink-soft">بطاقة طلابية (اختياري)</label>
                <input type="file" accept="image/*,application/pdf" onChange={(e) => setStudentIdFile(e.target.files?.[0] ?? null)} className="w-full text-sm text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-teal-light file:px-3 file:py-1.5 file:text-teal-dark" />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-sm text-ink-soft">المواد التي تدرّسها</label>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((s) => (
                    <button key={s.id} type="button" onClick={() => setSubjectIds(toggle(subjectIds, s.id))} className={chip(subjectIds.has(s.id))}>{s.name}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-ink-soft">المراحل التي تغطّيها</label>
                <div className="flex flex-wrap gap-2">
                  {stages.map((s) => (
                    <button key={s.id} type="button" onClick={() => setStageIds(toggle(stageIds, s.id))} className={chip(stageIds.has(s.id))}>{s.name === "طالب جامعي" ? s.name : "الصف " + s.name}</button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* الخطوة 4 (مدرّس): التفاصيل */}
      {step === 4 && role === "teacher" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input className={input} placeholder="المدرسة (اختياري)" value={school} onChange={(e) => setSchool(e.target.value)} />
            <input className={input} placeholder="المعهد (اختياري)" value={institute} onChange={(e) => setInstitute(e.target.value)} />
          </div>
          <input className={input} type="email" placeholder="بريد للتواصل (اختياري)" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <input className={input} dir="ltr" placeholder="رابط تلغرام" value={telegramUrl} onChange={(e) => setTelegramUrl(e.target.value)} />
            <input className={input} dir="ltr" placeholder="رابط انستغرام" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-ink-soft">الصورة الشخصية (اختياري)</label>
            <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} className="w-full text-sm text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-teal-light file:px-3 file:py-1.5 file:text-teal-dark" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-ink-soft">إثبات هوية تعليمية</label>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => setIdDocFile(e.target.files?.[0] ?? null)} className="w-full text-sm text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-teal-light file:px-3 file:py-1.5 file:text-teal-dark" />
            <p className="rounded-lg bg-amber-light px-2 py-1 text-xs text-ink">⚠️ مطلوب حتى تقبل الإدارة توثيق حسابك وتظهر على الخريطة (يمكن رفعه لاحقاً من البروفايل).</p>
          </div>
          <label className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5">
            <span className="text-sm text-ink">إظهار موقعي على الخريطة</span>
            <input type="checkbox" checked={locationVisible} onChange={(e) => setLocationVisible(e.target.checked)} className="h-5 w-5 accent-teal" />
          </label>
        </div>
      )}

      {/* موافقة الخصوصية — على الخطوة الأخيرة */}
      {step === totalSteps && (
        <label className="flex items-start gap-2 pt-1 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-teal"
          />
          <span>
            أوافق على{" "}
            <Link href="/privacy" target="_blank" className="text-teal-dark underline">
              سياسة الخصوصية
            </Link>{" "}
            و{" "}
            <Link href="/terms" target="_blank" className="text-teal-dark underline">
              شروط الاستخدام
            </Link>
            .
          </span>
        </label>
      )}

      {/* أزرار التنقّل */}
      <div className="flex gap-2 pt-2">
        {step > 1 && (
          <button type="button" onClick={back} disabled={busy} className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink-soft hover:border-teal disabled:opacity-60">
            السابق
          </button>
        )}
        {step < totalSteps ? (
          <button type="button" onClick={next} className="flex-1 rounded-xl bg-teal px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-dark">
            التالي
          </button>
        ) : (
          <button type="button" onClick={finish} disabled={busy} className="flex-1 rounded-xl bg-teal px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60">
            {busy ? "…جارٍ إنشاء الحساب" : "إنشاء الحساب"}
          </button>
        )}
      </div>

      <p className="text-center text-sm text-ink-soft">
        عندك حساب؟{" "}
        <Link href="/login" className="text-teal-dark hover:underline">
          تسجيل الدخول
        </Link>
      </p>
    </div>
  );
}
