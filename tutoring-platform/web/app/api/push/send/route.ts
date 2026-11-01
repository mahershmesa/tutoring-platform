import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
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

// مقارنة ثابتة الزمن للسرّ (تمنع التسريب عبر توقيت المقارنة).
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// الجمهور المستهدَف: مستخدم واحد، أو فئة كاملة (تبليغ شامل).
type Audience = "students" | "teachers" | "all";
type Target = { userId?: string; audience?: Audience; msg: PushMessage };

// يبني (الجمهور المستهدَف + نص الإشعار). لا نثق بحمولة الـ webhook:
// نعيد جلب الصف من القاعدة بمعرّفه ونبني الإشعار من بيانات موثوقة فقط.
async function buildTarget(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  payload: WebhookPayload,
): Promise<Target | null> {
  const id = (payload.record ?? {}).id as string | undefined;
  if (!id) return null;

  if (payload.table === "announcements") {
    const { data: a } = await admin
      .from("announcements")
      .select("audience, target_user_id, title, body")
      .eq("id", id)
      .maybeSingle();
    if (!a) return null;
    const title = (a.title as string | null)?.trim() || "دليلي";
    const body = ((a.body as string | null) ?? "").trim();
    const msg: PushMessage = { title, body, url: "/" };
    const audience = a.audience as string;
    if (audience === "user") {
      const uid = a.target_user_id as string | undefined;
      if (!uid) return null;
      return { userId: uid, msg };
    }
    if (audience === "students" || audience === "teachers" || audience === "all") {
      return { audience, msg };
    }
    return null;
  }

  if (payload.table === "notifications") {
    const { data: n } = await admin
      .from("notifications")
      .select("teacher_id, question_id")
      .eq("id", id)
      .maybeSingle();
    const teacherId = n?.teacher_id as string | undefined;
    const questionId = n?.question_id as string | undefined;
    if (!teacherId) return null;

    // اسم المادة لإثراء النص (اختياري — نتحمّل فشله).
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
    const { data: m } = await admin
      .from("messages")
      .select("recipient_id, body, question_id")
      .eq("id", id)
      .maybeSingle();
    const recipientId = m?.recipient_id as string | undefined;
    if (!recipientId) return null;
    const body = ((m?.body as string | undefined) ?? "").trim();
    const snippet = body.length > 60 ? body.slice(0, 60) + "…" : body;
    const questionId = m?.question_id as string | undefined;
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
  // التحقّق من سرّ الـ webhook (مقارنة ثابتة الزمن) حتى لا يستدعي أحدٌ المسار.
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  const provided = req.headers.get("x-webhook-secret") ?? "";
  if (!secret || !safeEqual(provided, secret)) {
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

  // حلّ الاشتراكات حسب الجمهور: مستخدم واحد، فئة (طلاب/أساتذة)، أو الجميع.
  let subsQuery = admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");

  if (target.userId) {
    subsQuery = subsQuery.eq("user_id", target.userId);
  } else if (target.audience === "students" || target.audience === "teachers") {
    const table =
      target.audience === "students" ? "student_profiles" : "teacher_profiles";
    const { data: rows } = await admin.from(table).select("user_id");
    const ids = (rows ?? []).map((r) => r.user_id as string);
    if (ids.length === 0) return NextResponse.json({ ok: true, sent: 0 });
    subsQuery = subsQuery.in("user_id", ids);
  }
  // audience === "all": بلا فلتر → كل الاشتراكات.

  const { data: subs } = await subsQuery;

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
