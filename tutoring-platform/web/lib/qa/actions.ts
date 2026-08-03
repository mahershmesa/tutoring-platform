"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type QAState = { error?: string; ok?: boolean; matched?: number };

export async function sendQuestion(
  subjectId: string,
  text: string,
): Promise<QAState> {
  const supabase = createClient();
  if (!supabase) return { error: "اتصال Supabase غير مضبوط." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجيل الدخول." };

  const clean = text.trim();
  if (!clean) return { error: "اكتب سؤالك." };

  const { data: sp } = await supabase
    .from("student_profiles")
    .select("governorate_id, stage_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!sp?.governorate_id || !sp?.stage_id)
    return { error: "أكمل محافظتك ومرحلتك في البروفايل أولاً." };

  const { data: q, error } = await supabase
    .from("questions")
    .insert({
      student_id: user.id,
      subject_id: subjectId,
      stage_id: sp.stage_id,
      governorate_id: sp.governorate_id,
      question_text: clean,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  // كم مدرّس تطابق (تريغر التوزيع أنشأ إشعاراتهم)
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("question_id", q.id);

  revalidatePath("/ask");
  return { ok: true, matched: count ?? 0 };
}

export async function sendMessage(
  questionId: string,
  body: string,
): Promise<QAState> {
  const supabase = createClient();
  if (!supabase) return { error: "اتصال Supabase غير مضبوط." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجيل الدخول." };

  const clean = body.trim();
  if (!clean) return { error: "اكتب رسالة." };

  const { error } = await supabase
    .from("messages")
    .insert({ question_id: questionId, sender_id: user.id, body: clean });
  if (error) return { error: error.message };

  revalidatePath("/ask");
  revalidatePath("/inbox");
  return { ok: true };
}

export async function markNotificationRead(
  notificationId: string,
): Promise<QAState> {
  const supabase = createClient();
  if (!supabase) return { error: "اتصال Supabase غير مضبوط." };

  const { error } = await supabase
    .from("notifications")
    .update({ status: "read" })
    .eq("id", notificationId)
    .eq("status", "sent"); // لا نتراجع عن answered
  if (error) return { error: error.message };

  revalidatePath("/inbox");
  return { ok: true };
}

export async function confirmAnswer(
  questionId: string,
  teacherId: string,
): Promise<QAState> {
  const supabase = createClient();
  if (!supabase) return { error: "اتصال Supabase غير مضبوط." };

  // الطالب صاحب السؤال يضبط الإشعار answered → تريغر يزيد عدّاد المدرّس مرّة.
  const { error } = await supabase
    .from("notifications")
    .update({ status: "answered" })
    .eq("question_id", questionId)
    .eq("teacher_id", teacherId);
  if (error) return { error: error.message };

  revalidatePath("/ask");
  revalidatePath("/"); // الخريطة تعرض العدّاد
  return { ok: true };
}
