import HomeView from "@/components/HomeView";
import AuthNav from "@/components/AuthNav";
import { createClient } from "@/lib/supabase/server";
import type { MapTeacher, Subject } from "@/lib/supabase/types";

// الصفحة ديناميكية: تقرأ من القاعدة عند كل طلب (بيانات حيّة)
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getData(): Promise<{
  subjects: Subject[];
  teachers: MapTeacher[];
  connected: boolean;
}> {
  const supabase = createClient();
  if (!supabase) {
    return { subjects: [], teachers: [], connected: false };
  }

  const [subjectsRes, teachersRes] = await Promise.all([
    supabase.from("subjects").select("id, name").eq("active", true).order("name"),
    supabase.rpc("map_teachers", {}),
  ]);

  return {
    subjects: (subjectsRes.data as Subject[]) ?? [],
    teachers: (teachersRes.data as MapTeacher[]) ?? [],
    connected: true,
  };
}

export default async function HomePage() {
  const { subjects, teachers, connected } = await getData();

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

      <HomeView subjects={subjects} teachers={teachers} />
    </main>
  );
}
