"use server";

import { createClient } from "@/lib/supabase/server";

export type PushState = { error?: string; ok?: boolean };

// شكل الاشتراك القادم من المتصفح (PushSubscription.toJSON()).
export type PushSubJSON = {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
};

// يحفظ اشتراك المتصفح الحالي للمستخدم المسجَّل (upsert على endpoint).
export async function savePushSubscription(
  sub: PushSubJSON,
): Promise<PushState> {
  const supabase = createClient();
  if (!supabase) return { error: "اتصال Supabase غير مضبوط." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجيل الدخول." };

  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!endpoint || !p256dh || !auth)
    return { error: "بيانات الاشتراك ناقصة." };

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { endpoint, user_id: user.id, p256dh, auth },
      { onConflict: "endpoint" },
    );
  if (error) return { error: error.message };
  return { ok: true };
}

// يحذف اشتراك هذا المتصفح (عند إيقاف الإشعارات).
export async function removePushSubscription(
  endpoint: string,
): Promise<PushState> {
  const supabase = createClient();
  if (!supabase) return { error: "اتصال Supabase غير مضبوط." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "لازم تسجيل الدخول." };
  if (!endpoint) return { error: "لا يوجد اشتراك." };

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  return { ok: true };
}
