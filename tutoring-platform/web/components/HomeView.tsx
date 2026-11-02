"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { MapTeacher, Subject, UserGov } from "@/lib/supabase/types";

// الخريطة تُحمّل في المتصفح فقط (Leaflet يعتمد على window)
const TeacherMap = dynamic(() => import("@/components/map/TeacherMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-ink-soft">
      …جارٍ تحميل الخريطة
    </div>
  ),
});

const ALL = "الكل";

type SortKey = "rating" | "active" | "near";

// مسافة هافرسين (كم) بين إحداثيين
function km(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function genderLabel(g: MapTeacher["gender"]): string | null {
  return g === "male" ? "مدرّس" : g === "female" ? "مدرّسة" : null;
}

export default function HomeView({
  subjects,
  teachers,
  userGov,
}: {
  subjects: Subject[];
  teachers: MapTeacher[];
  userGov: UserGov;
}) {
  const [activeSubject, setActiveSubject] = useState<string>(ALL);
  const [activeGender, setActiveGender] = useState<"all" | "male" | "female">(
    "all",
  );
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>(userGov ? "near" : "rating");
  const [sortOpen, setSortOpen] = useState(false);

  // الفلترة (مادة + جنس + اسم) على بيانات الخريطة المُحمّلة
  const filtered = useMemo(() => {
    const q = query.trim();
    return teachers.filter(
      (t) =>
        (activeSubject === ALL || t.subjects.includes(activeSubject)) &&
        (activeGender === "all" || t.gender === activeGender) &&
        (q === "" || t.full_name?.includes(q)),
    );
  }, [teachers, activeSubject, activeGender, query]);

  // القائمة المرتّبة: المدرّس المميّز أولاً دائماً، ثم حسب الفرز المختار.
  const ranked = useMemo(() => {
    const byChoice = (a: MapTeacher, b: MapTeacher): number => {
      if (sortBy === "near" && userGov) {
        return (
          km(userGov.lat, userGov.lng, a.latitude, a.longitude) -
          km(userGov.lat, userGov.lng, b.latitude, b.longitude)
        );
      }
      if (sortBy === "active") return b.answered_count - a.answered_count;
      return b.avg_rating - a.avg_rating || b.rating_count - a.rating_count;
    };
    return [...filtered].sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1; // المميّز أولاً
      return byChoice(a, b);
    });
  }, [filtered, sortBy, userGov]);

  const chips = [ALL, ...subjects.map((s) => s.name)];
  const genderChips: { key: "all" | "male" | "female"; label: string }[] = [
    { key: "all", label: "الكل" },
    { key: "male", label: "مدرّس" },
    { key: "female", label: "مدرّسة" },
  ];
  const sortChips: { key: SortKey; label: string; show: boolean }[] = [
    { key: "near", label: "الأقرب", show: Boolean(userGov) },
    { key: "rating", label: "الأعلى تقييماً", show: true },
    { key: "active", label: "الأنشط", show: true },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* البحث بالاسم */}
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث باسم المدرّس…"
          className="w-full rounded-xl border border-border bg-card px-4 py-2.5 pr-10 text-sm outline-none focus:border-teal"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft">
          🔎
        </span>
      </div>

      {/* فلتر الجنس */}
      <div className="flex gap-2">
        {genderChips.map((g) => {
          const active = g.key === activeGender;
          return (
            <button
              key={g.key}
              onClick={() => setActiveGender(g.key)}
              className={
                "rounded-full border px-4 py-1.5 text-sm transition " +
                (active
                  ? "border-teal bg-teal-light font-medium text-teal-dark"
                  : "border-border bg-card text-ink-soft hover:border-teal")
              }
            >
              {g.label}
            </button>
          );
        })}
      </div>

      {/* شرائح فلاتر المواد */}
      <div className="flex flex-wrap gap-2">
        {chips.map((label) => {
          const active = label === activeSubject;
          return (
            <button
              key={label}
              onClick={() => setActiveSubject(label)}
              className={
                "rounded-full border px-4 py-1.5 text-sm transition " +
                (active
                  ? "border-teal bg-teal-light font-medium text-teal-dark"
                  : "border-border bg-card text-ink-soft hover:border-teal")
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* الخريطة */}
      <div className="h-[55vh] overflow-hidden rounded-2xl border border-border shadow-sm">
        <TeacherMap teachers={filtered} />
      </div>

      {/* الترتيب (قائمة منسدلة) + القائمة */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <h2 className="text-sm font-bold text-ink">
          النتائج{" "}
          <span className="font-normal text-ink-soft">({ranked.length})</span>
        </h2>
        <button
          type="button"
          onClick={() => setSortOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={sortOpen}
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-teal"
        >
          <span className="text-ink-soft">ترتيب:</span>
          <span className="text-teal-dark">
            {sortChips.find((s) => s.key === sortBy)?.label}
          </span>
          <span>▾</span>
        </button>
      </div>

      {/* شاشة الفرز المنزلقة (bottom sheet) — تُطبَّق فقط عند الاختيار */}
      {sortOpen && (
        <div
          className="fixed inset-0 z-[1100] bg-black/40"
          onClick={() => setSortOpen(false)}
        >
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-card p-4 shadow-2xl"
            style={{ animation: "dalili-sheet-up 0.25s ease" }}
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <h3 className="mb-2 text-sm font-bold text-ink">ترتيب النتائج</h3>
            <ul className="flex flex-col gap-1">
              {sortChips
                .filter((s) => s.show)
                .map((s) => {
                  const active = s.key === sortBy;
                  return (
                    <li key={s.key}>
                      <button
                        type="button"
                        onClick={() => {
                          setSortBy(s.key);
                          setSortOpen(false);
                        }}
                        className={
                          "flex w-full items-center justify-between rounded-xl px-4 py-3 text-right text-sm transition " +
                          (active
                            ? "bg-teal-light font-bold text-teal-dark"
                            : "text-ink hover:bg-surface")
                        }
                      >
                        {s.label}
                        {active && <span className="text-teal">✓</span>}
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>
        </div>
      )}

      {ranked.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-5 text-center text-sm text-ink-soft">
          لا يوجد مدرّسون مطابقون لبحثك.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {ranked.map((t) => {
            const gl = genderLabel(t.gender);
            const dist =
              sortBy === "near" && userGov
                ? km(userGov.lat, userGov.lng, t.latitude, t.longitude)
                : null;
            return (
              <li key={t.user_id}>
                <Link
                  href={`/teacher/${t.user_id}`}
                  className={
                    "flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm transition hover:border-teal " +
                    (t.featured
                      ? "border-amber ring-1 ring-amber/40"
                      : "border-border")
                  }
                >
                  {t.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.photo_url}
                      alt={t.full_name}
                      className="h-12 w-12 shrink-0 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal text-lg font-bold text-white">
                      {t.full_name?.trim().charAt(0) || "؟"}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-bold text-ink">
                      {t.full_name}
                      {t.featured && (
                        <span className="shrink-0 rounded-full bg-amber-light px-1.5 py-0.5 text-[10px] font-bold text-amber">
                          👑 مميّز
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-ink-soft">
                      {t.subjects.join("، ") || "—"} · {t.governorate_name}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-soft">
                      {gl && <span className="text-teal-dark">{gl}</span>}
                      {t.rating_count > 0 && (
                        <span className="text-amber">
                          ★ {t.avg_rating}{" "}
                          <span className="text-ink-soft">
                            ({t.rating_count})
                          </span>
                        </span>
                      )}
                      <span>أجاب {t.answered_count}</span>
                      {dist != null && <span>· {Math.round(dist)} كم</span>}
                    </p>
                  </div>
                  <span className="shrink-0 text-ink-soft">←</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
