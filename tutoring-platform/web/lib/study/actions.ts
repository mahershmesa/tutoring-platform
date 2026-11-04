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

export type StudyState = { error?: string; ok?: boolean; id?: string };

// ------------------------- الوزاريات -------------------------

export async function createExamPaper(input: ExamPaperInput): Promise<StudyState> {
  const supabase = createClient();
  if (!supabase) return { error: "اتصال Supabase غير مضبوط." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجيل الدخول." };

  const title = input.title.trim();
  if (!title) return { error: "اكتب عنوان الملف." };
  if (!input.subjectId) return { error: "اختر المادة." };
  if (!input.filePath) return { error: "ارفع الملف أولاً." };

  const { error } = await supabase.from("exam_papers").insert({
    teacher_id: user.id,
    subject_id: input.subjectId,
    stage_id: input.stageId,
    year: input.year,
    title,
    file_path: input.filePath,
    file_mime: input.fileMime,
    file_name: input.fileName,
  });
  // RLS تمنع غير المعتمد أو مادة ليست له
  if (error) return { error: "تعذّر الحفظ — تأكد أنك معتمد وأن المادة من موادك." };

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

  const title = input.title.trim();
  const chapter = input.chapter.trim();
  if (!title) return { error: "اكتب عنوان الاختبار." };
  if (!chapter) return { error: "اكتب اسم الفصل/الوحدة." };
  if (!input.subjectId) return { error: "اختر المادة." };

  // تحقق من الأسئلة
  const qs = input.questions.filter((q) => q.prompt.trim());
  if (qs.length === 0) return { error: "أضف سؤالاً واحداً على الأقل." };
  if (qs.length > MAX_QUESTIONS)
    return { error: `الحد الأقصى ${MAX_QUESTIONS} سؤالاً.` };
  for (const [i, q] of qs.entries()) {
    const opts = q.options.map((o) => o.trim()).filter(Boolean);
    if (opts.length < MIN_OPTIONS)
      return { error: `السؤال ${i + 1}: أضف خيارين على الأقل.` };
    if (opts.length > MAX_OPTIONS)
      return { error: `السؤال ${i + 1}: الحد الأقصى ${MAX_OPTIONS} خيارات.` };
    if (q.correctIndex < 0 || q.correctIndex >= opts.length)
      return { error: `السؤال ${i + 1}: حدّد الإجابة الصحيحة.` };
  }

  // أنشئ الاختبار ثم الأسئلة (RLS تتحقق من الاعتماد والمادة)
  const { data: quiz, error: qErr } = await supabase
    .from("quizzes")
    .insert({
      teacher_id: user.id,
      subject_id: input.subjectId,
      stage_id: input.stageId,
      chapter,
      title,
    })
    .select("id")
    .single();
  if (qErr || !quiz)
    return { error: "تعذّر إنشاء الاختبار — تأكد أنك معتمد وأن المادة من موادك." };

  const rows = qs.map((q, idx) => {
    const opts = q.options.map((o) => o.trim()).filter(Boolean);
    return {
      quiz_id: quiz.id,
      prompt: q.prompt.trim(),
      options: opts,
      correct_index: q.correctIndex,
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

  const { data, error } = await supabase.rpc("grade_quiz", {
    p_quiz_id: quizId,
    p_answers: answers,
  });
  if (error) return { error: "تعذّر التصحيح." };
  const result = data as GradeResult;
  if (result?.error) return { error: "لا توجد أسئلة في هذا الاختبار." };
  return { result };
}
