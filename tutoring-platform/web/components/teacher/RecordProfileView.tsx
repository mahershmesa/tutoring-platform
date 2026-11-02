"use client";

import { useEffect, useRef } from "react";
import { recordProfileView } from "@/lib/stats/actions";

// يسجّل مشاهدة مرّة واحدة عند فتح الصفحة فعلياً في المتصفّح (لا يُحسب على
// زواحف البحث أو الـ prefetch لأنها لا تُشغّل كود العميل).
export default function RecordProfileView({ teacherId }: { teacherId: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void recordProfileView(teacherId);
  }, [teacherId]);
  return null;
}
