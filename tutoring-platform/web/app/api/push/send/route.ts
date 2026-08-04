import { NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

// web-push يعتمد على Node crypto — لا يعمل على Edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// حمولة Database Webhook القادمة من Supabase عند INSERT.
type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Record<string, unknown> | null;
};

type PushMessage = { title: string; body: string; url: string; tag?: string };

// يبني (المستخدم المستهدَف + نص الإشعار) حسب الجدول الذي أطلق الـ webhook.
async function buildTarget(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  payload: WebhookPayload,
): Promise<{ userId: string; msg: PushMessage } | null> {
  const rec = payload.record ?? {};

  if (payload.table === "notifications") {
    const teacherId = rec.teacher_id as string | undefined;
    const questionId = rec.question_id as string | undefined;
    if (!teacherId) return null;

    // نجيب اسم المادة لإثراء نص الإشعار (اختياري — نتحمّل فشله).
    let subject = "";
    if (questionId) {
      const { data: q } = await admin
        .from("questions")
        .select("subjects(name)")
        .eq("id", questionId)
        .maybeSingle();
      const s = (q as { subjects?: { name?: string } | null } | null)?.subjects;
      subject = s?.name ?? "";
    }
    return {
      userId: teacherId,
      msg: {
        title: "سؤال جديد",
        body: subject
          ? `وصلك سؤال جديد بمادة ${subject}`
          : "وصلك سؤال جديد مطابق لتخصصك",
        url: "/inbox",
        tag: questionId ? `q-${questionId}` : undefined,
      },
    };
  }

  if (payload.table === "messages") {
    const recipientId = rec.recipient_id as string | undefined;
    if (!recipientId) return null;
    const body = (rec.body as string | undefined)?.trim() ?? "";
    const snippet = body.length > 60 ? body.slice(0, 60) + "…" : body;
    const questionId = rec.question_id as string | undefined;
    return {
      userId: recipientId,
      msg: {
        title: "رسالة جديدة",
        body: snippet || "وصلتك رسالة جديدة",
        url: "/inbox",
        tag: questionId ? `m-${questionId}` : undefined,
      },
    };
  }

  return null;
}

export async function POST(req: Request) {
  // التحقّق من سرّ الـ webhook حتى لا يستدعي أحدٌ هذا المسار.
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const priv = process.env.VAPID_PRIVATE_KEY;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!priv || !pub || !subject) {
    return NextResponse.json({ error: "vapid not configured" }, { status: 500 });
  }
  webpush.setVapidDetails(subject, pub, priv);

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "admin not configured" }, { status: 500 });
  }

  let payload: WebhookPayload;
  try {
    payload = (await req.json()) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (payload.type !== "INSERT") {
    return NextResponse.json({ ok: true, skipped: "not-insert" });
  }

  const target = await buildTarget(admin, payload);
  if (!target) return NextResponse.json({ ok: true, skipped: "no-target" });

  // اشتراكات المستخدم المستهدَف (قد تكون عدّة أجهزة).
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", target.userId);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const notif = JSON.stringify(target.msg);
  let sent = 0;
  const dead: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          notif,
        );
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        // اشتراك ميت (ألغاه المتصفح): نحذفه حتى لا نعيد المحاولة عليه.
        if (code === 404 || code === 410) dead.push(s.endpoint);
      }
    }),
  );

  if (dead.length > 0) {
    await admin.from("push_subscriptions").delete().in("endpoint", dead);
  }

  return NextResponse.json({ ok: true, sent, pruned: dead.length });
}
