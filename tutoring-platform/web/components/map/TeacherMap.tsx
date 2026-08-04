"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type { MapTeacher } from "@/lib/supabase/types";

// نقطة صفراء مخصّصة بدل أيقونة Leaflet الافتراضية (تتجنّب مشاكل مسارات الصور)
const teacherIcon = L.divIcon({
  className: "",
  html: '<div class="teacher-pin"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
});

// مركز العراق تقريباً
const IRAQ_CENTER: [number, number] = [33.2, 43.7];

// المدرّسون في نفس المحافظة يتشاركون نفس إحداثيات المركز بالضبط، فتتراكم
// نقاطهم فوق بعض. نوزّعهم في حلقة صغيرة (~10كم) حول المركز حتى تظهر كل نقطة.
// الترتيب ثابت (حسب ترتيب القاعدة) فلا "يقفز" الموضع بين التحميلات.
const SPREAD_DEG = 0.09;

function withDisplayPositions(
  teachers: MapTeacher[],
): { t: MapTeacher; pos: [number, number] }[] {
  const groups = new Map<number, MapTeacher[]>();
  for (const t of teachers) {
    const arr = groups.get(t.governorate_id) ?? [];
    arr.push(t);
    groups.set(t.governorate_id, arr);
  }

  const out: { t: MapTeacher; pos: [number, number] }[] = [];
  for (const group of Array.from(groups.values())) {
    group.forEach((t, i) => {
      if (group.length === 1) {
        out.push({ t, pos: [t.latitude, t.longitude] });
        return;
      }
      const angle = (2 * Math.PI * i) / group.length;
      out.push({
        t,
        pos: [
          t.latitude + SPREAD_DEG * Math.sin(angle),
          t.longitude + SPREAD_DEG * Math.cos(angle),
        ],
      });
    });
  }
  return out;
}

export default function TeacherMap({ teachers }: { teachers: MapTeacher[] }) {
  const items = withDisplayPositions(teachers);

  return (
    <MapContainer
      center={IRAQ_CENTER}
      zoom={6}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {items.map(({ t, pos }) => (
        <Marker key={t.user_id} position={pos} icon={teacherIcon}>
          <Popup>
            <div className="space-y-1 text-right" dir="rtl">
              <div className="flex items-center gap-2">
                {t.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.photo_url}
                    alt={t.full_name}
                    className="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal text-sm font-bold text-white">
                    {t.full_name?.trim().charAt(0) || "؟"}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink">{t.full_name}</p>
                  <p className="text-xs text-ink-soft">
                    {t.subjects.join("، ") || "—"} · {t.governorate_name}
                  </p>
                </div>
              </div>
              <p className="flex items-center gap-1 text-xs text-teal-dark">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                أجاب على {t.answered_count} طالب
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
