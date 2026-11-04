"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadStudyResource } from "@/lib/supabase/upload";
import {
  createExamPaper,
  deleteExamPaper,
  createQuiz,
  deleteQuiz,
} from "@/lib/study/actions";
import { MAX_OPTIONS, MIN_OPTIONS, MAX_QUESTIONS } from "@/lib/study/types";

export type TSubject = { id: string; name: string };
export type TStage = { id: number; name: string };
export type TPaper = {
  id: string;
  title: string;
  year: number | null;
  subjectName: string;
  stageName: string | null;
};
export type TQuiz = {
  id: string;
  title: string;
  chapter: string;
  subjectName: string;
  stageName: string | null;
};

const input =
  "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-teal";

type Draft = { prompt: string; options: string[]; correctIndex: number };
const emptyDraft = (): Draft => ({ prompt: "", options: ["", ""], correctIndex: 0 });

export default function TeachContentManager({
  subjects,
  stages,
  papers,
  quizzes,
}: {
  subjects: TSubject[];
  stages: TStage[];
  papers: TPaper[];
  quizzes: TQuiz[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"papers" | "quiz">("papers");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setTab("papers")}
          className={
            "flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition " +
            (tab === "papers"
              ? "border-teal bg-teal-light text-teal-dark"
              : "border-border bg-card text-ink-soft hover:border-teal")
          }
        >
          🏛️ الوزاريات
        </button>
        <button
          onClick={() => setTab("quiz")}
          className={
            "flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition " +
            (tab === "quiz"
              ? "border-teal bg-teal-light text-teal-dark"
              : "border-border bg-card text-ink-soft hover:border-teal")
          }
        >
          📝 اختبر نفسك
        </button>
      </div>

      {tab === "papers" ? (
        <PapersPanel
          subjects={subjects}
          stages={stages}
          papers={papers}
          onChange={() => router.refresh()}
        />
      ) : (
        <QuizPanel
          subjects={subjects}
          stages={stages}
          quizzes={quizzes}
          onChange={() => router.refresh()}
        />
      )}
    </div>
  );
}

