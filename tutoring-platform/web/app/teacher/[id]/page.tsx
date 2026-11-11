import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import ShareProfile from "@/components/teacher/ShareProfile";
import ReportButton from "@/components/reports/ReportButton";
import RecordProfileView from "@/components/teacher/RecordProfileView";
import { safeYouTubeUrl } from "@/lib/safe-url";
import { isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

type Profile = {
  user_id: string;
  full_name: string;
  photo_url: string | null;
  school: string | null;
  institute: string | null;
  bio: string | null;
  years_experience: number | null;
  gender: "male" | "female" | null;
  answered_count: number;
  avg_rating: number;
  rating_count: number;
  featured: boolean;
  youtube_url: string | null;
  governorate_name: string;
  subjects: string[];
  stages: string[];
};

type Review = {
  rating: number;
  comment: string | null;
  created_at: string;
};

// cache(): يمنع تكرار نفس الاستعلام داخل نفس الطلب — generateMetadata والصفحة
// يستدعيانه، فيُنفَّذ مرّة واحدة بدل مرّتين (توفير استعلام لكل فتحة).
const getProfile = cache(async (id: string): Promise<Profile | null> => {
  if (!isUuid(id)) return null; // معرّف غير صالح → 404 بلا استعلام
  const sb = createPublicClient();
  if (!sb) return null;
  // الدليل العام يستثني غير المقبول/المحظور/المعطّل — فلا تُعرض ملفات غير صالحة
  const { data } = await sb
    .from("teacher_directory")
    .select(
      "user_id, full_name, photo_url, school, institute, bio, years_experience, gender, answered_count, avg_rating, rating_count, featured, youtube_url, governorate_name, subjects, stages",
    )
    .eq("user_id", id)
    .maybeSingle();
  return (data as Profile) ?? null;
});

async function getReviews(id: string): Promise<Review[]> {
  const sb = createPublicClient();
  if (!sb) return [];
  const { data } = await sb
    .from("teacher_ratings")
    .select("rating, comment, created_at")
    .eq("teacher_id", id)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data as Review[]) ?? [];
}

function genderLabel(g: Profile["gender"]): string | null {
  return g === "male" ? "مدرّس" : g === "female" ? "مدرّسة" : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await getProfile(id);
  if (!p) return { title: "مدرّس غير موجود — دليلي" };
  const subj = p.subjects.join("، ");
  const title = `${p.full_name}${subj ? " — " + subj : ""} في ${p.governorate_name} | دليلي`;
  const description =
    p.bio?.trim() ||
    `${genderLabel(p.gender) ?? "مدرّس"} ${subj ? "لمواد " + subj + " " : ""}في ${p.governorate_name}. تواصل عبر منصّة دليلي.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: p.photo_url ? [{ url: p.photo_url }] : undefined,
    },
  };
}

function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span dir="ltr" className="inline-flex" aria-label={`${value} من 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= full ? "text-amber" : "text-border"}>
          ★
        </span>
      ))}
    </span>
  );
}

export default async function TeacherProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await getProfile(id);
  if (!p) notFound();

  const reviews = (await getReviews(id)).filter((r) => r.comment?.trim());
  // الرابط يُعقَّم عند العرض أيضاً (لا نثق بما في القاعدة): يوتيوب https فقط
  const youtubeUrl = safeYouTubeUrl(p.youtube_url);
  const gl = genderLabel(p.gender);
  const summary = `${gl ?? "مدرّس"} ${p.full_name}${
    p.subjects.length ? " — " + p.subjects.join("، ") : ""
  } في ${p.governorate_name}`;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6" dir="rtl">
      <RecordProfileView teacherId={p.user_id} />
      <Link href="/" className="text-sm text-ink-soft hover:text-teal-dark">
        ← الرئيسية
      </Link>

      {/* البطاقة الرئيسية */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-4">
          {p.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.photo_url}
              alt={p.full_name}
              className="h-20 w-20 shrink-0 rounded-full border border-border object-cover"
            />
          ) : (
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-teal text-2xl font-bold text-white">
              {p.full_name?.trim().charAt(0) || "؟"}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold text-ink">
              {p.full_name}
              {p.featured && (
                <span className="rounded-full bg-amber-light px-2 py-0.5 text-xs font-bold text-amber">
                  👑 مميّز
                </span>
              )}
            </h1>
            <p className="mt-0.5 text-sm text-ink-soft">
              {p.subjects.join("، ") || "—"} · {p.governorate_name}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              {gl && (
                <span className="rounded-full bg-teal-light px-2 py-0.5 text-teal-dark">
                  {gl}
                </span>
              )}
              {p.years_experience != null && (
                <span className="rounded-full bg-surface px-2 py-0.5 text-ink-soft">
                  خبرة {p.years_experience} سنة
                </span>
              )}
              {p.rating_count > 0 && (
                <span className="flex items-center gap-1">
                  <Stars value={p.avg_rating} />
                  <span className="text-ink-soft">
                    {p.avg_rating} ({p.rating_count})
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {p.bio && (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {p.bio}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
          {p.school && <span>المدرسة: {p.school}</span>}
          {p.institute && <span>المعهد: {p.institute}</span>}
          {p.stages.length > 0 && <span>المراحل: {p.stages.join("، ")}</span>}
        </div>

        <p className="mt-3 flex items-center gap-1 text-sm text-teal-dark">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          أجاب على {p.answered_count} طالب
        </p>

        {youtubeUrl && (
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            قناة اليوتيوب
          </a>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <Link
            href="/ask"
            className="rounded-xl bg-teal px-5 py-2 text-sm font-bold text-white hover:bg-teal-dark"
          >
            اسأل عبر دليلي
          </Link>
          <ReportButton reportedId={p.user_id} reportedName={p.full_name} variant="text" />
        </div>

        <div className="mt-4">
          <ShareProfile name={p.full_name} summary={summary} />
        </div>
      </section>

      {/* المراجعات */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-ink">
          آراء الطلاب{" "}
          <span className="font-normal text-ink-soft">({reviews.length})</span>
        </h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-ink-soft">لا توجد مراجعات مكتوبة بعد.</p>
        ) : (
          <ul className="space-y-3">
            {reviews.map((r, i) => (
              <li key={i} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <Stars value={r.rating} />
                  <span className="text-[11px] text-ink-soft">
                    {new Date(r.created_at).toLocaleDateString("ar")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink">{r.comment}</p>
                <p className="mt-1 text-[11px] text-ink-soft">— طالب</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
