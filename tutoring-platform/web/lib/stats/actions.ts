"use server";

import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validate";

// يسجّل مشاهدة لملف مدرّس (القاعدة تستبعد مشاهدة المدرّس لنفسه وتُطبّق حدّ تكرار).
// أفضل-جهد: نتجاهل أي خطأ (الإحصاء لا يجب أن يعطّل عرض الصفحة).
export async function recordProfileView(teacherId: string): Promise<void> {
  if (!isUuid(teacherId)) return;
  try {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.rpc("record_teacher_view", { p_teacher: teacherId });
  } catch {
    /* تجاهل */
  }
}
