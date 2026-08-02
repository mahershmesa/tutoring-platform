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

export default function TeacherMap({ teachers }: { teachers: MapTeacher[] }) {
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
      {teachers.map((t) => (
        <Marker
          key={t.user_id}
          position={[t.latitude, t.longitude]}
          icon={teacherIcon}
        >
          <Popup>
            <div className="space-y-1 text-right" dir="rtl">
              <p className="text-sm font-bold text-ink">{t.full_name}</p>
              <p className="text-xs text-ink-soft">
                {t.subjects.join("، ") || "—"} · {t.governorate_name}
              </p>
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
