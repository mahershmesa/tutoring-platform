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

  // الفلترة حسب المادة تتم في المتصفح على بيانات الخريطة المُحمّلة
  const visibleTeachers = useMemo(() => {
    if (activeSubject === ALL) return teachers;
    return teachers.filter((t) => t.subjects.includes(activeSubject));
  }, [teachers, activeSubject]);

  const chips = [ALL, ...subjects.map((s) => s.name)];

  return (
    <div className="flex flex-col gap-3">
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
