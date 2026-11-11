"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  LIMITS,
  asText,
  asOptionalText,
  isUuid,
  dbErrorMessage,
} from "@/lib/validate";

export type QAState = {
  error?: string;
  ok?: boolean;
  matched?: number;
  questionId?: string;
};

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

  if (!isUuid(subjectId)) return { error: "اختر المادة." };
  const clean = asText(text, LIMITS.text);
  if (clean === null)
    return { error: `السؤال أطول من الحدّ المسموح (${LIMITS.text} حرف).` };
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
  if (error) return { error: dbErrorMessage(error, "تعذّر إرسال السؤال. حاول لاحقاً.") };

  // كم مدرّس تطابق (تريغر التوزيع أنشأ إشعاراتهم)
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("question_id", q.id);

  revalidatePath("/ask");
  return { ok: true, matched: count ?? 0, questionId: q.id };
}

// يربط مرفقاً بسؤال أُنشئ للتو (المرفق رُفع بعد إنشاء السؤال).
export async function setQuestionAttachment(
  questionId: string,
  attachment: Attachment,
): Promise<QAState> {
  const supabase = createClient();
  if (!supabase) return { error: "اتصال Supabase غير مضبوط." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجيل الدخول." };

  const att = cleanAttachment(attachment);
  // مرفق السؤال يجب أن يكون داخل مجلد السؤال نفسه
  if (!isUuid(questionId) || !att || !att.path.startsWith(questionId + "/"))
    return { error: "مرفق غير صالح." };

  const { error } = await supabase
    .from("questions")
    .update({
      attachment_path: att.path,
      attachment_mime: att.mime,
      attachment_name: att.name,
    })
    .eq("id", questionId)
    .eq("student_id", user.id);
  if (error) return { error: dbErrorMessage(error, "تعذّر حفظ المرفق.") };

  revalidatePath("/ask");
  revalidatePath("/inbox");
  return { ok: true };
}

export type Attachment = { path: string; mime: string; name: string };

// يتحقق من شكل المرفق القادم من العميل (نصوص ضمن الحدود، بلا تسلّق مسارات).
function cleanAttachment(a: unknown): Attachment | null {
  if (!a || typeof a !== "object") return null;
  const o = a as Record<string, unknown>;
  const path = asText(o.path, LIMITS.url);
  const mime = asText(o.mime, LIMITS.mime);
  const name = asText(o.name, LIMITS.fileName);
  if (!path || mime === null || name === null) return null;
  if (path.includes("..") || path.startsWith("/")) return null;
  return { path, mime, name };
}

export async function sendMessage(
  questionId: string,
  recipientId: string,
  body: string,
  attachment?: Attachment | null,
): Promise<QAState> {
  const supabase = createClient();
  if (!supabase) return { error: "اتصال Supabase غير مضبوط." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجيل الدخول." };

  if (!isUuid(questionId) || !isUuid(recipientId))
    return { error: "محادثة غير صالحة." };
  const clean = asText(body, LIMITS.text);
  if (clean === null)
    return { error: `الرسالة أطول من الحدّ المسموح (${LIMITS.text} حرف).` };
  let att: Attachment | null = null;
  if (attachment) {
    att = cleanAttachment(attachment);
    // مرفق الرسالة يجب أن يكون داخل مجلد هذا السؤال
    if (!att || !att.path.startsWith(questionId + "/"))
      return { error: "مرفق غير صالح." };
  }
  if (!clean && !att) return { error: "اكتب رسالة أو أرفق ملفاً." };

  const { error } = await supabase.from("messages").insert({
    question_id: questionId,
    sender_id: user.id,
    recipient_id: recipientId,
    body: clean,
    attachment_path: att?.path ?? null,
    attachment_mime: att?.mime ?? null,
    attachment_name: att?.name ?? null,
  });
  if (error) return { error: dbErrorMessage(error, "تعذّر إرسال الرسالة. حاول لاحقاً.") };

  revalidatePath("/ask");
  revalidatePath("/inbox");
  return { ok: true };
}

export async function markNotificationRead(
  notificationId: string,
): Promise<QAState> {
  const supabase = createClient();
  if (!supabase) return { error: "اتصال Supabase غير مضبوط." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجيل الدخول." };
  if (!isUuid(notificationId)) return { error: "إشعار غير صالح." };

  const { error } = await supabase
    .from("notifications")
    .update({ status: "read" })
    .eq("id", notificationId)
    .eq("teacher_id", user.id) // فقط المدرّس المستهدَف (دفاع بالعمق فوق RLS)
    .eq("status", "sent"); // لا نتراجع عن answered
  if (error) return { error: dbErrorMessage(error, "تعذّر التحديث.") };

  revalidatePath("/inbox");
  return { ok: true };
}

// الطالب يقيّم مدرّساً تفاعل معه (القاعدة تفرض وجود ردّ فعلي من المدرّس).
export async function rateTeacher(
  teacherId: string,
  rating: number,
  comment: string,
): Promise<QAState> {
  const supabase = createClient();
  if (!supabase) return { error: "اتصال Supabase غير مضبوط." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجيل الدخول." };
  if (!isUuid(teacherId)) return { error: "مدرّس غير صالح." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return { error: "اختر تقييماً من ١ إلى ٥." };
  const cleanComment = asOptionalText(comment, LIMITS.comment);
  if (cleanComment === false)
    return { error: `التعليق أطول من الحدّ المسموح (${LIMITS.comment} حرف).` };

  const { error } = await supabase.from("teacher_ratings").upsert(
    {
      student_id: user.id,
      teacher_id: teacherId,
      rating,
      comment: cleanComment,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,teacher_id" },
  );
  if (error)
    return {
      error: dbErrorMessage(
        error,
        "تعذّر حفظ التقييم — التقييم متاح بعد أن يردّ عليك المدرّس.",
      ),
    };

  revalidatePath("/ask");
  revalidatePath("/");
  return { ok: true };
}

export async function confirmAnswer(
  questionId: string,
  teacherId: string,
): Promise<QAState> {
  const supabase = createClient();
  if (!supabase) return { error: "اتصال Supabase غير مضبوط." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجيل الدخول." };
  if (!isUuid(questionId) || !isUuid(teacherId))
    return { error: "طلب غير صالح." };

  // دفاع بالعمق فوق RLS/الحارس: تأكّد أن المستخدم هو صاحب السؤال فعلاً.
  const { data: q } = await supabase
    .from("questions")
    .select("student_id")
    .eq("id", questionId)
    .maybeSingle();
  if (!q || q.student_id !== user.id) return { error: "غير مصرّح." };

  // الطالب صاحب السؤال يضبط الإشعار answered → تريغر يزيد عدّاد المدرّس مرّة.
  const { error } = await supabase
    .from("notifications")
    .update({ status: "answered" })
    .eq("question_id", questionId)
    .eq("teacher_id", teacherId);
  if (error) return { error: dbErrorMessage(error, "تعذّر تأكيد الرد.") };

  revalidatePath("/ask");
  revalidatePath("/"); // الخريطة تعرض العدّاد
  return { ok: true };
}
