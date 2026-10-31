"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { MapTeacher, Subject } from "@/lib/supabase/types";

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

export default function HomeView({
  subjects,
  teachers,
}: {
  subjects: Subject[];
  teachers: MapTeacher[];
}) {
  const [activeSubject, setActiveSubject] = useState<string>(ALL);
  const [activeGender, setActiveGender] = useState<"all" | "male" | "female">(
    "all",
  );

  // الفلترة (مادة + جنس) تتم في المتصفح على بيانات الخريطة المُحمّلة
  const visibleTeachers = useMemo(() => {
    return teachers.filter(
      (t) =>
        (activeSubject === ALL || t.subjects.includes(activeSubject)) &&
        (activeGender === "all" || t.gender === activeGender),
    );
  }, [teachers, activeSubject, activeGender]);

  const chips = [ALL, ...subjects.map((s) => s.name)];
  const genderChips: { key: "all" | "male" | "female"; label: string }[] = [
    { key: "all", label: "الكل" },
    { key: "male", label: "مدرّس" },
    { key: "female", label: "مدرّسة" },
  ];

  return (
    <div className="flex flex-col gap-3">
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
                  : "border-border bg-white text-ink-soft hover:border-teal")
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
                  : "border-border bg-white text-ink-soft hover:border-teal")
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* الخريطة */}
      <div className="h-[60vh] overflow-hidden rounded-2xl border border-border shadow-sm">
        <TeacherMap teachers={visibleTeachers} />
      </div>

      <p className="text-center text-xs text-ink-soft">
        {visibleTeachers.length > 0
          ? `${visibleTeachers.length} مدرّس ظاهر على الخريطة`
          : "لا يوجد مدرّسون ظاهرون بعد لهذا الاختيار"}
      </p>
    </div>
  );
}