/* ----------------------- الوزاريات ----------------------- */
function PapersPanel({
  subjects,
  stages,
  papers,
  onChange,
}: {
  subjects: TSubject[];
  stages: TStage[];
  papers: TPaper[];
  onChange: () => void;
}) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [stageId, setStageId] = useState<number | null>(null);
  const [year, setYear] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit() {
    setErr(null);
    setOk(false);
    if (!title.trim()) return setErr("اكتب عنوان الملف.");
    if (!file) return setErr("اختر ملف الوزاري (PDF أو صورة).");
    setBusy(true);
    try {
      const { data } = await (await import("@/lib/supabase/client")).createClient().auth.getUser();
      const uid = data.user?.id;
      if (!uid) throw new Error("لازم تسجيل الدخول.");
      const up = await uploadStudyResource(uid, file);
      const res = await createExamPaper({
        subjectId,
        stageId,
        year: year ? Number(year) : null,
        title,
        filePath: up.path,
        fileMime: up.mime,
        fileName: up.name,
      });
      if (res.error) {
        setErr(res.error);
        return;
      }
      setTitle("");
      setYear("");
      setFile(null);
      setOk(true);
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "صار خطأ غير متوقع.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("حذف هذا الملف نهائياً؟")) return;
    await deleteExamPaper(id);
    onChange();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold text-ink">رفع وزاري / نموذج</h3>
        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        {ok && <p className="rounded-lg bg-teal-light px-3 py-2 text-sm text-teal-dark">✓ تم الرفع.</p>}
        <input className={input} placeholder="العنوان (مثال: وزاري الدور الأول ٢٠٢٤)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <select className={input} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select className={input} value={stageId ?? ""} onChange={(e) => setStageId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">كل المراحل</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name === "طالب جامعي" ? s.name : "الصف " + s.name}</option>
            ))}
          </select>
        </div>
        <input className={input + " text-right"} dir="ltr" inputMode="numeric" placeholder="السنة (اختياري)" value={year} onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))} />
        <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-teal-light file:px-3 file:py-1.5 file:text-teal-dark" />
        <button onClick={submit} disabled={busy} className="w-full rounded-xl bg-teal px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60">
          {busy ? "…جارٍ الرفع" : "رفع"}
        </button>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-ink">وزارياتي ({papers.length})</h3>
        {papers.length === 0 ? (
          <p className="text-sm text-ink-soft">لا يوجد محتوى بعد.</p>
        ) : (
          papers.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{p.title}</p>
                <p className="text-xs text-ink-soft">
                  {p.subjectName}
                  {p.stageName ? ` · ${p.stageName}` : ""}
                  {p.year ? ` · ${p.year}` : ""}
                </p>
              </div>
              <button onClick={() => remove(p.id)} className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">حذف</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ----------------------- اختبر نفسك ----------------------- */
function QuizPanel({
  subjects,
  stages,
  quizzes,
  onChange,
}: {
  subjects: TSubject[];
  stages: TStage[];
  quizzes: TQuiz[];
  onChange: () => void;
}) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [stageId, setStageId] = useState<number | null>(null);
  const [chapter, setChapter] = useState("");
  const [title, setTitle] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([emptyDraft()]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function patch(i: number, d: Partial<Draft>) {
    setDrafts((arr) => arr.map((x, idx) => (idx === i ? { ...x, ...d } : x)));
  }
  function setOption(qi: number, oi: number, v: string) {
    setDrafts((arr) =>
      arr.map((x, idx) =>
        idx === qi ? { ...x, options: x.options.map((o, j) => (j === oi ? v : o)) } : x,
      ),
    );
  }
  function addOption(qi: number) {
    setDrafts((arr) =>
      arr.map((x, idx) =>
        idx === qi && x.options.length < MAX_OPTIONS
          ? { ...x, options: [...x.options, ""] }
          : x,
      ),
    );
  }
  function removeOption(qi: number, oi: number) {
    setDrafts((arr) =>
      arr.map((x, idx) => {
        if (idx !== qi || x.options.length <= MIN_OPTIONS) return x;
        const options = x.options.filter((_, j) => j !== oi);
        let correctIndex = x.correctIndex;
        if (oi === x.correctIndex) correctIndex = 0;
        else if (oi < x.correctIndex) correctIndex -= 1;
        return { ...x, options, correctIndex };
      }),
    );
  }

  async function submit() {
    setErr(null);
    setOk(false);
    setBusy(true);
    try {
      const res = await createQuiz({
        subjectId,
        stageId,
        chapter,
        title,
        questions: drafts.map((d) => ({
          prompt: d.prompt,
          options: d.options,
          correctIndex: d.correctIndex,
        })),
      });
      if (res.error) {
        setErr(res.error);
        return;
      }
      setTitle("");
      setChapter("");
      setDrafts([emptyDraft()]);
      setOk(true);
      onChange();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("حذف هذا الاختبار وكل أسئلته؟")) return;
    await deleteQuiz(id);
    onChange();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold text-ink">إنشاء اختبار جديد</h3>
        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        {ok && <p className="rounded-lg bg-teal-light px-3 py-2 text-sm text-teal-dark">✓ تم إنشاء الاختبار.</p>}
        <input className={input} placeholder="عنوان الاختبار (مثال: اختبار الوحدة الأولى)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <select className={input} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select className={input} value={stageId ?? ""} onChange={(e) => setStageId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">كل المراحل</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name === "طالب جامعي" ? s.name : "الصف " + s.name}</option>
            ))}
          </select>
        </div>
        <input className={input} placeholder="الفصل / الوحدة (مثال: الفصل الأول)" value={chapter} onChange={(e) => setChapter(e.target.value)} />

        <div className="space-y-3 border-t border-border pt-3">
          {drafts.map((d, qi) => (
            <div key={qi} className="space-y-2 rounded-xl border border-border bg-surface p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink-soft">السؤال {qi + 1}</span>
                {drafts.length > 1 && (
                  <button onClick={() => setDrafts((a) => a.filter((_, j) => j !== qi))} className="text-xs text-red-600 hover:underline">حذف السؤال</button>
                )}
              </div>
              <input className={input} placeholder="نص السؤال" value={d.prompt} onChange={(e) => patch(qi, { prompt: e.target.value })} />
              <p className="text-xs text-ink-soft">اختر الدائرة بجانب الإجابة الصحيحة:</p>
              {d.options.map((o, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input type="radio" name={`correct-${qi}`} checked={d.correctIndex === oi} onChange={() => patch(qi, { correctIndex: oi })} className="h-4 w-4 accent-teal" aria-label="الإجابة الصحيحة" />
                  <input className={input} placeholder={`الخيار ${oi + 1}`} value={o} onChange={(e) => setOption(qi, oi, e.target.value)} />
                  {d.options.length > MIN_OPTIONS && (
                    <button onClick={() => removeOption(qi, oi)} className="shrink-0 text-ink-soft hover:text-red-600" aria-label="حذف الخيار">✕</button>
                  )}
                </div>
              ))}
              {d.options.length < MAX_OPTIONS && (
                <button onClick={() => addOption(qi)} className="text-xs text-teal-dark hover:underline">+ خيار</button>
              )}
            </div>
          ))}
          {drafts.length < MAX_QUESTIONS && (
            <button onClick={() => setDrafts((a) => [...a, emptyDraft()])} className="w-full rounded-xl border border-dashed border-teal px-4 py-2 text-sm text-teal-dark hover:bg-teal-light">
              + إضافة سؤال
            </button>
          )}
        </div>

        <button onClick={submit} disabled={busy} className="w-full rounded-xl bg-teal px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60">
          {busy ? "…جارٍ الحفظ" : "حفظ الاختبار"}
        </button>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-ink">اختباراتي ({quizzes.length})</h3>
        {quizzes.length === 0 ? (
          <p className="text-sm text-ink-soft">لا يوجد اختبارات بعد.</p>
        ) : (
          quizzes.map((q) => (
            <div key={q.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{q.title}</p>
                <p className="text-xs text-ink-soft">
                  {q.subjectName} · {q.chapter}
                  {q.stageName ? ` · ${q.stageName}` : ""}
                </p>
              </div>
              <button onClick={() => remove(q.id)} className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">حذف</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
