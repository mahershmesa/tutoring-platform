// أنواع مشتركة لمحتوى المدرّس (الوزاريات + اختبر نفسك).
// وحدة عادية (ليست "use server") — يجوز أن تصدّر أنواعاً وثوابت.

export type ExamPaperInput = {
  subjectId: string;
  stageId: number | null;
  year: number | null;
  title: string;
  filePath: string;
  fileMime: string | null;
  fileName: string | null;
};

export type QuizQuestionInput = {
  prompt: string;
  options: string[];
  correctIndex: number;
};

export type QuizInput = {
  subjectId: string;
  stageId: number | null;
  chapter: string;
  title: string;
  questions: QuizQuestionInput[];
};

// نتيجة التصحيح القادمة من grade_quiz
export type GradeResult = {
  score: number;
  total: number;
  results: { question_id: string; correct_index: number; chosen: number | null }[];
  error?: string;
};

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;
export const MAX_QUESTIONS = 30;
