import Link from "next/link";
import HomeView from "@/components/HomeView";
import AuthNav from "@/components/AuthNav";
import Logo from "@/components/Logo";
import NewsFab from "@/components/content/NewsFab";
import AdsCarousel, { type PublicAd } from "@/components/content/AdsCarousel";
import NewsSection, { type PublicNews } from "@/components/content/NewsSection";
import InstallSection from "@/components/content/InstallSection";
import InstallBanner from "@/components/content/InstallBanner";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { MapTeacher, Subject } from "@/lib/supabase/types";

// الصفحة ديناميكية دائماً حتى تبقى حالة الجلسة (AuthNav) صحيحة لكل مستخدم.
// أما البيانات العامة فمخزّنة مؤقتاً عبر unstable_cache (مستقلّ عن ديناميكية
// الصفحة) — فتُقرأ من الكاش لا من القاعدة.
export const dynamic = "force-dynamic";

// البيانات العامة (خريطة/مواد/إعلانات/أخبار) مخزّنة مؤقتاً ٣٠ ثانية ومشتركة
// بين كل الزوّار — تسريع الزيارات المتكررة.
const getHomeData = unstable_cache(
  async () => {
    const sb = createPublicClient();
    if (!sb) return { subjects: [], teachers: [], ads: [], news: [] };

    const [subjectsRes, teachersRes, adsRes, newsRes] = await Promise.all([
      sb.from("subjects").select("id, name").eq("active", true).order("name"),
      sb.rpc("map_teachers", {}),
      sb
        .from("ads")
        .select("id, image_url, caption, contact_info")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      sb
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
    };
  },
  ["home-public-data"],
  { revalidate: 30, tags: ["home-data"] },
);

async function getData(): Promise<{
  subjects: Subject[];
  teachers: MapTeacher[];
  ads: PublicAd[];
  news: PublicNews[];
  connected: boolean;
}> {
  const connected = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  if (!connected) {
    return { subjects: [], teachers: [], ads: [], news: [], connected: false };
  }
  const data = await getHomeData();
  return { ...data, connected: true };
}

export default async function HomePage() {
  const { subjects, teachers, ads, news, connected } = await getData();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <div className="space-y-1.5">
          <Logo />
          <p className="text-sm text-ink-soft">
            ابحث عن مدرّس موثّق قريب منك حسب المادة والمحافظة
          </p>
        </div>
        <AuthNav />
      </header>

      <InstallBanner />

      {!connected && (
        <div className="rounded-xl border border-amber bg-amber-light px-4 py-3 text-sm text-ink">
          لم يُضبط اتصال Supabase بعد. انسخ <code>.env.local.example</code> إلى{" "}
          <code>.env.local</code> واملأ القيم لعرض البيانات الحيّة.
        </div>
      )}

      <AdsCarousel ads={ads} />

      <HomeView subjects={subjects} teachers={teachers} />

      <NewsSection news={news} />

      {news.length > 0 && <NewsFab />}

      <InstallSection />

      <footer className="mt-4 border-t border-border pt-4 text-center text-xs text-ink-soft">
        <Link href="/privacy" className="hover:text-teal-dark">
          سياسة الخصوصية
        </Link>
        {" · "}
        <Link href="/terms" className="hover:text-teal-dark">
          شروط الاستخدام
        </Link>
      </footer>
    </main>
  );
}
