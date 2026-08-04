import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Governorate, Stage, Subject } from "@/lib/supabase/types";
import StudentProfileForm from "@/components/profile/StudentProfileForm";
import TeacherProfileForm from "@/components/profile/TeacherProfileForm";
import SecurityQuestionCard from "@/components/account/SecurityQuestionCard";
import DeactivateCard from "@/components/account/DeactivateCard";

export const metadata: Metadata = { title: "بروفايلي — دليلي" };
export const dynamic = "force-dynamic";

async function signedIdDocUrl(
  supabase: NonNullable<ReturnType<typeof createClient>>,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage
    .from("id-documents")
    .createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export default async function ProfilePage() {
  const supabase = createClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: roleRows }, { data: govs }, { data: stages }, { data: subjects }] =
    await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("governorates").select("id, name").order("id"),
      supabase.from("stages").select("id, name").order("sort_order"),
      supabase.from("subjects").select("id, name").eq("active", true).order("name"),
    ]);

  const isTeacher = (roleRows ?? []).some((r) => r.role === "teacher");
  const governorates = (govs as Governorate[]) ?? [];
  const stageList = (stages as Stage[]) ?? [];
  const subjectList = (subjects as Subject[]) ?? [];

  // حالة الحساب: سؤال الأمان + التعطيل
  const [{ data: hasCred }, { data: statusRow }] = await Promise.all([
    supabase.rpc("has_security_credential"),
    supabase
      .from("account_status")
      .select("deactivated")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  const deactivated = Boolean(statusRow?.deactivated);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-teal-dark">بروفايلي</h1>
        <Link href="/" className="text-sm text-ink-soft hover:text-teal-dark">
          ← الرئيسية
        </Link>
      </header>

      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        {isTeacher ? (
          <TeacherProfilePanel
            supabase={supabase}
            userId={user.id}
            governorates={governorates}
            stages={stageList}
            subjects={subjectList}
          />
        ) : (
          <StudentProfilePanel
            supabase={supabase}
            userId={user.id}
            governorates={governorates}
            stages={stageList}
          />
        )}
      </div>

      <SecurityQuestionCard hasCredential={Boolean(hasCred)} />
      <DeactivateCard deactivated={deactivated} />
    </main>
  );
}

async function StudentProfilePanel({
  supabase,
  userId,
  governorates,
  stages,
}: {
  supabase: NonNullable<ReturnType<typeof createClient>>;
  userId: string;
  governorates: Governorate[];
  stages: Stage[];
}) {
  const { data: sp } = await supabase
    .from("student_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const idDocSignedUrl = await signedIdDocUrl(supabase, sp?.id_document_url ?? null);

  return (
    <>
      <p className="mb-4 text-sm text-ink-soft">
        أكمل بياناتك لتصلك إجابات المدرّسين المطابقين لمحافظتك ومرحلتك.
      </p>
      <StudentProfileForm
        userId={userId}
        governorates={governorates}
        stages={stages}
        initial={{
          full_name: sp?.full_name ?? "",
          phone: sp?.phone ?? "",
          governorate_id: sp?.governorate_id ?? null,
          stage_id: sp?.stage_id ?? null,
          id_document_url: sp?.id_document_url ?? null,
        }}
        idDocSignedUrl={idDocSignedUrl}
      />
    </>
  );
}

async function TeacherProfilePanel({
  supabase,
  userId,
  governorates,
  stages,
  subjects,
}: {
  supabase: NonNullable<ReturnType<typeof createClient>>;
  userId: string;
  governorates: Governorate[];
  stages: Stage[];
  subjects: Subject[];
}) {
  const [{ data: tp }, { data: ts }, { data: tg }] = await Promise.all([
    supabase.from("teacher_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("teacher_subjects").select("subject_id").eq("teacher_id", userId),
    supabase.from("teacher_stages").select("stage_id").eq("teacher_id", userId),
  ]);

  const idDocSignedUrl = await signedIdDocUrl(supabase, tp?.id_document_url ?? null);

  return (
    <>
      <p className="mb-4 text-sm text-ink-soft">
        أكمل بياناتك وارفع إثبات هويتك ليراجع فريق الإدارة طلب توثيقك.
      </p>
      <TeacherProfileForm
        userId={userId}
        governorates={governorates}
        stages={stages}
        subjects={subjects}
        initial={{
          full_name: tp?.full_name ?? "",
          phone: tp?.phone ?? "",
          school: tp?.school ?? "",
          institute: tp?.institute ?? "",
          contact_email: tp?.contact_email ?? "",
          telegram_url: tp?.telegram_url ?? "",
          instagram_url: tp?.instagram_url ?? "",
          governorate_id: tp?.governorate_id ?? null,
          location_visible: tp?.location_visible ?? false,
          photo_url: tp?.photo_url ?? null,
          id_document_url: tp?.id_document_url ?? null,
          verification_status: tp?.verification_status ?? "pending",
          subject_ids: (ts ?? []).map((r) => r.subject_id as string),
          stage_ids: (tg ?? []).map((r) => r.stage_id as number),
        }}
        idDocSignedUrl={idDocSignedUrl}
      />
    </>
  );
}
