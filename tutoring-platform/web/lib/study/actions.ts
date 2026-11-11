"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  type ExamPaperInput,
  type QuizInput,
  type GradeResult,
  MIN_OPTIONS,
  MAX_OPTIONS,
  MAX_QUESTIONS,
} from "@/lib/study/types";
import { LIMITS, asInt, asText, isUuid, dbErrorMessage } from "@/lib/validate";

export type StudyState = { error?: string; ok?: boolean; id?: string };

// ------------------------- الوزاريات -------------------------

export async function createExamPaper(input: ExamPaperInput): Promise<StudyState> {
  const supabase = createClient();
  if (!supabase) return { error: "اتصال Supabase غير مضبوط." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجيل الدخول." };

  if (!input || typeof input !== "object") return { error: "بيانات غير صالحة." };
  const title = asText(input.title, LIMITS.short);
  if (!title) return { error: "اكتب عنوان الملف (٢٠٠ حرف كحدّ أقصى)." };
  if (!isUuid(input.subjectId)) return { error: "اختر المادة." };
  const filePath = asText(input.filePath, LIMITS.url);
  if (!filePath) return { error: "ارفع الملف أولاً." };
  // الملف يجب أن يكون داخل مجلد المدرّس نفسه (القاعدة تفرض ذلك أيضاً)
  if (!filePath.startsWith(user.id + "/") || filePath.includes(".."))
    return { error: "ملف غير صالح." };
  const stageId = input.stageId == null ? null : asInt(input.stageId, 1, 1000);
  const year = input.year == null ? null : asInt(input.year, 1990, 2100);
  if (input.stageId != null && stageId === null) return { error: "مرحلة غير صالحة." };
  if (input.year != null && year === null)
    return { error: "السنة غير صالحة (١٩٩٠–٢١٠٠)." };

  const { error } = await supabase.from("exam_papers").insert({
    teacher_id: user.id,
    subject_id: input.subjectId,
    stage_id: stageId,
    year,
    title,
    file_path: filePath,
    file_mime: asText(input.fileMime, LIMITS.mime),
    file_name: asText(input.fileName, LIMITS.fileName),
  });
  // RLS تمنع غير المعتمد أو مادة ليست له
  if (error)
    return {
      error: dbErrorMessage(
        error,
        "تعذّر الحفظ — تأكد أنك معتمد وأن المادة من موادك.",
      ),
    };

  revalidatePath("/teach");
  revalidatePath("/papers");
  return { ok: true };
}

export async function deleteExamPaper(id: string): Promise<StudyState> {
  const supabase = createClient();
  if (!supabase) return { error: "اتصال Supabase غير مضبوط." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجيل الدخول." };
  if (!isUuid(id)) return { error: "طلب غير صالح." };

  // احذف الملف من التخزين (إن أمكن) ثم الصف
  const { data: row } = await supabase
    .from("exam_papers")
    .select("file_path")
    .eq("id", id)
    .maybeSingle();
  if (row?.file_path) {
    await supabase.storage.from("study-resources").remove([row.file_path]);
  }
  const { error } = await supabase.from("exam_papers").delete().eq("id", id);
  if (error) return { error: "تعذّر الحذف." };

  revalidatePath("/teach");
  revalidatePath("/papers");
  return { ok: true };
}

// ------------------------- اختبر نفسك -------------------------

export async function createQuiz(input: QuizInput): Promise<StudyState> {
  const supabase = createClient();
  if (!supabase) return { error: "اتصال Supabase غير مضبوط." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجيل الدخول." };

  if (!input || typeof input !== "object") return { error: "بيانات غير صالحة." };
  const title = asText(input.title, LIMITS.short);
  const chapter = asText(input.chapter, LIMITS.short);
  if (!title) return { error: "اكتب عنوان الاختبار (٢٠٠ حرف كحدّ أقصى)." };
  if (!chapter) return { error: "اكتب اسم الفصل/الوحدة (٢٠٠ حرف كحدّ أقصى)." };
  if (!isUuid(input.subjectId)) return { error: "اختر المادة." };
  const quizStageId = input.stageId == null ? null : asInt(input.stageId, 1, 1000);
  if (input.stageId != null && quizStageId === null)
    return { error: "مرحلة غير صالحة." };

  // تحقق من شكل الأسئلة (القيم تأتي من العميل بلا ضمان نوع)
  if (!Array.isArray(input.questions) || input.questions.length > MAX_QUESTIONS + 20)
    return { error: "أسئلة غير صالحة." };
  for (const q of input.questions) {
    if (
      !q ||
      typeof q.prompt !== "string" ||
      q.prompt.length > 1000 ||
      !Array.isArray(q.options) ||
      q.options.length > 20 ||
      !q.options.every((o) => typeof o === "string" && o.length <= 300) ||
      !Number.isInteger(q.correctIndex)
    )
      return { error: "أسئلة غير صالحة (النص ١٠٠٠ حرف والخيار ٣٠٠ كحدّ أقصى)." };
  }

  // تحقق من الأسئلة
  const qs = input.questions.filter((q) => q.prompt.trim());
  if (qs.length === 0) return { error: "أضف سؤالاً واحداً على الأقل." };
  if (qs.length > MAX_QUESTIONS)
    return { error: `الحد الأقصى ${MAX_QUESTIONS} سؤالاً.` };
  for (const [i, q] of qs.entries()) {
    // الخيارات الفارغة تُحذف، فيجب أن يشير الصحيح إلى خيار غير فارغ
    if (!(q.options[q.correctIndex] ?? "").trim())
      return { error: `السؤال ${i + 1}: حدّد الإجابة الصحيحة (خيار غير فارغ).` };
    const opts = q.options.map((o) => o.trim()).filter(Boolean);
    if (opts.length < MIN_OPTIONS)
      return { error: `السؤال ${i + 1}: أضف خيارين على الأقل.` };
    if (opts.length > MAX_OPTIONS)
      return { error: `السؤال ${i + 1}: الحد الأقصى ${MAX_OPTIONS} خيارات.` };
  }

  // أنشئ الاختبار ثم الأسئلة (RLS تتحقق من الاعتماد والمادة)
  const { data: quiz, error: qErr } = await supabase
    .from("quizzes")
    .insert({
      teacher_id: user.id,
      subject_id: input.subjectId,
      stage_id: quizStageId,
      chapter,
      title,
    })
    .select("id")
    .single();
  if (qErr || !quiz)
    return {
      error: dbErrorMessage(
        qErr,
        "تعذّر إنشاء الاختبار — تأكد أنك معتمد وأن المادة من موادك.",
      ),
    };

  const rows = qs.map((q, idx) => {
    // فهرس الإجابة الصحيحة بعد حذف الخيارات الفارغة التي تسبقها
    const correctIndex = q.options
      .slice(0, q.correctIndex)
      .filter((o) => o.trim()).length;
    const opts = q.options.map((o) => o.trim()).filter(Boolean);
    return {
      quiz_id: quiz.id,
      prompt: q.prompt.trim(),
      options: opts,
      correct_index: correctIndex,
      sort_order: idx,
    };
  });
  const { error: insErr } = await supabase.from("quiz_questions").insert(rows);
  if (insErr) {
    // تراجع: احذف الاختبار حتى لا يبقى فارغاً
    await supabase.from("quizzes").delete().eq("id", quiz.id);
    return { error: "تعذّر حفظ الأسئلة." };
  }

  revalidatePath("/teach");
  revalidatePath("/quiz");
  return { ok: true, id: quiz.id };
}

export async function deleteQuiz(id: string): Promise<StudyState> {
  const supabase = createClient();
  if (!supabase) return { error: "اتصال Supabase غير مضبوط." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجيل الدخول." };
  if (!isUuid(id)) return { error: "طلب غير صالح." };

  const { error } = await supabase.from("quizzes").delete().eq("id", id);
  if (error) return { error: "تعذّر الحذف." };

  revalidatePath("/teach");
  revalidatePath("/quiz");
  return { ok: true };
}

// الطالب يسلّم إجاباته → التصحيح في القاعدة (لا تُكشف الإجابة قبل التسليم).
export async function submitQuiz(
  quizId: string,
  answers: Record<string, number>,
): Promise<{ error?: string; result?: GradeResult }> {
  const supabase = createClient();
  if (!supabase) return { error: "اتصال Supabase غير مضبوط." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجيل الدخول." };
  if (!isUuid(quizId)) return { error: "اختبار غير صالح." };

  // نمرّر فقط أزواج (معرّف سؤال → رقم خيار) الصالحة
  const safeAnswers: Record<string, number> = {};
  if (answers && typeof answers === "object") {
    for (const [k, v] of Object.entries(answers).slice(0, 200)) {
      if (isUuid(k) && Number.isInteger(v) && v >= 0 && v < 20) safeAnswers[k] = v;
    }
  }

  const { data, error } = await supabase.rpc("grade_quiz", {
    p_quiz_id: quizId,
    p_answers: safeAnswers,
  });
  if (error) return { error: dbErrorMessage(error, "تعذّر التصحيح.") };
  const result = data as GradeResult;
  if (result?.error) return { error: "لا توجد أسئلة في هذا الاختبار." };
  return { result };
}
