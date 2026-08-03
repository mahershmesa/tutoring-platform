import HomeView from "@/components/HomeView";
import AuthNav from "@/components/AuthNav";
import AdsCarousel, { type PublicAd } from "@/components/content/AdsCarousel";
import NewsSection, { type PublicNews } from "@/components/content/NewsSection";
import { createClient } from "@/lib/supabase/server";
import type { MapTeacher, Subject } from "@/lib/supabase/types";

// الصفحة ديناميكية: تقرأ من القاعدة عند كل طلب (بيانات حيّة)
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getData(): Promise<{
  subjects: Subject[];
  teachers: MapTeacher[];
  ads: PublicAd[];
  news: PublicNews[];
  connected: boolean;
}> {
  const supabase = createClient();
  if (!supabase) {
    return { subjects: [], teachers: [], ads: [], news: [], connected: false };
  }

  const [subjectsRes, teachersRes, adsRes, newsRes] = await Promise.all([
    supabase.from("subjects").select("id, name").eq("active", true).order("name"),
    supabase.rpc("map_teachers", {}),
    supabase
      .from("ads")
      .select("id, image_url, caption")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("news")
      .select("id, image_url, caption, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  return {
    subjects: (subjectsRes.data as Subject[]) ?? [],
    teachers: (teachersRes.data as MapTeacher[]) ?? [],
    ads: (adsRes.data as PublicAd[]) ?? [],
    news: (newsRes.data as PublicNews[]) ?? [],
    connected: true,
  };
}

export default async function HomePage() {
  const { subjects, teachers, ads, news, connected } = await getData();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-teal-dark">دليلي</h1>
          <p className="text-sm text-ink-soft">
            ابحث عن مدرّس موثّق قريب منك حسب المادة والمحافظة
          </p>
        </div>
        <AuthNav />
      </header>

      {!connected && (
        <div className="rounded-xl border border-amber bg-amber-light px-4 py-3 text-sm text-ink">
          لم يُضبط اتصال Supabase بعد. انسخ <code>.env.local.example</code> إلى{" "}
          <code>.env.local</code> واملأ القيم لعرض البيانات الحيّة.
        </div>
      )}

      <AdsCarousel ads={ads} />

      <HomeView subjects={subjects} teachers={teachers} />

      <NewsSection news={news} />
    </main>
  );
}
